/**
 * GET /api/cards/time?period=daily|weekly|monthly
 * Replaces fetchTimeCard(period) from data/cards.js.
 *
 * Same response shape as /api/cards/daily. A missing period falls back to
 * "daily", like the old mock did.
One free draw per day / week / month: asking again inside the same window
returns the same card (alreadyDrawn: true). POST the same URL to pay DRAW_COST (10)
coins for a NEW card (402 when short on coins). See lib/draw.js.
 */

import { handleDraw } from "@/lib/draw";
import { TIME_KINDS } from "@/lib/cardQueries";

async function run(request, redraw) {
  try {
    const raw = new URL(request.url).searchParams.get("period");
    const period = raw ? raw.trim().toLowerCase() : "daily";
    if (!TIME_KINDS.includes(period)) {
      return Response.json(
        { success: false, message: `Period must be one of: ${TIME_KINDS.join(", ")}` },
        { status: 400 }
      );
    }
    return await handleDraw("period", period, { redraw });
  } catch (error) {
    console.error("Time card API error:", error);
    return Response.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export const GET = (request) => run(request, false);

// A paid redraw changes the balance, so it is a POST (never fired by link prefetch).
export const POST = (request) => run(request, true);
