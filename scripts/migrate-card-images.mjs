/**
 * Brings the deck's artwork in-house.
 *
 *   node --env-file=.env scripts/migrate-card-images.mjs
 *
 * The seeded cards point `cards.pict` at commons.wikimedia.org. That
 * makes every reading depend on someone else's server staying up and
 * serving us. This downloads each picture, keeps a copy in
 * public/cards/, uploads it to the bucket under `cards/`, and repoints
 * `cards.pict` at /api/images/cards/<slug>.<ext>.
 *
 * Safe to re-run: a card already pointing at /api/images is skipped, so
 * running it twice does not re-download the deck or touch the rows.
 * Nothing is deleted — the original URLs are printed, and the local
 * copies stay on disk.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const here = path.dirname(fileURLToPath(import.meta.url));
const localDir = path.join(here, "..", "public", "cards");
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

const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
});

fs.mkdirSync(localDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetches one picture, waiting and retrying on a 429.
 *
 * Wikimedia rate-limits a burst of twenty downloads and answers 429 for
 * the rest, which is what a first run of this script looked like: half
 * the deck moved and half refused. Backing off turns that into a slower
 * run instead of a partial one.
 */
async function download(url, attempt = 1) {
  // Wikimedia turns away requests that do not say who is asking.
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "TarotDiary/1.0 (card art migration)" },
  });

  if (res.status === 429 && attempt <= 5) {
    const wait = Number(res.headers.get("retry-after")) * 1000 || attempt * 4000;
    console.log(`         โดนจำกัดอัตรา รอ ${wait / 1000}s แล้วลองใหม่ (ครั้งที่ ${attempt})`);
    await sleep(wait);
    return download(url, attempt + 1);
  }

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

const [cards] = await db.query("SELECT id, kind, name, pict FROM cards ORDER BY id");

let moved = 0;
let skipped = 0;
const failures = [];

for (const card of cards) {
  if (!/^https?:\/\//i.test(card.pict || "")) {
    skipped++;
    console.log(`  ข้าม   ${card.name.padEnd(20)} ${card.pict || "(ว่าง)"}`);
    continue;
  }

  try {
    const res = await download(card.pict);

    const type = (res.headers.get("content-type") || "").split(";")[0].trim();
    const ext = EXT[type];
    if (!ext) throw new Error(`unexpected content-type ${type}`);

    const bytes = Buffer.from(await res.arrayBuffer());

    // Named after the card's slug rather than randomly: this is a
    // one-off migration of a known deck, and a readable key makes the
    // bucket listing mean something.
    const file = `${card.kind}.${ext}`;
    fs.writeFileSync(path.join(localDir, file), bytes);

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: `cards/${file}`,
        Body: bytes,
        ContentType: type,
      })
    );

    await db.execute("UPDATE cards SET pict = ? WHERE id = ?", [
      `/api/images/cards/${file}`,
      card.id,
    ]);

    moved++;
    // Spacing the requests out is what keeps the rate limit from being
    // hit at all on a clean run.
    await sleep(700);
    console.log(
      `  ย้าย   ${card.name.padEnd(20)} ${(bytes.length / 1024).toFixed(0).padStart(4)} KB  ->  /api/images/cards/${file}`
    );
  } catch (err) {
    failures.push({ card: card.name, reason: err.message });
    console.log(`  ล้มเหลว ${card.name.padEnd(20)} ${err.message}`);
  }
}

console.log(`\nย้ายแล้ว ${moved} ใบ | ข้าม ${skipped} ใบ | ล้มเหลว ${failures.length} ใบ`);
console.log(`สำเนาในเครื่อง: public/cards/`);

const [[still]] = await db.query(
  "SELECT COUNT(*) AS n FROM cards WHERE pict LIKE 'http%'"
);
console.log(`ยังชี้ URL ภายนอกอยู่: ${still.n} ใบ`);

await db.end();
