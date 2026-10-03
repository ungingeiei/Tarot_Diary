/**
 * GET /api/cards?category=love  |  ?period=weekly
 *
 * Returns the card this account most recently DREW for that topic — it
 * does not draw one. Drawing happens in POST /api/draw, which is where
 * the free draw is spent and coins are taken.
 *
 * This route used to pick a random card itself, with no session and no
 * charge, which meant /reading could be opened or refreshed for endless
 * free readings. Replaying the stored draw also means a refresh shows
 * the same card instead of silently rerolling it.
 *
 * 409 NO_DRAW tells the page to send the user to the draw screen.
 */

import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { loadCard, resolveTopic, shapeCard, windowCondition } from "@/lib/reading";

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json(
        { success: false, message: "Not signed in" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const resolved = resolveTopic({
      period: searchParams.get("period"),
      category: searchParams.get("category"),
    });

    if (!resolved) {
      return Response.json(
        { success: false, message: "Invalid reading" },
        { status: 400 }
      );
    }
    const { scope, topic } = resolved;

    // Only within the current window: yesterday's daily reading is over,
    // and showing it again would look like today's.
    const [rows] = await db.execute(
      `SELECT card_id FROM draw_history
        WHERE account_id = ? AND scope = ? AND topic = ? AND card_id IS NOT NULL
          AND ${windowCondition(scope, topic)}
        ORDER BY draw_date DESC, id DESC
        LIMIT 1`,
      [session.accountId, scope, topic]
    );

    if (rows.length === 0) {
      return Response.json(
        { success: false, reason: "NO_DRAW", message: "Draw a card first" },
        { status: 409 }
      );
    }

    const card = await loadCard(rows[0].card_id, scope, topic);
    if (!card) {
      // The card was deleted from the deck after being drawn.
      return Response.json(
        { success: false, reason: "NO_DRAW", message: "That card is no longer available" },
        { status: 409 }
      );
    }

    return Response.json({ success: true, card: shapeCard(card, resolved) });
  } catch (error) {
    console.error("Cards API error:", error);
    return Response.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}
