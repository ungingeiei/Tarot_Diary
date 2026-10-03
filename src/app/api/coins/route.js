import db from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return Response.json(
        { success: false, message: "Not signed in" },
        { status: 401 }
      );
    }

    const [rows] = await db.execute(
      "SELECT coin, streak, last_login_date FROM accounts WHERE id = ?",
      [session.accountId]
    );

    if (rows.length === 0) {
      return Response.json(
        { success: false, message: "Account not found" },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      coins: rows[0].coin,
      streak: rows[0].streak,
      lastLoginDate: rows[0].last_login_date,
    });
  } catch (error) {
    console.error("Coins API error:", error);
    return Response.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}