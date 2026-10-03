/**
 * POST /api/draw — draw a card.
 *
 * Body: { period } or { category } — one reading, one topic.
 *
 * The first draw of each topic inside its window is free; every draw
 * after that costs coins. The card is CHOSEN HERE, in the same request
 * that takes payment, and written into `draw_history`. /api/cards then
 * replays that row.
 *
 * Previously the charge and the card were separate: this route billed
 * for a reading, and the reading page asked /api/cards for a card of its
 * own, which was free and unlimited. Opening /reading directly, or just
 * refreshing it, handed out as many readings as you liked.
 */

import db from "@/lib/db";
import { spendCoins, DRAW_COST } from "@/lib/coin";
import { getSession } from "@/lib/session";
import {
    pickCard,
    resolveTopic,
    shapeCard,
    windowCondition,
} from "@/lib/reading";

export async function POST(request) {
    try {
        // The account comes from the signed-in session. It used to be read
        // out of the request body, which let anyone POST someone else's id
        // and draw on their account, spending their coins.
        const session = await getSession();
        if (!session) {
            return Response.json(
                { success: false, message: "Not signed in" },
                { status: 401 }
            );
        }
        const accountId = session.accountId;

        const body = await request.json().catch(() => ({}));
        const resolved = resolveTopic(body);

        if (!resolved) {
            return Response.json(
                { success: false, message: "Invalid draw information" },
                { status: 400 }
            );
        }
        const { scope, topic } = resolved;

        const [used] = await db.execute(
            `SELECT id FROM draw_history
              WHERE account_id = ? AND scope = ? AND topic = ?
                AND ${windowCondition(scope, topic)}
              LIMIT 1`,
            [accountId, scope, topic]
        );

        const free = used.length === 0;
        let coin = null;

        if (!free) {
            const spent = await spendCoins(accountId, DRAW_COST);

            // spendCoins returns an OBJECT, { ok, reason, coin }. The test
            // used to be `if (!spent)`, and an object is always truthy — so
            // a failed payment read as a success and the draw went through
            // free, recorded as if it had been paid for.
            if (!spent.ok) {
                return Response.json(
                    {
                        success: false,
                        reason: "NOT_ENOUGH_COINS",
                        message: "Not enough coins",
                        coin: spent.coin,
                    },
                    { status: 400 }
                );
            }
            coin = spent.coin;
        }

        const card = await pickCard(scope, topic);
        if (!card) {
            // No deck seeded. Nothing was charged for a free draw; a paid
            // one is refunded rather than taking coins for no reading.
            if (!free) {
                await db.execute(
                    "UPDATE accounts SET coin = coin + ? WHERE id = ?",
                    [DRAW_COST, accountId]
                );
            }
            return Response.json(
                { success: false, message: "No cards are available yet" },
                { status: 503 }
            );
        }

        await db.execute(
            `INSERT INTO draw_history (account_id, scope, topic, card_id)
             VALUES (?, ?, ?, ?)`,
            [accountId, scope, topic, card.id]
        );

        return Response.json({
            success: true,
            free,
            coinsSpent: free ? 0 : DRAW_COST,
            coin,
            card: shapeCard(card, resolved),
        });
    } catch (error) {
        console.error("Draw API error:", error);
        return Response.json(
            { success: false, message: "Something went wrong" },
            { status: 500 }
        );
    }
}
