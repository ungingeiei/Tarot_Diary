/**
 * ---------------------------------------------------------------------
 * /api/admin/cards/:id — admin card management  (update + delete)
 * ---------------------------------------------------------------------
 * Admin only (401 / 403, see lib/apiAuth.js).
 * `:id` is the card_meanings id (the `id` the list returns): one reading.
 *
 *   PATCH (or PUT)  multipart/form-data OR JSON
 *        any of: name, category, prediction, advice, image (file)
 *        Only the fields sent are changed.
 *          name        renames the CARD (every reading of it shows the new name)
 *          image       replaces the CARD's image file
 *          category    moves this reading to another category; diary entries
 *                      saved from it move with it
 *          prediction / advice   this reading's text
 *        -> { success, card }
 *
 *   DELETE
 *        Deletes this reading and the diary entries saved from it. When it
 *        was the card's last reading, the card itself (and its image file)
 *        goes too. One transaction. -> { success, deletedDiaryEntries, cardDeleted }
 * ---------------------------------------------------------------------
 */

import db from "@/lib/db";
import { requireAdmin } from "@/lib/apiAuth";
import { ADMIN_SELECT, parseCardFields, toAdminCard } from "@/lib/cardQueries";
import {
  MAX_IMAGE_BYTES,
  UploadError,
  deleteCardImage,
  isUploadedFile,
  saveCardImage,
} from "@/lib/uploads";

function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function loadReading(executor, id) {
  const [rows] = await executor.execute(`${ADMIN_SELECT} WHERE m.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function updateReading(request, context) {
  let newImageUrl = null;
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const id = parseId((await context.params).id);
    if (!id) return Response.json({ success: false, message: "Invalid card id" }, { status: 400 });

    const existing = await loadReading(db, id);
    if (!existing) return Response.json({ success: false, message: "Card not found" }, { status: 404 });

    const contentType = request.headers.get("content-type") || "";
    let data;
    let file = null;
    if (contentType.includes("multipart/form-data")) {
      const declaredSize = Number(request.headers.get("content-length"));
      if (declaredSize > MAX_IMAGE_BYTES + 512 * 1024) {
        return Response.json(
          { success: false, message: "The upload is too large (images may be 3 MB at most)" },
          { status: 413 }
        );
      }
      const form = await request.formData();
      data = Object.fromEntries(
        [...form.entries()].filter(([, value]) => typeof value === "string")
      );
      file = form.get("image");
    } else {
      data = (await request.json().catch(() => null)) || {};
    }

    const { values, error } = parseCardFields(data, { partial: true });
    if (error) return Response.json({ success: false, message: error }, { status: 400 });

    const cardChanges = {};
    if (values.name !== undefined && values.name !== existing.name) cardChanges.name = values.name;
    if (isUploadedFile(file)) {
      newImageUrl = await saveCardImage(file);
      cardChanges.pict = newImageUrl;
    }

    const meaningChanges = {};
    for (const key of ["summary", "advice", "topic", "scope"]) {
      if (values[key] !== undefined && values[key] !== existing[key]) meaningChanges[key] = values[key];
    }

    if (Object.keys(cardChanges).length === 0 && Object.keys(meaningChanges).length === 0) {
      if (newImageUrl) await deleteCardImage(newImageUrl);
      const hasAnyField = Object.keys(values).length > 0;
      if (!hasAnyField) return Response.json({ success: false, message: "Nothing to update" }, { status: 400 });
      return Response.json({ success: true, card: toAdminCard(existing) }); // same values: nothing to do
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      if (cardChanges.name !== undefined) {
        const [clash] = await connection.execute(
          "SELECT id FROM cards WHERE name = ? AND id <> ? LIMIT 1",
          [cardChanges.name, existing.card_id]
        );
        if (clash.length > 0) {
          await connection.rollback();
          if (newImageUrl) await deleteCardImage(newImageUrl);
          newImageUrl = null;
          return Response.json({ success: false, message: "Another card already has that name" }, { status: 409 });
        }
      }

      const cardColumns = Object.keys(cardChanges);
      if (cardColumns.length > 0) {
        await connection.execute(
          `UPDATE cards SET ${cardColumns.map((column) => `${column} = ?`).join(", ")} WHERE id = ?`,
          [...cardColumns.map((column) => cardChanges[column]), existing.card_id]
        );
      }

      const meaningColumns = Object.keys(meaningChanges);
      if (meaningColumns.length > 0) {
        await connection.execute(
          `UPDATE card_meanings SET ${meaningColumns.map((column) => `${column} = ?`).join(", ")} WHERE id = ?`,
          [...meaningColumns.map((column) => meaningChanges[column]), id]
        );
        if (meaningChanges.topic !== undefined) {
          // Diary entries follow the reading to its new category.
          await connection.execute(
            "UPDATE saves SET scope = ?, topic = ? WHERE card_id = ? AND scope = ? AND topic = ?",
            [meaningChanges.scope ?? existing.scope, meaningChanges.topic, existing.card_id, existing.scope, existing.topic]
          );
        }
      }

      await connection.commit();
    } catch (dbError) {
      await connection.rollback().catch(() => {});
      if (newImageUrl) await deleteCardImage(newImageUrl);
      newImageUrl = null;
      if (dbError?.code === "ER_DUP_ENTRY") {
        return Response.json(
          { success: false, message: "This card already has a reading in that category" },
          { status: 409 }
        );
      }
      throw dbError;
    } finally {
      connection.release();
    }

    if (newImageUrl) await deleteCardImage(existing.pict); // the replaced file
    return Response.json({ success: true, card: toAdminCard(await loadReading(db, id)) });
  } catch (error) {
    if (error instanceof UploadError) return Response.json({ success: false, message: error.message }, { status: 400 });
    if (newImageUrl) await deleteCardImage(newImageUrl);
    console.error("Admin cards PATCH error:", error);
    return Response.json({ success: false, message: "Could not update the card" }, { status: 500 });
  }
}

export const PATCH = updateReading;
export const PUT = updateReading;

export async function DELETE(_request, context) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const id = parseId((await context.params).id);
    if (!id) return Response.json({ success: false, message: "Invalid card id" }, { status: 400 });

    const existing = await loadReading(db, id);
    if (!existing) return Response.json({ success: false, message: "Card not found" }, { status: 404 });

    const connection = await db.getConnection();
    let deletedDiaryEntries = 0;
    let cardDeleted = false;
    try {
      await connection.beginTransaction();

      // Diary entries saved from exactly this reading go with it.
      const [saves] = await connection.execute(
        "DELETE FROM saves WHERE card_id = ? AND scope = ? AND topic = ?",
        [existing.card_id, existing.scope, existing.topic]
      );
      deletedDiaryEntries = saves.affectedRows;

      await connection.execute("DELETE FROM card_meanings WHERE id = ?", [id]);

      // Last reading gone: the card has nothing left to show, so remove it
      // too (saves / draw_history rows for it cascade or are cleared by the FKs).
      const [left] = await connection.execute(
        "SELECT COUNT(*) AS n FROM card_meanings WHERE card_id = ?",
        [existing.card_id]
      );
      if (Number(left[0].n) === 0) {
        await connection.execute("DELETE FROM cards WHERE id = ?", [existing.card_id]);
        cardDeleted = true;
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback().catch(() => {});
      throw error;
    } finally {
      connection.release();
    }

    if (cardDeleted) await deleteCardImage(existing.pict);
    return Response.json({ success: true, deletedDiaryEntries, cardDeleted });
  } catch (error) {
    console.error("Admin cards DELETE error:", error);
    return Response.json({ success: false, message: "Could not delete the card" }, { status: 500 });
  }
}
