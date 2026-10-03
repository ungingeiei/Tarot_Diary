/**
 * ---------------------------------------------------------------------
 * /api/admin/cards/:id — admin card management  (update + delete)
 * ---------------------------------------------------------------------
 * Admin only (401 / 403, see lib/apiAuth.js).
 *
 *   PATCH (or PUT)  multipart/form-data OR JSON
 *        any of: name, category (or kind), prediction, advice, image (file)
 *        Only the fields sent are changed; a new image replaces the old
 *        file. -> { success, card }
 *
 *   DELETE
 *        Deletes the card AND every diary entry saved from it (the delete
 *        dialog warns "All linked predictions will also be deleted"). Both
 *        deletes run in one transaction. -> { success, deletedDiaryEntries }
 * ---------------------------------------------------------------------
 */

import db from "@/lib/db";
import { requireAdmin } from "@/lib/apiAuth";
import { parseCardFields, toAdminCard } from "@/lib/cardQueries";
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

async function loadCard(id) {
  const [rows] = await db.execute(
    "SELECT id, pict, name, pred, adv, kind FROM cards WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

async function updateCard(request, context) {
  let newImageUrl = null;
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const id = parseId((await context.params).id);
    if (!id) return Response.json({ success: false, message: "Invalid card id" }, { status: 400 });

    const existing = await loadCard(id);
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

    if (isUploadedFile(file)) {
      newImageUrl = await saveCardImage(file);
      values.pict = newImageUrl;
    }

    const columns = Object.keys(values);
    if (columns.length === 0) return Response.json({ success: false, message: "Nothing to update" }, { status: 400 });

    try {
      await db.execute(
        `UPDATE cards SET ${columns.map((column) => `${column} = ?`).join(", ")} WHERE id = ?`,
        [...columns.map((column) => values[column]), id]
      );
    } catch (dbError) {
      if (newImageUrl) await deleteCardImage(newImageUrl);
      if (dbError?.code === "ER_DUP_ENTRY") {
        return Response.json(
          { success: false, message: "Another card with that name already exists in this category" },
          { status: 409 }
        );
      }
      throw dbError;
    }

    if (newImageUrl) await deleteCardImage(existing.pict); // the replaced file
    return Response.json({ success: true, card: toAdminCard(await loadCard(id)) });
  } catch (error) {
    if (error instanceof UploadError) return Response.json({ success: false, message: error.message }, { status: 400 });
    if (newImageUrl) await deleteCardImage(newImageUrl);
    console.error("Admin cards PATCH error:", error);
    return Response.json({ success: false, message: "Could not update the card" }, { status: 500 });
  }
}

export const PATCH = updateCard;
export const PUT = updateCard;

export async function DELETE(_request, context) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const id = parseId((await context.params).id);
    if (!id) return Response.json({ success: false, message: "Invalid card id" }, { status: 400 });

    const existing = await loadCard(id);
    if (!existing) return Response.json({ success: false, message: "Card not found" }, { status: 404 });

    // saves.card_id is a foreign key without ON DELETE CASCADE, so the
    // diary entries must go first — all-or-nothing.
    const connection = await db.getConnection();
    let deletedDiaryEntries = 0;
    try {
      await connection.beginTransaction();
      const [saves] = await connection.execute("DELETE FROM saves WHERE card_id = ?", [id]);
      deletedDiaryEntries = saves.affectedRows;
      await connection.execute("DELETE FROM cards WHERE id = ?", [id]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    await deleteCardImage(existing.pict);
    return Response.json({ success: true, deletedDiaryEntries });
  } catch (error) {
    console.error("Admin cards DELETE error:", error);
    return Response.json({ success: false, message: "Could not delete the card" }, { status: 500 });
  }
}
