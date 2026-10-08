/**
 * POST /api/draw — draw a card.
 *
 * Body: { period } or { category } — one reading, one topic.
 *
 * The first draw of each topic inside its window is free; every draw
 * after that costs coins. The card is CHOSEN HERE, in the same request
 * that takes payment, and written into `draw_history`.
 * /api/cards/daily and /api/cards/time then replay that row.
 *
 * Previously the charge and the card were separate: this route billed
 * for a reading, and the reading page asked for a card of its own, which
 * was free and unlimited. Opening /reading directly, or just refreshing
 * it, handed out as many readings as you liked.
 *
 * The work itself lives in lib/draw.js, which is also what the two
 * /api/cards routes call. It used to be a second implementation here, on
 * top of lib/reading.js, and the two had already drifted: this one
 * charged and recorded in separate statements with no transaction and no
 * lock on the account, so two clicks at once could both draw, and its
 * refund-on-failure was a hand-written UPDATE rather than a rollback.
 */

import { handleDraw } from "@/lib/draw";
import { ALL_KINDS, scopeFor } from "@/lib/cardQueries";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    // Exactly one of the two. Accepting both let a Daily period reading
    // and a Love category reading land on the same row.
    const raw = typeof body.period === "string" ? body.period : body.category;
    const topic = typeof raw === "string" ? raw.trim().toLowerCase() : "";

    if (!ALL_KINDS.includes(topic)) {
      return Response.json(
        { success: false, message: "Invalid draw information" },
        { status: 400 }
      );
    }

    // `redraw` because this is the button the reader presses: a draw
    // already made inside the window is replaced and paid for, rather
    // than handed back unchanged.
    return await handleDraw(scopeFor(topic), topic, { redraw: true });
  } catch (error) {
    console.error("Draw API error:", error);
    return Response.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}
