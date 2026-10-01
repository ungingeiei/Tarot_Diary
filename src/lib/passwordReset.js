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
 * Create a new reset token for an account.
 *
 * Returns the RAW token (to put in the emailed link), or null when the
 * account asked for a link too recently (rate limit) — in that case the
 * caller should simply not send another email.
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

  await db.execute(
    `INSERT INTO password_resets (account_id, token_hash, expires_at)
     VALUES (?, ?, NOW() + INTERVAL ? MINUTE)`,
    [accountId, hashToken(rawToken), TOKEN_LIFETIME_MINUTES]
  );

  return rawToken;
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
