/**
 * ---------------------------------------------------------------------
 * lib/storage.js — object storage for uploaded card images
 * ---------------------------------------------------------------------
 * Talks to EITHER Amazon S3 or any store that speaks the S3 API. One
 * setting decides which:
 *
 *   AWS_ENDPOINT_URL_S3 SET    -> that endpoint (Neon, MinIO, …).
 *                                 Needs an access key and secret.
 *   AWS_ENDPOINT_URL_S3 UNSET  -> Amazon S3 itself. Credentials come
 *                                 from the SDK's normal chain, which on
 *                                 ECS is the task's IAM role — so
 *                                 nothing secret is configured at all.
 *
 * --- CHANGED: this used to be Neon only, with the keys required.
 * Deployed on AWS the app now uses real S3 and the task role (see
 * infra/terraform/s3.tf), which is why the keys became optional rather
 * than being swapped for different ones. Local development can keep
 * pointing at Neon by leaving AWS_ENDPOINT_URL_S3 in .env, so nothing
 * has to change on a laptop.
 *
 * Images already in Neon do not move by themselves — a card uploaded
 * before the switch 404s until scripts/mirror-storage.mjs has copied
 * them across.
 *
 * .env:
 *   S3_BUCKET             bucket name, defaults to "cloudnarok"
 *   AWS_REGION            e.g. us-east-1
 *   AWS_ENDPOINT_URL_S3   only for a non-AWS store; omit for real S3
 *   AWS_ACCESS_KEY_ID     only when an endpoint is set, or when running
 *   AWS_SECRET_ACCESS_KEY against AWS from a laptop
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

/** Null when storage is not configured, so callers can say so. */
export function getS3() {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  // A custom endpoint means a store that is not AWS, and those have no
  // role to borrow — without a key there is nothing to try.
  if (endpoint && !(accessKeyId && secretAccessKey)) return null;

  if (!client) {
    client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",

      // Only set when talking to a non-AWS store. Passing endpoint:
      // undefined to the SDK is the same as not passing it, so real S3
      // resolves its own regional endpoint.
      ...(endpoint
        ? {
            endpoint,
            // The endpoint is the project, not a bucket host, so the
            // bucket belongs in the path rather than the subdomain.
            // Real S3 wants the opposite (bucket as a subdomain), which
            // is why this is tied to the endpoint.
            forcePathStyle: true,
          }
        : {}),

      // Explicit keys when given; otherwise leave `credentials` unset so
      // the SDK walks its normal chain and finds the ECS task role. That
      // absence is the whole point — it is what makes the deployed app
      // carry no storage secret.
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
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
