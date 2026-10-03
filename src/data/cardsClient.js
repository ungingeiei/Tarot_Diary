/**
 * ---------------------------------------------------------------------
 * CARD READINGS — thin client over /api/cards
 * ---------------------------------------------------------------------
 * Replaces fetchDailyCard()/fetchTimeCard() from ./cards.js, which drew
 * a random card from a hard-coded object in the browser.
 *
 * These no longer draw anything: POST /api/draw does that, takes the
 * payment and records the card. These read back the card that draw
 * chose, so a refresh shows the same reading instead of a new one.
 *
 * The resolved object has the same fields the mock returned, so pages
 * that render a reading did not have to change.
 *
 * ./cards.js is still the source text for scripts/seed-cards.mjs; it is
 * no longer imported by the app.
 * ---------------------------------------------------------------------
 */

async function fetchCard(query) {
  const res = await fetch(`/api/cards?${query}`, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    // The page needs to tell "you have not drawn yet" apart from a real
    // failure, so the reason travels with the error rather than being
    // flattened into its message.
    const error = new Error(data.message || "Could not load your reading");
    error.reason = data.reason;
    error.status = res.status;
    throw error;
  }
  return data.card;
}

export function fetchDailyCard(category) {
  return fetchCard(`category=${encodeURIComponent(category || "love")}`);
}

export function fetchTimeCard(period) {
  return fetchCard(`period=${encodeURIComponent(period || "daily")}`);
}
