import db from "@/lib/db";
import { spendCoins } from "@/lib/coin";

const DRAW_COST = 10;

const VALID_PERIODS = ["daily", "weekly", "monthly"];

const VALID_CATEGORIES = [
    "love",
    "finance",
    "career",
    "pets",
    "health"
];

export async function POST(request) {
    try {
        const { accountId, period, category } = await request.json();

        // Check the received data
        if (
            !accountId ||
            !VALID_PERIODS.includes(period) ||
            !VALID_CATEGORIES.includes(category)
        ) {
            return Response.json(
                {
                    success: false,
                    message: "Invalid draw information"
                },
                { status: 400 }
            );
        }

        let dateCondition = "";

        if (period === "daily") {
            dateCondition = `
                draw_date >= CURDATE()
                AND draw_date < CURDATE() + INTERVAL 1 DAY
            `;
        }

        if (period === "weekly") {
            dateCondition = `
                YEARWEEK(draw_date, 1) = YEARWEEK(CURDATE(), 1)
            `;
        }

        if (period === "monthly") {
            dateCondition = `
                YEAR(draw_date) = YEAR(CURDATE())
                AND MONTH(draw_date) = MONTH(CURDATE())
            `;
        }

        const [rows] = await db.execute(
            `SELECT id
             FROM draw_history
             WHERE account_id = ?
             AND period = ?
             AND category = ?
             AND ${dateCondition}
             LIMIT 1`,
            [accountId, period, category]
        );

        // free draw not used
        if (rows.length === 0) {
            await db.execute(
                `INSERT INTO draw_history
                 (account_id, period, category)
                 VALUES (?, ?, ?)`,
                [accountId, period, category]
            );

            return Response.json({
                success: true,
                free: true,
                coinsSpent: 0
            });
        }

        //free draw already used
        const spent = await spendCoins(accountId, DRAW_COST);

        if (!spent) {
            return Response.json(
                {
                    success: false,
                    reason: "NOT_ENOUGH_COINS",
                    message: "Not enough coins"
                },
                { status: 400 }
            );
        }

        // record paid draw
        await db.execute(
            `INSERT INTO draw_history
             (account_id, period, category)
             VALUES (?, ?, ?)`,
            [accountId, period, category]
        );

        return Response.json({
            success: true,
            free: false,
            coinsSpent: DRAW_COST
        });

    } catch (error) {
        console.error("Draw API error:", error);

        return Response.json(
            {
                success: false,
                message: error.message
            },
            { status: 500 }
        );
    }
}