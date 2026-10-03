/**
 * ---------------------------------------------------------------------
 * lib/uploads.js — storing admin-uploaded card images
 * ---------------------------------------------------------------------
 * Files are written to  <UPLOAD_DIR>/cards/  (default: ./uploads/cards,
 * OUTSIDE public/) and served by  GET /api/uploads/cards/<file>.
 *
 * Why not public/uploads?  `next start` only serves files that were in
 * public/ when the app was BUILT, so images uploaded afterwards would 404
 * in production. A route handler reads from disk on every request instead.
 *
 * Safety rules:
 *   - the file type is decided by its first bytes, never by its name or
 *     the browser-supplied Content-Type
 *   - only PNG / JPEG / GIF / WebP (no SVG: it can carry scripts)
 *   - at most 3 MB
 *   - the stored name is random, so a user-chosen name never touches disk
 * ---------------------------------------------------------------------
 */

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export const CARD_URL_PREFIX = "/api/uploads/cards/";
export const CARD_FILE_PATTERN = /^[a-f0-9]{32}\.(png|jpg|gif|webp)$/;

const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));
const CARD_DIR = path.join(UPLOAD_ROOT, "cards");

export const IMAGE_TYPES = {
  png: "image/png",
  jpg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

export class UploadError extends Error {}

/** Looks at the file's magic bytes. Returns "png" | "jpg" | "gif" | "webp" | null. */
export function sniffImageType(buffer) {
  if (buffer.length < 12) return null;
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  const head = buffer.subarray(0, 6).toString("latin1");
  if (head === "GIF87a" || head === "GIF89a") return "gif";
  if (buffer.subarray(0, 4).toString("latin1") === "RIFF" && buffer.subarray(8, 12).toString("latin1") === "WEBP") return "webp";
  return null;
}

/** True for a File/Blob-like value that actually holds data. */
export function isUploadedFile(value) {
  return Boolean(value) && typeof value === "object" && typeof value.arrayBuffer === "function" && value.size > 0;
}

/** Validates and stores the image. Returns its public URL path. Throws UploadError. */
export async function saveCardImage(file) {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new UploadError("Image must be 3 MB or smaller");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const type = sniffImageType(buffer);
  if (!type) {
    throw new UploadError("Image must be a PNG, JPEG, GIF or WebP file");
  }
  await fs.mkdir(CARD_DIR, { recursive: true });
  const filename = `${crypto.randomBytes(16).toString("hex")}.${type}`;
  await fs.writeFile(path.join(CARD_DIR, filename), buffer, { flag: "wx" });
  return `${CARD_URL_PREFIX}${filename}`;
}

/** Removes an image we stored. Ignores URLs that are not ours (e.g. seeded Wikimedia links). */
export async function deleteCardImage(url) {
  if (typeof url !== "string" || !url.startsWith(CARD_URL_PREFIX)) return;
  const filename = url.slice(CARD_URL_PREFIX.length);
  if (!CARD_FILE_PATTERN.test(filename)) return;
  await fs.rm(path.join(CARD_DIR, filename), { force: true }).catch(() => {});
}

/** Reads a stored image for serving. Returns { buffer, type } or null. */
export async function readCardImage(filename) {
  if (!CARD_FILE_PATTERN.test(filename)) return null;
  try {
    const buffer = await fs.readFile(path.join(CARD_DIR, filename));
    return { buffer, type: IMAGE_TYPES[filename.split(".").pop()] };
  } catch {
    return null;
  }
}
