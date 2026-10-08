/**
 * Brings the deck's artwork in-house, at the size the pages actually
 * draw it.
 *
 *   node --env-file=.env scripts/migrate-card-images.mjs
 *
 * The seeded cards point `cards.pict` at commons.wikimedia.org. That
 * makes every reading depend on someone else's server staying up and
 * serving us. This fetches each picture, resizes it, keeps a copy in
 * public/cards/, uploads it to the bucket under `cards/`, and repoints
 * `cards.pict` at /api/images/cards/<slug>-<width>.jpg.
 *
 * WHY THE RESIZE: the Wikimedia scans are about 1100x1920 and roughly a
 * megabyte each, while the reading frame is 260 CSS px wide and the draw
 * ring's cards are 195. Served through /api/images — which fetches from
 * the bucket on every miss — a full-size scan took two to four seconds to
 * arrive. An <img> keeps painting the picture it already has until the
 * new one decodes, so a redraw sat with the previous card's artwork under
 * the new card's name for that whole time.
 *
 * Safe to re-run, and safe to run against a deck that an earlier version
 * of this script already moved: a card is skipped only when it already
 * points at the key it would be given now. Anything else is re-fetched —
 * from the local copy, the bucket, or the web, whichever applies — and
 * repointed. Nothing is deleted; superseded objects are listed at the end.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import sharp from "sharp";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

// Twice the 260px frame, which covers a 2x screen, with a little room for
// the 3x phones. Anything larger is detail no one can see.
const TARGET_WIDTH = 700;
const QUALITY = 82;

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
 * "The Hanged Man" -> "the_hanged_man".
 *
 * Taken from the NAME, not from `cards.kind`: kind holds the card's TYPE,
 * and every row the admin console creates is written with the literal
 * 'tarot'. Naming the file after it gave the whole deck one key, so each
 * card overwrote the last and every reading ended up showing whichever
 * picture was uploaded last.
 */
function slugFor(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "card";
}

const keyFor = (name) => `cards/${slugFor(name)}-${TARGET_WIDTH}.jpg`;

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
  return Buffer.from(await res.arrayBuffer());
}

const toBuffer = async (body) => Buffer.concat(await body.toArray());

/**
 * The card's current artwork, wherever it happens to live.
 *
 * A deck an older run already moved has no web address left in `pict`, so
 * the local copy is used, and the bucket is the fallback for a checkout
 * that never had one. Returns { bytes, from } — `from` is only for the log.
 */
async function sourceBytes(pict) {
  if (/^https?:\/\//i.test(pict || "")) {
    return { bytes: await download(pict), from: "เว็บ" };
  }

  const match = /^\/api\/images\/(cards\/[A-Za-z0-9._-]+)$/.exec(pict || "");
  if (!match) throw new Error(`ไม่รู้ว่ารูปอยู่ที่ไหน: ${pict || "(ว่าง)"}`);

  const local = path.join(localDir, path.basename(match[1]));
  if (fs.existsSync(local)) return { bytes: fs.readFileSync(local), from: "ในเครื่อง" };

  const object = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: match[1] }));
  return { bytes: await toBuffer(object.Body), from: "บัคเก็ต" };
}

const [cards] = await db.query("SELECT id, name, pict FROM cards ORDER BY id");

let moved = 0;
let skipped = 0;
const failures = [];
const superseded = new Set();

for (const card of cards) {
  const key = keyFor(card.name);
  const url = `/api/images/${key}`;

  if (card.pict === url) {
    skipped++;
    console.log(`  ข้าม   ${card.name.padEnd(20)} ${url}`);
    continue;
  }

  try {
    const { bytes, from } = await sourceBytes(card.pict);

    // withoutEnlargement: one or two of the seeded scans are smaller than
    // the target already, and blowing those up would only cost bytes.
    const resized = await sharp(bytes)
      .rotate() // honour the EXIF orientation before it is stripped
      .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer();

    const file = path.basename(key);
    fs.writeFileSync(path.join(localDir, file), resized);

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: resized,
        ContentType: "image/jpeg",
      })
    );

    await db.execute("UPDATE cards SET pict = ? WHERE id = ?", [url, card.id]);

    const old = /^\/api\/images\/(cards\/[A-Za-z0-9._-]+)$/.exec(card.pict || "");
    if (old) superseded.add(old[1]);

    moved++;
    console.log(
      `  ย้าย   ${card.name.padEnd(20)} ${from.padEnd(9)} ` +
        `${(bytes.length / 1024).toFixed(0).padStart(5)} KB -> ` +
        `${(resized.length / 1024).toFixed(0).padStart(4)} KB  ${url}`
    );

    // Spacing the requests out is what keeps Wikimedia's rate limit from
    // being hit at all on a clean run.
    if (from === "เว็บ") await sleep(700);
  } catch (err) {
    failures.push({ card: card.name, reason: err.message });
    console.log(`  ล้มเหลว ${card.name.padEnd(20)} ${err.message}`);
  }
}

console.log(`\nย้ายแล้ว ${moved} ใบ | ข้าม ${skipped} ใบ | ล้มเหลว ${failures.length} ใบ`);
console.log(`สำเนาในเครื่อง: public/cards/`);

if (superseded.size > 0) {
  // Left in place on purpose: a browser that already cached one of these
  // keeps using it, and /api/images sets a year-long immutable cache.
  console.log(`\nออบเจ็กต์เก่าที่ไม่มีใครชี้ถึงแล้ว (ลบเองได้เมื่อพร้อม):`);
  for (const key of [...superseded].sort()) console.log(`  ${key}`);
}

const [[still]] = await db.query(
  "SELECT COUNT(*) AS n FROM cards WHERE pict LIKE 'http%'"
);
console.log(`\nยังชี้ URL ภายนอกอยู่: ${still.n} ใบ`);

await db.end();
