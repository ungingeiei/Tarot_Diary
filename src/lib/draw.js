/**
 * ---------------------------------------------------------------------
 * lib/draw.js — the shared "draw a card" flow behind
 *   GET  /api/cards/daily?category=...   (free draw / same card again)
 *   GET  /api/cards/time?period=...
 *   POST on the same URLs                 (paid redraw)
 * ---------------------------------------------------------------------
 * The first draw in a window is FREE, remembered in `draw_history`:
 *   time cards      one per day / week / month   (topic daily | weekly | monthly)
 *   category cards  one per day, per category    (love, finance, ...)
 *
 * Signed in:
 *   - Plain request, already drew inside the window: the SAME card comes back
 *     (alreadyDrawn: true, no charge). Refreshing never costs anything.
 *   - POST (redraw) AFTER a draw inside the window: DRAW_COST coins (default 10)
 *     are taken and a NEW card (never the one just shown) is drawn and
 *     recorded; it becomes the window's card. 402 if the balance is too low,
 *     409 if the deck has no other card (nothing is charged in either case).
 *     POST before any draw in the window is just the free first draw.
 *   The account row is locked first (SELECT ... FOR UPDATE), so two requests
 *   at once (React's double effect, two tabs) cannot both draw or both spend.
 *   Coin change + new draw_history row commit together or not at all.
 * Not signed in: a random card is returned and nothing is recorded; redraw
 *   needs an account (401).
 *
 * Response: { success, card, alreadyDrawn, redrawn, cost, coin, drawCost }
 *   coin = current balance for signed-in users, null for visitors.
 * ---------------------------------------------------------------------
 */

import db from "@/lib/db";
import { getSessionAccountId } from "@/lib/apiAuth";
import { DRAW_COST, getAccountCoins, spendCoins } from "@/lib/coin";
import { pickRandomReading, toReadingCard, windowCondition } from "@/lib/cardQueries";

/** The reading this account already drew inside the current window, if any. */
async function findDrawnReading(executor, accountId, scope, topic) {
  const [rows] = await executor.execute(
    `SELECT c.id AS card_id, c.pict, c.name, c.pred, m.scope, m.topic, m.summary, m.advice
       FROM draw_history h
       JOIN cards c ON c.id = h.card_id
       JOIN card_meanings m ON m.card_id = h.card_id AND m.scope = h.scope AND m.topic = h.topic
      WHERE h.account_id = ? AND h.scope = ? AND h.topic = ? AND ${windowCondition(scope, topic)}
      ORDER BY h.id DESC LIMIT 1`,
    [accountId, scope, topic]
  );
  return rows[0] || null;
}

const fail = (message, status, extra = {}) =>
  Response.json({ success: false, message, ...extra }, { status });

const NO_CARDS = () => fail("No cards are available for this reading yet", 404);

function ok(row, { alreadyDrawn = false, redrawn = false, cost = 0, coin = null } = {}) {
  return Response.json({
    success: true,
    card: toReadingCard(row),
    alreadyDrawn,
    redrawn,
    cost,
    coin,
    drawCost: DRAW_COST,
  });
}

export async function handleDraw(scope, topic, { redraw = false } = {}) {
  const accountId = await getSessionAccountId();

  async function visitorDraw() {
    if (redraw) return fail("Please sign in to draw again", 401);
    const row = await pickRandomReading(scope, topic);
    return row ? ok(row) : NO_CARDS();
  }

  if (!accountId) return visitorDraw();

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Serialise draws and spending per account.
    const [locked] = await connection.execute("SELECT id FROM accounts WHERE id = ? FOR UPDATE", [accountId]);
    if (locked.length === 0) {
      // A cookie for a deleted account: treat as a visitor.
      await connection.rollback();
      return visitorDraw();
    }

    const drawn = await findDrawnReading(connection, accountId, scope, topic);

    if (drawn && !redraw) {
      const balance = await getAccountCoins(accountId, connection);
      await connection.commit();
      return ok(drawn, { alreadyDrawn: true, coin: balance?.coin ?? null });
    }

    // Paid redraw only when there is a draw to replace.
    const paying = Boolean(drawn && redraw);

    const row = await pickRandomReading(scope, topic, connection, paying ? drawn.card_id : null);
    if (!row) {
      await connection.rollback();
      return paying ? fail("There is no other card for this reading right now", 409) : NO_CARDS();
    }

    if (paying) {
      const spent = await spendCoins(accountId, DRAW_COST, connection);
      if (!spent.ok) {
        await connection.rollback();
        return fail(`You need ${DRAW_COST} coins to draw again`, 402, { coin: spent.coin, drawCost: DRAW_COST });
      }
    }

    await connection.execute(
      "INSERT INTO draw_history (account_id, scope, topic, card_id) VALUES (?, ?, ?, ?)",
      [accountId, scope, topic, row.card_id]
    );
    const balance = await getAccountCoins(accountId, connection);
    await connection.commit();
    return ok(row, { redrawn: paying, cost: paying ? DRAW_COST : 0, coin: balance?.coin ?? null });
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}
