import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { nextStreakDay } from "@/lib/coin";

// Replaces lib/auth.js's isSignedIn()/getCurrentUser(), which currently
// read a localStorage flag. Client components should fetch this
// instead. See the accompanying note on lib/auth.js for the client-side
// change needed to call this route.

export async function GET() {
  const session = await getSession();

  if (!session) {
    return Response.json({ success: false, user: null }, { status: 401 });
  }

  // `claimed_today` is worked out by MySQL rather than by comparing
  // dates in JS: CURDATE() and last_login_date are both in the database
  // server's timezone, so they agree with the identical check inside
  // lib/coin.js. Reading the raw date and comparing it here would be a
  // different clock, and the two could disagree around midnight.
  // COALESCE covers an account that has never checked in, where the
  // comparison is NULL rather than 0.
  const [rows] = await db.execute(
    `SELECT id, f_name, email, role, coin, streak,
            COALESCE(last_login_date = CURDATE(), 0) AS claimed_today,
            COALESCE(
              last_login_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY), 0
            ) AS claimed_yesterday
       FROM accounts
      WHERE id = ?
      LIMIT 1`,
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
      // Read by components/CheckInReward.jsx. `streak` is how many days
      // are already banked; `checkinDay` is the card to highlight — the
      // day just claimed if today is done, otherwise the day today's
      // COLLECT would award. Those differ: on day 4 of a streak, before
      // collecting, `streak` is still 3.
      streak: account.streak,
      claimedToday: Boolean(account.claimed_today),
      checkinDay: account.claimed_today
        ? account.streak
        : nextStreakDay({
            streak: account.streak,
            claimedYesterday: account.claimed_yesterday,
          }),
    },
  });
}