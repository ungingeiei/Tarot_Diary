import db from "@/lib/db";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const accountId = searchParams.get("accountId");

        if (!accountId) {
            return Response.json(
                {
                    success: false,
                    message: "Account ID is required"
                },
                { status: 400 }
            );
        }

        const [rows] = await db.execute(
            "SELECT coin FROM accounts WHERE id = ?",
            [accountId]
        );

        if (rows.length === 0) {
            return Response.json(
                {
                    success: false,
                    message: "Account not found"
                },
                { status: 404 }
            );
        }

        return Response.json({
            success: true,
            coins: rows[0].coin
        });

    } catch (error) {
        console.error("Coins API error:", error);

        return Response.json(
            {
                success: false,
                message: "Something went wrong"
            },
            { status: 500 }
        );
    }
}