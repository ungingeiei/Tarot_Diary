/**
 * ---------------------------------------------------------------------
 * lib/assets.js — where the static images are served from
 * ---------------------------------------------------------------------
 * The images in public/ are also kept in object storage (pushed up by
 * scripts/upload-assets.mjs) and served through /api/images, which
 * fetches them from the bucket with the server's credentials — the
 * objects themselves are private and answer 403 to a direct request.
 *
 * The local files are still in public/ and still work; everything goes
 * through this one function so the whole app can be pointed back at them
 * by changing ASSET_BASE to "" if the bucket is ever unavailable.
 * ---------------------------------------------------------------------
 */

export const ASSET_BASE = "/api/images/assets";

/** asset("home/bigTarot.svg") -> "/api/images/assets/home/bigTarot.svg" */
export function asset(filePath) {
  return `${ASSET_BASE}/${String(filePath).replace(/^\/+/, "")}`;
}
