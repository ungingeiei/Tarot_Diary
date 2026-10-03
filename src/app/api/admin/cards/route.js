/**
 * ---------------------------------------------------------------------
 * /api/admin/cards — admin card management  (list + create)
 * ---------------------------------------------------------------------
 * Admin only: 401 when signed out, 403 when the account's role in the
 * DATABASE is not "admin" (see lib/apiAuth.js — the token is not trusted).
 * Update and delete live in ./[id]/route.js.
 *
 *   GET   ?kind=love        -> { success, cards: [...] }  (kind optional)
 *   POST  multipart/form-data
 *         name, category (or kind), prediction, advice, image (file)
 *                             -> 201 { success, card }
 *
 * `card` is { id, name, title, kind, category, prediction, advice, image },
 * which is what the card-management table already renders. `image` is a
 * URL to use directly in <img src>.
 *
 * Image rules (lib/uploads.js): PNG / JPEG / GIF / WebP, max 3 MB, type
 * checked from the file's bytes. An image is REQUIRED when creating a card.
 * ---------------------------------------------------------------------
 */

import db from "@/lib/db";
import { requireAdmin } from "@/lib/apiAuth";
import { ALL_KINDS, parseCardFields, toAdminCard } from "@/lib/cardQueries";
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
      ? await db.execute(
          "SELECT id, pict, name, pred, adv, kind FROM cards WHERE kind = ? ORDER BY name",
          [kind.toLowerCase()]
        )
      : await db.execute("SELECT id, pict, name, pred, adv, kind FROM cards ORDER BY kind, name");

    return Response.json({ success: true, cards: rows.map(toAdminCard) });
  } catch (error) {
    console.error("Admin cards GET error:", error);
    return Response.json({ success: false, message: "Could not load the cards" }, { status: 500 });
  }
}

export async function POST(request) {
  let imageUrl = null;
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
    if (!isUploadedFile(file)) return Response.json({ success: false, message: "A card image is required" }, { status: 400 });

    imageUrl = await saveCardImage(file);

    let insertId;
    try {
      const [result] = await db.execute(
        "INSERT INTO cards (pict, name, pred, adv, kind) VALUES (?, ?, ?, ?, ?)",
        [imageUrl, values.name, values.pred, values.adv, values.kind]
      );
      insertId = result.insertId;
    } catch (dbError) {
      await deleteCardImage(imageUrl); // do not leave an orphaned file behind
      if (dbError?.code === "ER_DUP_ENTRY") {
        return Response.json(
          { success: false, message: `There is already a "${values.name}" card in ${values.kind}` },
          { status: 409 }
        );
      }
      throw dbError;
    }

    const [rows] = await db.execute(
      "SELECT id, pict, name, pred, adv, kind FROM cards WHERE id = ?",
      [insertId]
    );
    return Response.json({ success: true, card: toAdminCard(rows[0]) }, { status: 201 });
  } catch (error) {
    if (error instanceof UploadError) return Response.json({ success: false, message: error.message }, { status: 400 });
    if (imageUrl) await deleteCardImage(imageUrl);
    console.error("Admin cards POST error:", error);
    return Response.json({ success: false, message: "Could not create the card" }, { status: 500 });
  }
}
