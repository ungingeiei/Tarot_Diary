/**
 * ---------------------------------------------------------------------
 * /api/admin/cards — admin card management  (list + create)
 * ---------------------------------------------------------------------
 * Admin only: 401 when signed out, 403 when the account's role in the
 * DATABASE is not "admin" (see lib/apiAuth.js — the token is not trusted).
 * Update and delete live in ./[id]/route.js.
 *
 * The table lists READINGS (rows of card_meanings joined to their card):
 * a card with a Love text and a Daily text shows up twice. `id` in every
 * row is the card_meanings id.
 *
 *   GET   ?kind=love        -> { success, cards: [...] }  (kind optional)
 *   POST  multipart/form-data
 *         name, category, prediction, advice, image (file)
 *                             -> 201 { success, card }
 *
 * POST finds the card by NAME. If it exists, the new reading is added to
 * it (the image is then optional; sending one replaces the card's image).
 * If it does not exist, the card is created and an image is REQUIRED.
 * A card may have only one reading per category -> 409 otherwise.
 *
 * `card` is { id, cardId, name, title, scope, kind, category, prediction,
 * advice, image }. `image` is a URL to use directly in <img src>.
 *
 * Image rules (lib/uploads.js): PNG / JPEG / GIF / WebP, max 3 MB, type
 * checked from the file's bytes.
 * ---------------------------------------------------------------------
 */

import db from "@/lib/db";
import { requireAdmin } from "@/lib/apiAuth";
import {
  ADMIN_SELECT,
  ALL_KINDS,
  parseCardFields,
  splitParagraphs,
  toAdminCard,
} from "@/lib/cardQueries";
import {
  MAX_IMAGE_BYTES,
  UploadError,
  deleteCardImage,
  isUploadedFile,
  saveCardImage,
} from "@/lib/uploads";

export async function GET(request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const kind = new URL(request.url).searchParams.get("kind");
    if (kind && !ALL_KINDS.includes(kind.toLowerCase())) {
      return Response.json(
        { success: false, message: `kind must be one of: ${ALL_KINDS.join(", ")}` },
        { status: 400 }
      );
    }

    const [rows] = kind
      ? await db.execute(`${ADMIN_SELECT} WHERE m.topic = ? ORDER BY c.name`, [kind.toLowerCase()])
      : await db.execute(`${ADMIN_SELECT} ORDER BY m.topic, c.name`);

    return Response.json({ success: true, cards: rows.map(toAdminCard) });
  } catch (error) {
    console.error("Admin cards GET error:", error);
    return Response.json({ success: false, message: "Could not load the cards" }, { status: 500 });
  }
}

export async function POST(request) {
  let newImageUrl = null;
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const declaredSize = Number(request.headers.get("content-length"));
    if (declaredSize > MAX_IMAGE_BYTES + 512 * 1024) {
      return Response.json(
        { success: false, message: "The upload is too large (images may be 3 MB at most)" },
        { status: 413 }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return Response.json(
        { success: false, message: "Send the card as multipart/form-data (it includes an image file)" },
        { status: 415 }
      );
    }

    const form = await request.formData();
    const data = Object.fromEntries(
      [...form.entries()].filter(([, value]) => typeof value === "string")
    );

    const { values, error } = parseCardFields(data);
    if (error) return Response.json({ success: false, message: error }, { status: 400 });

    const file = form.get("image");
    const hasFile = isUploadedFile(file);

    // Same name = same card: add a reading to it instead of creating a twin.
    const [found] = await db.execute("SELECT id, pict FROM cards WHERE name = ? LIMIT 1", [values.name]);
    const existingCard = found[0] || null;

    if (!existingCard && !hasFile) {
      return Response.json({ success: false, message: "A card image is required" }, { status: 400 });
    }

    if (hasFile) newImageUrl = await saveCardImage(file);

    const connection = await db.getConnection();
    let meaningId;
    try {
      await connection.beginTransaction();

      let cardId;
      if (existingCard) {
        cardId = existingCard.id;
        if (newImageUrl) await connection.execute("UPDATE cards SET pict = ? WHERE id = ?", [newImageUrl, cardId]);
      } else {
        // `pred` is the card's own short blurb (NOT NULL): the first paragraph of the reading.
        const blurb = (splitParagraphs(values.summary)[0] || values.summary).slice(0, 500);
        const [created] = await connection.execute(
          "INSERT INTO cards (pict, name, pred, adv, kind) VALUES (?, ?, ?, NULL, 'tarot')",
          [newImageUrl, values.name, blurb]
        );
        cardId = created.insertId;
      }

      const [meaning] = await connection.execute(
        "INSERT INTO card_meanings (card_id, scope, topic, summary, advice) VALUES (?, ?, ?, ?, ?)",
        [cardId, values.scope, values.topic, values.summary, values.advice]
      );
      meaningId = meaning.insertId;
      await connection.commit();
    } catch (dbError) {
      await connection.rollback().catch(() => {});
      if (newImageUrl) await deleteCardImage(newImageUrl); // do not leave an orphaned file behind
      newImageUrl = null;
      if (dbError?.code === "ER_DUP_ENTRY") {
        return Response.json(
          { success: false, message: `"${values.name}" already has a ${values.topic} reading` },
          { status: 409 }
        );
      }
      throw dbError;
    } finally {
      connection.release();
    }

    if (existingCard && hasFile) await deleteCardImage(existingCard.pict); // the replaced file

    const [rows] = await db.execute(`${ADMIN_SELECT} WHERE m.id = ?`, [meaningId]);
    return Response.json({ success: true, card: toAdminCard(rows[0]) }, { status: 201 });
  } catch (error) {
    if (error instanceof UploadError) return Response.json({ success: false, message: error.message }, { status: 400 });
    if (newImageUrl) await deleteCardImage(newImageUrl);
    console.error("Admin cards POST error:", error);
    return Response.json({ success: false, message: "Could not create the card" }, { status: 500 });
  }
}
