/**
 * GET /api/cards/daily?category=love|finance|career|pets|health
 * Replaces fetchDailyCard(category) from data/cards.js.
 *
 * Response: { success, card, alreadyDrawn, redrawn, cost, coin, drawCost }
 *   card = { id, scope, topic, name, image, imageAlt, diaryLabel, summary[], adviceTitle,
 *            advice, shareBlurb }
 * A missing category falls back to "love", like the old mock did.
 * One free draw per category per day: asking again the same day returns the
 * same card (alreadyDrawn: true). POST the same URL to pay DRAW_COST (10) coins for a
 * NEW card (402 when short on coins). See lib/draw.js.
 */

import { handleDraw } from "@/lib/draw";
import { CATEGORY_KINDS } from "@/lib/cardQueries";

async function run(request, redraw) {
  try {
    const raw = new URL(request.url).searchParams.get("category");
    const category = raw ? raw.trim().toLowerCase() : "love";
    if (!CATEGORY_KINDS.includes(category)) {
      return Response.json(
        { success: false, message: `Category must be one of: ${CATEGORY_KINDS.join(", ")}` },
        { status: 400 }
      );
    }
    return await handleDraw("category", category, { redraw });
  } catch (error) {
    console.error("Daily card API error:", error);
    return Response.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export const GET = (request) => run(request, false);

// A paid redraw changes the balance, so it is a POST (never fired by link prefetch).
export const POST = (request) => run(request, true);
