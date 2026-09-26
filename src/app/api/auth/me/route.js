import db from "@/lib/db";
import { getSession } from "@/lib/session";

// Replaces lib/auth.js's isSignedIn()/getCurrentUser(), which currently
// read a localStorage flag. Client components should fetch this
// instead. See the accompanying note on lib/auth.js for the client-side
// change needed to call this route.

export async function GET() {
  const session = await getSession();

  if (!session) {
    return Response.json({ success: false, user: null }, { status: 401 });
  }

  const [rows] = await db.execute(
    "SELECT id, f_name, email, role, coin FROM accounts WHERE id = ? LIMIT 1",
    [session.accountId]
  );

  if (rows.length === 0) {
    return Response.json({ success: false, user: null }, { status: 401 });
  }

  const account = rows[0];
  return Response.json({
    success: true,
    user: {
      id: account.id,
      name: account.f_name,
      email: account.email,
      role: account.role,
      coins: account.coin,
    },
  });
}