/**
 * ---------------------------------------------------------------------
 * lib/cardQueries.js — cards + card_meanings -> what the frontend expects
 * ---------------------------------------------------------------------
 * Your schema (03_cards_and_diary.sql):
 *   cards          one row per card:   id, pict, name, pred (short blurb), adv, kind
 *   card_meanings  one row per card per reading:
 *                    card_id, scope, topic, summary, advice
 *                    scope 'period'   -> topic daily | weekly | monthly   (time cards)
 *                    scope 'category' -> topic love | finance | career | pets | health
 *
 * A "reading" is therefore (card, scope, topic). The reading card sent to
 * the page has the SAME shape data/cards.js returned, plus `scope`/`topic`
 * (the diary needs them to say which reading is being saved).
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

/** 'daily' -> 'period', 'love' -> 'category', anything else -> null. */
export function scopeFor(topic) {
  if (TIME_KINDS.includes(topic)) return "period";
  if (CATEGORY_KINDS.includes(topic)) return "category";
  return null;
}

/** True when (scope, topic) is one of the eight valid readings. */
export function isValidReading(scope, topic) {
  return scopeFor(topic) === scope;
}

export function splitParagraphs(text) {
  return String(text || "")
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * SQL condition (on draw_history.draw_date, alias `h`) for "inside the
 * current free-draw window".
 *   daily  and every category -> today
 *   weekly                    -> this ISO week (Monday start)
 *   monthly                   -> this calendar month
 * Evaluated by MySQL, so it uses the database's clock and time zone — the
 * same clock that stamped draw_date.
 */
export function windowCondition(scope, topic) {
  if (scope === "period" && topic === "weekly") {
    return "YEARWEEK(h.draw_date, 1) = YEARWEEK(CURDATE(), 1)";
  }
  if (scope === "period" && topic === "monthly") {
    return "YEAR(h.draw_date) = YEAR(CURDATE()) AND MONTH(h.draw_date) = MONTH(CURDATE())";
  }
  return "DATE(h.draw_date) = CURDATE()";
}

/**
 * One random card that HAS a reading for (scope, topic), or null.
 * `excludeCardId` keeps a paid redraw from handing back the card just shown.
 */
export async function pickRandomReading(scope, topic, executor = db, excludeCardId = null) {
  const [rows] = await executor.execute(
    `SELECT c.id AS card_id, c.pict, c.name, c.pred, m.scope, m.topic, m.summary, m.advice
       FROM card_meanings m
       JOIN cards c ON c.id = m.card_id
      WHERE m.scope = ? AND m.topic = ?${excludeCardId ? " AND c.id <> ?" : ""}
      ORDER BY RAND() LIMIT 1`,
    excludeCardId ? [scope, topic, excludeCardId] : [scope, topic]
  );
  return rows[0] || null;
}

/** row = { card_id, pict, name, summary, advice, scope, topic } */
export function toReadingCard(row) {
  const label = KIND_LABELS[row.topic] || row.topic;
  return {
    id: row.card_id,
    scope: row.scope,
    topic: row.topic,
    name: row.name,
    image: row.pict,
    imageAlt: `${row.name}, tarot card`,
    diaryLabel: label,
    summary: splitParagraphs(row.summary),
    adviceTitle: `Your Advice for ${label}`,
    advice: row.advice,
    shareBlurb: `Getting ${row.name} as your ${label.toLowerCase()} card is a meaningful sign worth sitting with.`,
  };
}

/**
 * The admin table lists READINGS: one row per card_meanings row, so the same
 * card shows once for each category it has a text for. `id` is the
 * card_meanings id (what PATCH / DELETE take); `cardId` is the card itself.
 * row = { id, card_id, pict, name, scope, topic, summary, advice }
 */
export function toAdminCard(row) {
  return {
    id: row.id,
    cardId: row.card_id,
    name: row.name,
    title: row.name.toUpperCase(),
    scope: row.scope,
    kind: row.topic,
    category: KIND_LABELS[row.topic] || row.topic,
    prediction: row.summary,
    advice: row.advice,
    image: row.pict,
  };
}

export const ADMIN_SELECT = `
  SELECT m.id, m.card_id, m.scope, m.topic, m.summary, m.advice, c.pict, c.name
    FROM card_meanings m
    JOIN cards c ON c.id = m.card_id`;

/**
 * Validates the admin form fields (page names: name, prediction, advice,
 * category). With { partial: true } only the fields that were sent are
 * checked and returned (used by PATCH).
 * Returns { values: { name, summary, advice, topic, scope } } or { error }.
 */
export function parseCardFields(data, { partial = false } = {}) {
  const values = {};
  const has = (key) => data[key] !== undefined && data[key] !== null;
  const text = (value) => (typeof value === "string" ? value.replace(/\r\n?/g, "\n").trim() : "");

  if (has("name") || !partial) {
    const name = text(data.name);
    if (!name) return { error: "Card name is required" };
    if (name.length > 255) return { error: "Card name must be 255 characters or fewer" };
    values.name = name;
  }

  if (has("prediction") || !partial) {
    const summary = text(data.prediction);
    if (!summary) return { error: "Prediction is required" };
    if (summary.length > 60000) return { error: "Prediction is too long" };
    values.summary = summary;
  }

  if (has("advice") || !partial) {
    const advice = text(data.advice);
    if (!advice) return { error: "Advice is required" };
    if (advice.length > 60000) return { error: "Advice is too long" };
    values.advice = advice;
  }

  if (has("category") || !partial) {
    const topic = text(data.category).toLowerCase();
    if (!ALL_KINDS.includes(topic)) {
      return { error: `Category must be one of: ${ALL_KINDS.join(", ")}` };
    }
    values.topic = topic;
    values.scope = scopeFor(topic);
  }

  return { values };
}
