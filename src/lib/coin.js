/**
 * ---------------------------------------------------------------------
 * lib/coins.js — coin balance, paying for a draw, and the login streak
 * ---------------------------------------------------------------------
 * Every change is ONE atomic SQL statement, so two requests arriving at
 * the same moment can never spend the same coins twice or overdraw.
 * ---------------------------------------------------------------------
 */

import db from "@/lib/db";

// Coins a paid redraw costs (a new card inside a window you already drew in). Override with DRAW_COST in .env.local.
const configured = Number.parseInt(process.env.DRAW_COST, 10);
export const DRAW_COST = Number.isInteger(configured) && configured >= 0 ? configured : 10;

export async function getAccountCoins(accountId, executor = db) {
  const [rows] = await executor.execute(
    "SELECT coin, streak FROM accounts WHERE id = ? LIMIT 1",
    [accountId]
  );
  return rows[0] || null;
}

/**
 * Takes `amount` coins, only if the balance covers it.
 * Returns { ok: true, coin } or { ok: false, reason, coin } where reason is
 * "insufficient" or "no_account".
 */
export async function spendCoins(accountId, amount, executor = db) {
  if (amount > 0) {
    const [result] = await executor.execute(
      "UPDATE accounts SET coin = coin - ? WHERE id = ? AND coin >= ?",
      [amount, accountId, amount]
    );
    if (result.affectedRows === 0) {
      const row = await getAccountCoins(accountId, executor);
      return {
        ok: false,
        reason: row ? "insufficient" : "no_account",
        coin: row?.coin ?? 0,
      };
    }
  }
  const row = await getAccountCoins(accountId, executor);
  return row
    ? { ok: true, coin: row.coin }
    : { ok: false, reason: "no_account", coin: 0 };
}


// Daily login rewards
const DAILY_REWARDS = {
    1: 10,
    2: 10,
    3: 15,
    4: 15,
    5: 20,
    6: 20,
    7: 30,
    8: 50,
};

export const MAX_STREAK_DAY = 8;

/**
 * Which day of the streak a check-in made RIGHT NOW would award.
 *
 * Both callers (collectCheckinReward below, and /api/auth/me, which
 * needs it only to highlight the right card) go through this, so the
 * reward the modal promises and the one the server pays out cannot
 * drift apart.
 *
 * `claimedYesterday` is computed by MySQL, not from a JS Date: the
 * "was it yesterday?" test has to use the same clock as the
 * `claimed_today` test next to it, or the two disagree whenever the
 * database server and Node are in different timezones.
 */
export function nextStreakDay({ streak, claimedYesterday }) {
    if (!claimedYesterday) return 1; // first ever, or the streak lapsed
    const next = Number(streak) + 1;
    return next > MAX_STREAK_DAY ? 1 : next; // past day 8, start over
}

export async function collectCheckinReward(accountId) {
    // Check current account information first
    const [rows] = await db.execute(
        `SELECT
        coin,
        streak,
        last_login_date,
        last_login_date = CURDATE() AS claimed_today,
        last_login_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY) AS claimed_yesterday
     FROM accounts
     WHERE id = ?
     LIMIT 1`,
        [accountId]
    );

    if (rows.length === 0) {
        return {
            ok: false,
            reason: "no_account",
            coin: 0,
            streak: 0,
        };
    }

    const account = rows[0];

    // Already collected today
    if (account.claimed_today) {
        return {
            ok: false,
            reason: "already_claimed",
            coin: account.coin,
            streak: account.streak,
            reward: 0,
        };
    }

    // Calculate streak. The day-difference used to be worked out from JS
    // Dates here while `claimed_today` above came from MySQL — two
    // different clocks deciding what "today" means. Both flags now come
    // from the same SELECT.
    const newStreak = nextStreakDay({
        streak: account.streak,
        claimedYesterday: account.claimed_yesterday,
    });

    const reward = DAILY_REWARDS[newStreak];

    // Add reward and update login information
    await db.execute(
        `UPDATE accounts
     SET coin = coin + ?,
         streak = ?,
         last_login_date = CURDATE()
     WHERE id = ?`,
        [reward, newStreak, accountId]
    );

    const updated = await getAccountCoins(accountId);

    return {
        ok: true,
        coin: updated?.coin ?? 0,
        streak: updated?.streak ?? newStreak,
        reward,
    };
}