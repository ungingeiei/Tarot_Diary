/**
 * ---------------------------------------------------------------------
 * lib/passwordReset.js — DATABASE LAYER FOR "FORGOT PASSWORD"
 * ---------------------------------------------------------------------
 * This file is the bridge between the API routes and the database.
 * The routes (app/api/auth/forgot-password and reset-password) stay
 * small and only call the functions below; every SQL query for the
 * reset flow lives here.
 *
 * It uses the shared MySQL connection pool from lib/db.js, so no new
 * connection settings are needed (DB_HOST, DB_USER, DB_PASSWORD and
 * DB_NAME in .env.local are enough).
 *
 * Needs the `password_resets` table -> public/database/password_resets.sql
 *
 * Security rules this file follows:
 *   1. The raw token only exists in the emailed link. The database
 *      stores a SHA-256 hash of it.
 *   2. A token expires after 30 minutes and can be used only once.
 *   3. Requesting a new link cancels the older unused links.
 *   4. Expiry is checked with the DATABASE clock (NOW()) so the web
 *      server's timezone can never make a link live too long/short.
 *   5. Besides the link, every request also gets a 6-digit CODE (stored
 *      as a hash, 5 tries, then it is burned). The reset-password page
 *      uses it so the user can finish without clicking the emailed link.
 *      Needs public/database/password_reset_code.sql
 * ---------------------------------------------------------------------
 */

import crypto from "crypto";
import db from "./db";
import { hashPassword } from "./password";

// How long a reset link stays valid.
const TOKEN_LIFETIME_MINUTES = 30;

// Minimum seconds between two reset emails for the same account.
// Stops someone from spamming a user's inbox.
const MIN_SECONDS_BETWEEN_REQUESTS = 60;

// How many times one emailed code may be tried before it is burned.
const MAX_CODE_ATTEMPTS = 5;

// How many wrong tries ALL codes of one account may have in the last 30 minutes.
// Without this, someone could ask for a new code every minute and get 5 fresh guesses each time.
const MAX_CODE_ATTEMPTS_PER_ACCOUNT = 10;

// Turns a 6-digit code into the value stored in the database. The account id is mixed in,
// so the same code on two accounts gives two different hashes.
function hashCode(accountId, code) {
  return crypto.createHash("sha256").update(`${accountId}:${code}`).digest("hex");
}

// Turns a raw token into the value we store/look up in the database.
function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Find an account by email.
 * Returns { id, f_name, email } or null if the email is not registered.
 */
export async function findAccountByEmail(email) {
  const [rows] = await db.execute(
    "SELECT id, f_name, email FROM accounts WHERE email = ? LIMIT 1",
    [email]
  );
  return rows[0] || null;
}

/**
 * Create a new reset token AND a 6-digit code for an account.
 *
 * Returns { token, code } (the token goes in the emailed link, the code is
 * typed on the reset-password page), or null when the account asked for a
 * link too recently (rate limit) — in that case the caller should simply
 * not send another email.
 */
export async function createResetToken(accountId) {
  // Rate limit: was a link already created in the last minute?
  const [recent] = await db.execute(
    `SELECT id FROM password_resets
     WHERE account_id = ?
       AND created_at > (NOW() - INTERVAL ? SECOND)
     LIMIT 1`,
    [accountId, MIN_SECONDS_BETWEEN_REQUESTS]
  );
  if (recent.length > 0) return null;

  // Cancel older links that were never used — only the newest works.
  await db.execute(
    "UPDATE password_resets SET used_at = NOW() WHERE account_id = ? AND used_at IS NULL",
    [accountId]
  );

  // 32 random bytes = 64 hex characters, impossible to guess.
  const rawToken = crypto.randomBytes(32).toString("hex");

  // 6-digit code from a secure random source, padded so "42" becomes "000042".
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");

  await db.execute(
    `INSERT INTO password_resets (account_id, token_hash, code_hash, expires_at)
     VALUES (?, ?, ?, NOW() + INTERVAL ? MINUTE)`,
    [accountId, hashToken(rawToken), hashCode(accountId, code), TOKEN_LIFETIME_MINUTES]
  );

  return { token: rawToken, code };
}

/**
 * Check a raw token from the emailed link.
 * Returns { id, accountId } if it is valid (exists, unused, not
 * expired), otherwise null.
 */
export async function findValidResetToken(rawToken) {
  // A real token is always 64 hex characters — reject anything else
  // early without touching the database.
  if (typeof rawToken !== "string" || !/^[a-f0-9]{64}$/.test(rawToken)) {
    return null;
  }

  const [rows] = await db.execute(
    `SELECT id, account_id FROM password_resets
     WHERE token_hash = ?
       AND used_at IS NULL
       AND expires_at > NOW()
     LIMIT 1`,
    [hashToken(rawToken)]
  );

  if (rows.length === 0) return null;
  return { id: rows[0].id, accountId: rows[0].account_id };
}

/**
 * Set a new password using a reset token.
 * Returns true on success, false if the token is invalid/expired/used.
 *
 * Runs inside a transaction so the password change and "token used"
 * mark happen together — or not at all.
 */
export async function resetPasswordWithToken(rawToken, newPassword) {
  const reset = await findValidResetToken(rawToken);
  if (!reset) return false;

  const newHash = await hashPassword(newPassword);

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Claim the token. The "used_at IS NULL" check means that if two
    // requests arrive at the same moment, only one can win.
    const [claimed] = await connection.execute(
      `UPDATE password_resets SET used_at = NOW()
       WHERE id = ? AND used_at IS NULL AND expires_at > NOW()`,
      [reset.id]
    );
    if (claimed.affectedRows === 0) {
      await connection.rollback();
      return false;
    }

    // Save the new (hashed) password.
    await connection.execute("UPDATE accounts SET pwd = ? WHERE id = ?", [
      newHash,
      reset.accountId,
    ]);

    // Any other unused links for this account are now pointless.
    await connection.execute(
      "UPDATE password_resets SET used_at = NOW() WHERE account_id = ? AND used_at IS NULL",
      [reset.accountId]
    );

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    // Always give the connection back to the pool.
    connection.release();
  }
}

/**
 * Set a new password using the 6-digit code from the email.
 * Returns true on success, false for ANY failure (unknown email, wrong code,
 * expired, already used, too many tries). One answer for all of them, so the
 * response never tells an attacker whether an email is registered.
 */
export async function resetPasswordWithCode(email, code, newPassword) {
  // A real code is exactly 6 digits.
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) return false;

  const account = await findAccountByEmail(email);
  if (!account) return false;

  // Account-wide cap: add up the tries of every code made in the last 30 minutes.
  // This counts in the database (not in memory), so a changed IP address cannot get around it.
  const [[recent]] = await db.execute(
    `SELECT COALESCE(SUM(attempts), 0) AS tries FROM password_resets
     WHERE account_id = ?
       AND code_hash IS NOT NULL
       AND created_at > (NOW() - INTERVAL ? MINUTE)`,
    [account.id, TOKEN_LIFETIME_MINUTES]
  );
  if (Number(recent.tries) >= MAX_CODE_ATTEMPTS_PER_ACCOUNT) return false;

  // The newest unused, unexpired request that has a code.
  const [rows] = await db.execute(
    `SELECT id, code_hash FROM password_resets
     WHERE account_id = ?
       AND code_hash IS NOT NULL
       AND used_at IS NULL
       AND expires_at > NOW()
     ORDER BY id DESC
     LIMIT 1`,
    [account.id]
  );
  if (rows.length === 0) return false;
  const reset = rows[0];

  // Spend one attempt BEFORE comparing. Because this single UPDATE is atomic,
  // even 100 requests sent at the same moment can only try 5 codes in total.
  const [spent] = await db.execute(
    `UPDATE password_resets SET attempts = attempts + 1
     WHERE id = ? AND used_at IS NULL AND expires_at > NOW() AND attempts < ?`,
    [reset.id, MAX_CODE_ATTEMPTS]
  );
  if (spent.affectedRows === 0) return false;

  // Compare the hashes without leaking, through timing, how many characters matched.
  const given = Buffer.from(hashCode(account.id, code), "hex");
  const stored = Buffer.from(reset.code_hash, "hex");
  if (given.length !== stored.length || !crypto.timingSafeEqual(given, stored)) {
    return false;
  }

  // Correct code: same transaction as the link flow (password + "used" together).
  const newHash = await hashPassword(newPassword);
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [claimed] = await connection.execute(
      `UPDATE password_resets SET used_at = NOW()
       WHERE id = ? AND used_at IS NULL AND expires_at > NOW()`,
      [reset.id]
    );
    if (claimed.affectedRows === 0) {
      await connection.rollback();
      return false;
    }

    await connection.execute("UPDATE accounts SET pwd = ? WHERE id = ?", [
      newHash,
      account.id,
    ]);

    // Other unused links/codes for this account are now pointless.
    await connection.execute(
      "UPDATE password_resets SET used_at = NOW() WHERE account_id = ? AND used_at IS NULL",
      [account.id]
    );

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
