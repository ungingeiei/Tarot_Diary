/**
 * POST /api/admin/cards/image — upload one card image.
 *
 * Takes multipart/form-data with a single `file` field and answers
 * { url } — the path to store in `cards.pict` and render with.
 *
 * Admin only: an open upload endpoint is somewhere to park arbitrary
 * files on someone else's storage bill.
 */

import { getSession } from "@/lib/session";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  getS3,
  putImage,
} from "@/lib/storage";

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ success: false, message: "Not signed in" }, { status: 401 });
    }
    if (session.role !== "admin") {
      return Response.json({ success: false, message: "Admins only" }, { status: 403 });
    }
    if (!getS3()) {
      return Response.json(
        { success: false, message: "Image storage is not configured on this server" },
        { status: 503 }
      );
    }

    const form = await request.formData();
    const file = form.get("file");

    if (!file || typeof file === "string") {
      return Response.json({ success: false, message: "No file was uploaded" }, { status: 400 });
    }

    // The browser's declared type is checked against a fixed list, so an
    // .html or .svg cannot be stored and later served back from our own
    // origin — SVG in particular can carry script.
    if (!ALLOWED_IMAGE_TYPES[file.type]) {
      return Response.json(
        { success: false, message: "Use a JPEG, PNG, WebP or GIF image" },
        { status: 400 }
      );
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return Response.json(
        { success: false, message: "That image is larger than 5 MB" },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    // Checking the real bytes too: `file.type` is whatever the browser
    // claimed, and a renamed file would otherwise sail past the list.
    if (!looksLikeImage(bytes, file.type)) {
      return Response.json(
        { success: false, message: "That file is not a valid image" },
        { status: 400 }
      );
    }

    const key = await putImage({ bytes, contentType: file.type });

    // A path through this app, not a bucket URL: the objects are private
    // and /api/images is what can read them.
    return Response.json({ success: true, url: `/api/images/${key}` });
  } catch (error) {
    console.error("Image upload error:", error);
    return Response.json({ success: false, message: "Could not upload the image" }, { status: 500 });
  }
}

/** Magic numbers for the four types we accept. */
function looksLikeImage(buf, type) {
  if (buf.length < 12) return false;
  const hex = buf.subarray(0, 12).toString("hex");

  switch (type) {
    case "image/jpeg":
      return hex.startsWith("ffd8ff");
    case "image/png":
      return hex.startsWith("89504e470d0a1a0a");
    case "image/gif":
      return hex.startsWith("474946383761") || hex.startsWith("474946383961");
    case "image/webp":
      return buf.subarray(0, 4).toString("ascii") === "RIFF" &&
             buf.subarray(8, 12).toString("ascii") === "WEBP";
    default:
      return false;
  }
}
