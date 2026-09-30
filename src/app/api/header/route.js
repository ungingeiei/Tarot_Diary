import db from "@/lib/db";
import { getSession } from "@/lib/session";

// CHANGED: previously read `accountId` from the query string
// (?accountId=1), meaning any client could ask for any account's coin
// balance. Now reads the account from the signed session cookie —
// see lib/session.js.

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      // Not signed in. Header.jsx treats this as "just show 0 coins",
      // not an error — AppHeader renders on pages a guest can visit.
      return Response.json(
        { success: false, message: "Not signed in" },
        { status: 401 }
      );
    }

    const [rows] = await db.execute(
      "SELECT coin FROM accounts WHERE id = ?",
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
    });
  } catch (error) {
    console.error("Coins API error:", error);
    return Response.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}