/**
 * ---------------------------------------------------------------------
 * lib/storage.js — object storage for uploaded card images
 * ---------------------------------------------------------------------
 * Talks to the Neon object store, which speaks the S3 API.
 *
 * .env:
 *   AWS_ENDPOINT_URL_S3   https://<project>.storage.<region>.aws.neon.tech
 *   AWS_ACCESS_KEY_ID
 *   AWS_SECRET_ACCESS_KEY
 *   AWS_REGION
 *   S3_BUCKET             optional, defaults to "cloudnarok"
 *
 * OBJECTS ARE PRIVATE AND STAY PRIVATE. The bucket answers 403 to an
 * unsigned GET, and it rejects the `public-read` ACL outright
 * ("NotImplemented"), so there is no public URL to put in `cards.pict`.
 * Images are therefore served back through /api/images/<key>, which
 * streams them with the server's credentials. A presigned GET URL would
 * have been the other option, but those expire — and `cards.pict` is
 * stored for good, so every saved card would break on its own schedule.
 * ---------------------------------------------------------------------
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

export const BUCKET = process.env.S3_BUCKET || "cloudnarok";

let client = null;

/** Null when the bucket is not configured, so callers can say so. */
export function getS3() {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) return null;

  if (!client) {
    client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      // The endpoint is the project, not a bucket host, so the bucket
      // belongs in the path rather than the subdomain.
      forcePathStyle: true,
    });
  }
  return client;
}

export const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Stores one image and returns the key it was written to.
 *
 * The name is random rather than taken from the upload: a filename from
 * the browser could collide with an existing card's image, or carry
 * path separators into the key.
 */
export async function putImage({ bytes, contentType }) {
  const s3 = getS3();
  if (!s3) throw new Error("Object storage is not configured");

  const ext = ALLOWED_IMAGE_TYPES[contentType];
  const name = `${Date.now().toString(36)}-${crypto.randomUUID()}.${ext}`;
  const key = `cards/${name}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: bytes,
      ContentType: contentType,
    })
  );

  return key;
}

export async function getImage(key) {
  const s3 = getS3();
  if (!s3) throw new Error("Object storage is not configured");
  return s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function deleteImage(key) {
  const s3 = getS3();
  if (!s3) return;
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/**
 * The storage key behind one of our own image URLs, or null.
 *
 * Guards every delete: the seeded deck points at Wikimedia, and a card
 * whose picture is a plain external link has nothing of ours to remove.
 * The `cards/` prefix is also what stops a crafted value in `pict` from
 * naming some other object in the bucket.
 */
export function keyFromImageUrl(url) {
  if (typeof url !== "string") return null;
  const match = /^\/api\/images\/(cards\/[A-Za-z0-9._-]+)$/.exec(url.trim());
  return match ? match[1] : null;
}
