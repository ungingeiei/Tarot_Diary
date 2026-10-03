/**
 * ---------------------------------------------------------------------
 * lib/reading.js — what a reading IS, shared by /api/draw and /api/cards
 * ---------------------------------------------------------------------
 * Both routes need the same three things: the list of valid topics, the
 * window a free draw is measured in, and the shape a card is returned
 * in. Keeping them here is what stops the paid draw and the page that
 * displays it from disagreeing about any of it.
 * ---------------------------------------------------------------------
 */

import db from "./db";

export const CATEGORY_LABELS = {
  love: "Love",
  finance: "Finance",
  career: "Career",
  pets: "Pets",
  health: "Health",
};

export const PERIOD_LABELS = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

/**
 * Reads `scope` + `topic` out of whatever the caller supplied.
 *
 * A reading is either a period one or a category one, never both: the
 * draw page used to send `period: period || "daily"` AND
 * `category: category || "love"`, which made a Daily time reading
 * indistinguishable from a Love category reading.
 */
export function resolveTopic({ period, category }) {
  if (period && PERIOD_LABELS[period]) {
    return { scope: "period", topic: period, label: PERIOD_LABELS[period] };
  }
  if (category && CATEGORY_LABELS[category]) {
    return { scope: "category", topic: category, label: CATEGORY_LABELS[category] };
  }
  return null;
}

/**
 * SQL for "inside the current free window".
 *
 * A period reading renews with its own period — a weekly reading is
 * free once a week. A category reading renews daily.
 */
export function windowCondition(scope, topic) {
  if (scope === "period" && topic === "weekly") {
    return "YEARWEEK(draw_date, 1) = YEARWEEK(CURDATE(), 1)";
  }
  if (scope === "period" && topic === "monthly") {
    return "YEAR(draw_date) = YEAR(CURDATE()) AND MONTH(draw_date) = MONTH(CURDATE())";
  }
  return "draw_date >= CURDATE() AND draw_date < CURDATE() + INTERVAL 1 DAY";
}

/** Picks one random card that has text for this topic. */
export async function pickCard(scope, topic) {
  const [rows] = await db.execute(
    `SELECT c.id, c.kind, c.name, c.pict, c.pred, m.summary, m.advice
       FROM card_meanings m
       JOIN cards c ON c.id = m.card_id
      WHERE m.scope = ? AND m.topic = ?
      ORDER BY RAND()
      LIMIT 1`,
    [scope, topic]
  );
  return rows[0] || null;
}

/** Loads a specific card's text for this topic, for replaying a draw. */
export async function loadCard(cardId, scope, topic) {
  const [rows] = await db.execute(
    `SELECT c.id, c.kind, c.name, c.pict, c.pred, m.summary, m.advice
       FROM cards c
       LEFT JOIN card_meanings m
              ON m.card_id = c.id AND m.scope = ? AND m.topic = ?
      WHERE c.id = ?
      LIMIT 1`,
    [scope, topic, cardId]
  );
  return rows[0] || null;
}

/** The shape the reading page renders. */
export function shapeCard(row, { scope, topic, label }) {
  return {
    id: row.kind,
    name: row.name,
    image: row.pict,
    imageAlt: `${row.name}, Rider-Waite-Smith tarot deck`,
    scope,
    topic,
    diaryLabel: label,
    summary: row.summary ? String(row.summary).split("\n\n").filter(Boolean) : [],
    adviceTitle: `Your Advice for ${label}`,
    advice: row.advice || "",
    shareBlurb: row.pred || "",
  };
}
