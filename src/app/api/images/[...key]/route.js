/**
 * GET /api/images/<key> — serve an uploaded image.
 *
 * The bucket keeps every object private: an unsigned request to it gets
 * 403, and it does not implement the public-read ACL. This route is how
 * those images reach a browser — it fetches with the server's
 * credentials and streams the bytes back.
 *
 * Reading is deliberately open to anyone. Card art is shown to every
 * visitor, signed in or not, so requiring a session here would leave the
 * deck imageless on the public pages.
 */

import { getImage, getS3 } from "@/lib/storage";

// Only keys this app writes, i.e. cards/<generated name>. Anything else
// is refused rather than passed to the bucket, so a crafted path cannot
// be used to probe for other objects in it.
const ALLOWED_KEY = /^cards\/[A-Za-z0-9._-]+$/;

export async function GET(request, { params }) {
  try {
    const { key: segments } = await params;
    const key = (segments || []).join("/");

    if (!ALLOWED_KEY.test(key)) {
      return new Response("Not found", { status: 404 });
    }
    if (!getS3()) {
      return new Response("Image storage is not configured", { status: 503 });
    }

    const object = await getImage(key);

    return new Response(object.Body, {
      headers: {
        "Content-Type": object.ContentType || "application/octet-stream",
        ...(object.ContentLength ? { "Content-Length": String(object.ContentLength) } : {}),
        // The key is unique per upload and an image is never rewritten
        // in place, so this can be cached hard.
        "Cache-Control": "public, max-age=31536000, immutable",
        ...(object.ETag ? { ETag: object.ETag } : {}),
      },
    });
  } catch (error) {
    if (error?.name === "NoSuchKey" || error?.$metadata?.httpStatusCode === 404) {
      return new Response("Not found", { status: 404 });
    }
    console.error("Image serve error:", error);
    return new Response("Could not load the image", { status: 500 });
  }
}
