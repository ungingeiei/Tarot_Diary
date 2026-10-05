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

export async function collectCheckinReward(accountId) {
    // Check current account information first
    const [rows] = await db.execute(
        `SELECT
        coin,
        streak,
        last_login_date,
        last_login_date = CURDATE() AS claimed_today
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

    // Calculate streak
    let newStreak = 1;

    if (account.last_login_date) {
        const lastLogin = new Date(account.last_login_date);
        const today = new Date();

        const lastDate = new Date(
            lastLogin.getFullYear(),
            lastLogin.getMonth(),
            lastLogin.getDate()
        );

        const todayDate = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
        );

        const difference =
            (todayDate - lastDate) / (1000 * 60 * 60 * 24);

        if (difference === 1) {
            newStreak = account.streak + 1;
        } else {
            newStreak = 1;
        }
    }

    // After Day 8, start again from Day 1
    if (newStreak > 8) {
        newStreak = 1;
    }

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