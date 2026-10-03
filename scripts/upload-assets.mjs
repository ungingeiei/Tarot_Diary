/**
 * Copies the images in public/ up to the bucket, under `assets/`.
 *
 *   node --env-file=.env scripts/upload-assets.mjs
 *
 * The local files are left exactly where they are — this only adds a
 * copy in object storage. Each file keeps its path, so
 * public/home/bigTarot.svg becomes assets/home/bigTarot.svg and is
 * served back as /api/images/assets/home/bigTarot.svg.
 *
 * Re-running overwrites by key, so it never leaves duplicates behind and
 * is the way to push a changed image up again.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

const TYPES = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
};

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(here, "..", "public");
const BUCKET = process.env.S3_BUCKET || "cloudnarok";

if (!process.env.AWS_ENDPOINT_URL_S3) {
  console.error("AWS_ENDPOINT_URL_S3 is not set — run with: node --env-file=.env");
  process.exit(1);
}

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

/** Every image under public/, as paths relative to it. */
function collect(dir, prefix = "") {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      // `database/` holds the .sql migrations, not anything to serve.
      // `cards/` is the deck's artwork, which lives in the bucket under
      // its own `cards/` prefix already — scripts/migrate-card-images.mjs
      // put it there and `cards.pict` points at it. Sweeping it in here
      // too would upload the same 17 MB a second time under assets/.
      if (entry.name === "database" || entry.name === "cards") continue;
      out.push(...collect(path.join(dir, entry.name), `${prefix}${entry.name}/`));
    } else if (TYPES[path.extname(entry.name).toLowerCase()]) {
      out.push(prefix + entry.name);
    }
  }
  return out;
}

const files = collect(publicDir);
let uploaded = 0;

for (const rel of files) {
  const body = fs.readFileSync(path.join(publicDir, rel));
  const key = `assets/${rel}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: TYPES[path.extname(rel).toLowerCase()],
    })
  );

  uploaded++;
  console.log(`  ${key.padEnd(38)} ${(body.length / 1024).toFixed(1)} KB`);
}

const listed = await s3.send(
  new ListObjectsV2Command({ Bucket: BUCKET, Prefix: "assets/" })
);

console.log(`\nอัปโหลด ${uploaded} ไฟล์`);
console.log(`ใน bucket ตอนนี้: ${(listed.Contents || []).length} ไฟล์ภายใต้ assets/`);
console.log(`ไฟล์ใน public/ ยังอยู่ครบ ไม่ได้ลบอะไร`);
