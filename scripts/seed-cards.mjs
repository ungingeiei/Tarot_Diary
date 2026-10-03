/**
 * Seeds `cards` and `card_meanings` from src/data/cards.js.
 *
 * src/data/cards.js was the mock data layer the UI used to import
 * directly. It stays in the repo as the source text for this script,
 * which is the only thing that still reads it — the app now goes
 * through /api/cards.
 *
 * Re-running is safe: every write is an upsert keyed on `cards.kind`
 * and on (card_id, scope, topic), so the seed never duplicates rows.
 *
 *   node --env-file=.env scripts/seed-cards.mjs
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import mysql from "mysql2/promise";

// src/data/cards.js is ES module source, but package.json has no
// "type": "module", so plain `import` of it fails under Node — Next
// compiles the app's files, nothing compiles this script. Copying the
// file to a .mjs next to the system temp dir makes Node read it as the
// ES module it already is, without changing the project's module type.
const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(here, "..", "src", "data", "cards.js");
const temp = path.join(os.tmpdir(), `tarot-cards-${process.pid}.mjs`);
fs.copyFileSync(source, temp);

let CARDS, CARD_MEANINGS, TIME_MEANINGS, SHARE_BLURBS;
try {
  ({ CARDS, CARD_MEANINGS, TIME_MEANINGS, SHARE_BLURBS } = await import(
    pathToFileURL(temp).href
  ));
} finally {
  fs.unlinkSync(temp);
}

const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
});

// The meanings are arrays of paragraphs in the source. Joining on a
// blank line keeps that structure in one TEXT column; the API splits
// it back out, so the page still renders separate <p> elements.
const joinParagraphs = (summary) =>
  Array.isArray(summary) ? summary.join("\n\n") : String(summary ?? "");

let cardCount = 0;
let meaningCount = 0;

for (const [kind, card] of Object.entries(CARDS)) {
  const [res] = await db.execute(
    `INSERT INTO cards (kind, name, pict, pred, adv)
     VALUES (?, ?, ?, ?, NULL)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name), pict = VALUES(pict), pred = VALUES(pred)`,
    [kind, card.name, card.image, SHARE_BLURBS[kind] ?? ""]
  );
  cardCount++;

  // insertId is 0 on an update that changed nothing, so read the id back.
  const [[row]] = await db.execute("SELECT id FROM cards WHERE kind = ?", [kind]);
  const cardId = row.id;

  const topics = [
    ...Object.entries(CARD_MEANINGS[kind] ?? {}).map(([t, m]) => ["category", t, m]),
    ...Object.entries(TIME_MEANINGS[kind] ?? {}).map(([t, m]) => ["period", t, m]),
  ];

  for (const [scope, topic, meaning] of topics) {
    await db.execute(
      `INSERT INTO card_meanings (card_id, scope, topic, summary, advice)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         summary = VALUES(summary), advice = VALUES(advice)`,
      [cardId, scope, topic, joinParagraphs(meaning.summary), meaning.advice ?? ""]
    );
    meaningCount++;
  }
}

console.log(`cards:         ${cardCount}`);
console.log(`card_meanings: ${meaningCount}`);

const [[c]] = await db.query("SELECT COUNT(*) AS n FROM cards");
const [[m]] = await db.query("SELECT COUNT(*) AS n FROM card_meanings");
console.log(`\nในฐานข้อมูล -> cards: ${c.n}, card_meanings: ${m.n}`);

await db.end();
