/**
 * POST /api/admin/cards/image — upload one card image.
 *
 * Takes multipart/form-data with a single `file` field and answers
 * { url } — the path to store in `cards.pict` and render with.
 *
 * Admin only: an open upload endpoint is somewhere to park arbitrary
 * files on someone else's storage bill.
 */

import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { deleteImage, getS3, keyFromImageUrl } from "@/lib/storage";
import { UploadError, saveUploadedImage } from "@/lib/cardImages";

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ success: false, message: "Not signed in" }, { status: 401 });
    }
    if (session.role !== "admin") {
      return Response.json({ success: false, message: "Admins only" }, { status: 403 });
    }
    const form = await request.formData();
    const url = await saveUploadedImage(form.get("file"));

    // A path through this app, not a bucket URL: the objects are private
    // and /api/images is what can read them.
    return Response.json({ success: true, url });
  } catch (error) {
    if (error instanceof UploadError) {
      return Response.json({ success: false, message: error.message }, { status: 400 });
    }
    console.error("Image upload error:", error);
    return Response.json({ success: false, message: "Could not upload the image" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/cards/image?url=/api/images/cards/<name>
 *
 * Throws away an upload that was never saved — the admin picked a file,
 * which uploads straight away, and then chose a different one or closed
 * the form. Without this those files would sit in the bucket forever
 * with nothing pointing at them.
 *
 * Refuses anything a card is actually using, so this cannot be turned
 * into a way to strip pictures off the deck.
 */
export async function DELETE(request) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ success: false, message: "Not signed in" }, { status: 401 });
    }
    if (session.role !== "admin") {
      return Response.json({ success: false, message: "Admins only" }, { status: 403 });
    }

    const url = new URL(request.url).searchParams.get("url");
    const key = keyFromImageUrl(url);
    if (!key) {
      return Response.json({ success: false, message: "Not an uploaded image" }, { status: 400 });
    }

    const [used] = await db.execute("SELECT id FROM cards WHERE pict = ? LIMIT 1", [url]);
    if (used.length > 0) {
      return Response.json(
        { success: false, message: "That image is in use by a card" },
        { status: 409 }
      );
    }

    if (getS3()) await deleteImage(key);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Image delete error:", error);
    return Response.json({ success: false, message: "Could not delete the image" }, { status: 500 });
  }
}
