/**
 * ---------------------------------------------------------------------
 * lib/cardImages.js — the card pictures in object storage
 * ---------------------------------------------------------------------
 * Sits between the admin routes and lib/storage: the routes deal in
 * uploaded File objects and in the `/api/images/...` URLs that go in
 * `cards.pict`, while lib/storage deals in bucket keys.
 *
 * Objects in the bucket are private, so a stored URL is a path through
 * this app (/api/images/cards/<name>) rather than a bucket address.
 * ---------------------------------------------------------------------
 */

import sharp from "sharp";
import db from "@/lib/db";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  deleteImage,
  getS3,
  keyFromImageUrl,
  putImage,
} from "@/lib/storage";

export { MAX_IMAGE_BYTES };

// What the pages actually draw a card at: 260 CSS px in the reading
// frame, 195 in the draw ring. 700 covers a 2x screen with room to
// spare. The seeded deck is stored at this width too — see
// scripts/migrate-card-images.mjs, and the note there on why it matters.
const STORED_WIDTH = 700;
const STORED_QUALITY = 82;

/** A rejected upload: the message is meant for the admin to read. */
export class UploadError extends Error {}

/** True for a File/Blob that actually carries bytes (not a text field). */
export function isUploadedFile(value) {
  return Boolean(value) && typeof value !== "string" && typeof value.arrayBuffer === "function" && value.size > 0;
}

/** Magic numbers for the four types we accept. */
export function looksLikeImage(buf, type) {
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

/**
 * Validates and stores one uploaded image. Returns the URL to put in
 * `cards.pict`. Throws UploadError for anything the admin can fix.
 */
export async function saveUploadedImage(file) {
  if (!getS3()) throw new UploadError("Image storage is not configured on this server");
  if (!isUploadedFile(file)) throw new UploadError("No file was uploaded");

  // The browser's declared type is checked against a fixed list, so an
  // .html or .svg cannot be stored and later served back from our own
  // origin — SVG in particular can carry script.
  if (!ALLOWED_IMAGE_TYPES[file.type]) {
    throw new UploadError("Use a JPEG, PNG, WebP or GIF image");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new UploadError("That image is larger than 5 MB");
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // Checking the real bytes too: `file.type` is whatever the browser
  // claimed, and a renamed file would otherwise sail past the list.
  if (!looksLikeImage(bytes, file.type)) {
    throw new UploadError("That file is not a valid image");
  }

  // Stored at the size it is shown, not the size it arrived.
  //
  // /api/images fetches every miss from the bucket and streams it back, so
  // a 5 MB upload is 5 MB on the wire each first view — the seeded deck at
  // around a megabyte a card already took two to four seconds, which was
  // long enough for a redrawn card's name to sit above the previous card's
  // picture. An admin's upload has no reason to be any heavier.
  //
  // JPEG whatever came in: the artwork is photographic, none of it needs
  // transparency, and one output format keeps the served type predictable.
  // withoutEnlargement leaves a small picture alone rather than blowing it
  // up into a bigger file that shows no more detail.
  let stored;
  try {
    stored = await sharp(bytes)
      .rotate() // honour the EXIF orientation before it is stripped
      .resize({ width: STORED_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: STORED_QUALITY, mozjpeg: true })
      .toBuffer();
  } catch {
    // It passed the magic-byte check, so this is a truncated or otherwise
    // broken file rather than something that was never an image.
    throw new UploadError("That image could not be processed");
  }

  return `/api/images/${await putImage({ bytes: stored, contentType: "image/jpeg" })}`;
}

/**
 * Removes an uploaded image that nothing points at any more.
 *
 * Called after a card's picture is replaced, and after a card is
 * deleted. Checked against `cards` first because the same upload could
 * have been set on a second card by hand, and a storage failure is
 * swallowed: an image left behind costs a little space, while a thrown
 * error here would fail a write that has already happened.
 */
export async function dropImageIfUnused(url, exceptCardId = 0) {
  const key = keyFromImageUrl(url);
  if (!key) return; // an external link, e.g. the seeded Wikimedia deck

  try {
    const [used] = await db.execute(
      "SELECT id FROM cards WHERE pict = ? AND id <> ? LIMIT 1",
      [url, exceptCardId]
    );
    if (used.length > 0) return;
    await deleteImage(key);
  } catch (err) {
    console.error("Could not remove unused image", key, err);
  }
}
