/**
 * ---------------------------------------------------------------------
 * lib/cardQueries.js — turning `cards` rows into what the frontend expects
 * ---------------------------------------------------------------------
 * DB column  ->  frontend field
 *   pict          image
 *   pred          summary (paragraphs separated by a blank line)
 *   adv           advice
 *   kind          diaryLabel / category   (daily, weekly, monthly, love,
 *                                           finance, career, pets, health)
 * The reading card has the SAME shape as data/cards.js returned, so the
 * reading page only has to swap its mock fetch for the API call.
 * ---------------------------------------------------------------------
 */

import db from "@/lib/db";

export const TIME_KINDS = ["daily", "weekly", "monthly"];
export const CATEGORY_KINDS = ["love", "finance", "career", "pets", "health"];
export const ALL_KINDS = [...TIME_KINDS, ...CATEGORY_KINDS];

export const KIND_LABELS = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  love: "Love",
  finance: "Finance",
  career: "Career",
  pets: "Pets",
  health: "Health",
};

export function splitParagraphs(text) {
  return String(text || "")
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** One random card of this kind, or null when the deck has none. */
export async function drawRandomCard(kind) {
  const [rows] = await db.execute(
    "SELECT id, pict, name, pred, adv, kind FROM cards WHERE kind = ? ORDER BY RAND() LIMIT 1",
    [kind]
  );
  return rows[0] || null;
}

export function toReadingCard(row) {
  const label = KIND_LABELS[row.kind] || row.kind;
  return {
    id: row.id,
    name: row.name,
    image: row.pict,
    imageAlt: `${row.name}, tarot card`,
    diaryLabel: label,
    summary: splitParagraphs(row.pred),
    adviceTitle: `Your Advice for ${label}`,
    advice: row.adv,
    shareBlurb: `Getting ${row.name} as your ${label.toLowerCase()} card is a meaningful sign worth sitting with.`,
  };
}

/** Shape used by the admin card-management table. */
export function toAdminCard(row) {
  return {
    id: row.id,
    name: row.name,
    title: row.name.toUpperCase(),
    kind: row.kind,
    category: KIND_LABELS[row.kind] || row.kind,
    prediction: row.pred,
    advice: row.adv,
    image: row.pict,
  };
}

/**
 * Validates the admin form fields. Accepts the admin page's names
 * (name, prediction, advice, category) or the column names (pred, adv,
 * kind). With { partial: true } only the fields that were sent are checked
 * and returned (used by PATCH).
 * Returns { values } with column names, or { error }.
 */
export function parseCardFields(data, { partial = false } = {}) {
  const values = {};
  const has = (key) => data[key] !== undefined && data[key] !== null;
  const text = (value) => (typeof value === "string" ? value.trim() : "");

  if (has("name") || !partial) {
    const name = text(data.name);
    if (!name) return { error: "Card name is required" };
    if (name.length > 255) return { error: "Card name must be 255 characters or fewer" };
    values.name = name;
  }

  const predKey = has("prediction") ? "prediction" : has("pred") ? "pred" : null;
  if (predKey || !partial) {
    const pred = text(data[predKey]);
    if (!pred) return { error: "Prediction is required" };
    if (pred.length > 60000) return { error: "Prediction is too long" };
    values.pred = pred;
  }

  const advKey = has("advice") ? "advice" : has("adv") ? "adv" : null;
  if (advKey || !partial) {
    const adv = text(data[advKey]);
    if (!adv) return { error: "Advice is required" };
    if (adv.length > 60000) return { error: "Advice is too long" };
    values.adv = adv;
  }

  const kindKey = has("category") ? "category" : has("kind") ? "kind" : null;
  if (kindKey || !partial) {
    const kind = text(data[kindKey]).toLowerCase();
    if (!ALL_KINDS.includes(kind)) {
      return { error: `Category must be one of: ${ALL_KINDS.join(", ")}` };
    }
    values.kind = kind;
  }

  return { values };
}
