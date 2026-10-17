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
 * Needs the `password_resets` table -> public/database/05_password_resets.sql
 * plus the PIN columns              -> public/database/09_password_reset_pin.sql
 *
 * --- CHANGED: A RESET NOW TAKES TWO PROOFS ---------------------------
 * The token is handed straight back to the browser (nothing is mailed
 * about it), so on its own it proved only that someone had typed a
 * registered email — not that they owned it. Every reset therefore has
 * a second half: a 6-digit PIN, mailed to the account's address
 * (lib/mailer.js). The new-password step is refused until that PIN has
 * been typed back, which is what `verified_at` records.
 *
 *     token  (in the URL)  -> this reset was started in this browser
 *     PIN    (in the inbox)-> this is the mailbox owner
 *
 * Security rules this file follows:
 *   1. The raw token only exists in the /reset-password URL the user is
 *      sent to. The database stores a SHA-256 hash of it. Same for the
 *      PIN: only the hash is stored, so a leaked database gives an
 *      attacker neither.
 *   2. A token expires after 30 minutes and can be used only once.
 *   3. Requesting a new link cancels the older unused links.
 *   4. Expiry is checked with the DATABASE clock (NOW()) so the web
 *      server's timezone can never make a link live too long/short.
 *   5. --- ADDED: five wrong PINs burn the request. A 6-digit PIN is
 *      only a million guesses, which is nothing for a script; the
 *      attempt counter is what makes it strong enough.
 * ---------------------------------------------------------------------
 */

import crypto from "crypto";
import db from "./db";
import { hashPassword } from "./password";

// How long a reset request stays valid — the token and its PIN expire
// together, so there is one deadline to reason about, not two.
const TOKEN_LIFETIME_MINUTES = 30;

// --- ADDED: wrong PINs allowed before the whole request is thrown away.
const MAX_PIN_ATTEMPTS = 5;

export const RESET_LIFETIME_MINUTES = TOKEN_LIFETIME_MINUTES;
export const RESET_MAX_PIN_ATTEMPTS = MAX_PIN_ATTEMPTS;

// Turns a raw token into the value we store/look up in the database.
function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

// --- ADDED: the PIN is hashed the same way. It is short enough that a
// stolen hash could be brute-forced offline in seconds, but it is also
// dead within 30 minutes and single-use, so SHA-256 (not bcrypt) is the
// right trade here — this runs on every attempt.
function hashPin(rawPin) {
  return crypto.createHash("sha256").update(String(rawPin)).digest("hex");
}

/**
 * --- ADDED: a 6-digit PIN as text, e.g. "004271".
 * crypto.randomInt, not Math.random: a predictable PIN is no PIN at all.
 * Leading zeros are kept by padding, so every PIN is exactly 6 digits
 * and the input box can demand that length.
 */
function generatePin() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
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
 * --- CHANGED: was createResetToken(), which returned the token alone.
 * Create a new reset request for an account.
 *
 * Returns BOTH raw secrets, each of which leaves by a different route
 * and is never stored:
 *   token -> handed to the browser, which opens /reset-password?token=...
 *   pin   -> mailed to the account's address by the calling route
 *
 * There is no "once per minute" limit here; the route rate-limits by
 * email and IP instead (and a new request cancels the previous one, so
 * pressing the button twice cannot leave two usable PINs behind).
 */
export async function createResetRequest(accountId) {
  // Cancel older requests that were never used — only the newest works.
  await db.execute(
    "UPDATE password_resets SET used_at = NOW() WHERE account_id = ? AND used_at IS NULL",
    [accountId]
  );

  // 32 random bytes = 64 hex characters, impossible to guess.
  const rawToken = crypto.randomBytes(32).toString("hex");
  const rawPin = generatePin();

  await db.execute(
    `INSERT INTO password_resets (account_id, token_hash, pin_hash, expires_at)
     VALUES (?, ?, ?, NOW() + INTERVAL ? MINUTE)`,
    [accountId, hashToken(rawToken), hashPin(rawPin), TOKEN_LIFETIME_MINUTES]
  );

  return { token: rawToken, pin: rawPin };
}

/**
 * Check a raw token from the reset URL.
 *
 * --- CHANGED: also reports how far the request has got, so the page
 * knows which step to draw, and returns the account's email so it can
 * show (masked) where the PIN went.
 *
 * Returns null unless the token exists, is unused and is not expired.
 * Otherwise { id, accountId, email, verified, attemptsLeft }:
 *   verified     - false = still needs the PIN, true = PIN accepted
 *   attemptsLeft - wrong PINs still allowed before the request dies
 */
export async function findValidResetToken(rawToken) {
  // A real token is always 64 hex characters — reject anything else
  // early without touching the database.
  if (typeof rawToken !== "string" || !/^[a-f0-9]{64}$/.test(rawToken)) {
    return null;
  }

  const [rows] = await db.execute(
    `SELECT r.id, r.account_id, r.verified_at, r.pin_attempts, a.email
       FROM password_resets r
       JOIN accounts a ON a.id = r.account_id
      WHERE r.token_hash = ?
        AND r.used_at IS NULL
        AND r.expires_at > NOW()
      LIMIT 1`,
    [hashToken(rawToken)]
  );

  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id,
    accountId: row.account_id,
    email: row.email,
    verified: row.verified_at !== null,
    attemptsLeft: Math.max(0, MAX_PIN_ATTEMPTS - row.pin_attempts),
  };
}

/**
 * --- ADDED: step 2 of the reset — type back the PIN from the email.
 *
 * On the right PIN the request is marked verified and the new-password
 * form is unlocked. On a wrong one the attempt is counted, and the fifth
 * wrong try marks the whole request used: the user must start again from
 * /forgot-password, which also means a new PIN is mailed.
 *
 * @returns {Promise<{ ok: boolean, reason?: "invalid-token" | "wrong-pin" | "locked",
 *                     attemptsLeft: number }>}
 */
export async function verifyResetPin(rawToken, rawPin) {
  const reset = await findValidResetToken(rawToken);
  if (!reset) return { ok: false, reason: "invalid-token", attemptsLeft: 0 };

  // Already verified: let the user carry on rather than make them type
  // the PIN again after, say, a page reload.
  if (reset.verified) return { ok: true, attemptsLeft: reset.attemptsLeft };

  const pin = typeof rawPin === "string" ? rawPin.trim() : "";

  // Shape first, so a blank box or a pasted word costs no attempt.
  if (!/^[0-9]{6}$/.test(pin)) {
    return { ok: false, reason: "wrong-pin", attemptsLeft: reset.attemptsLeft };
  }

  // The comparison happens in SQL on the hash, and the UPDATE is what
  // decides: if the hash matches, exactly this one row is stamped
  // verified. `verified_at IS NULL` keeps two simultaneous requests from
  // both counting as the first.
  const [matched] = await db.execute(
    `UPDATE password_resets
        SET verified_at = NOW(), pin_attempts = 0
      WHERE id = ? AND pin_hash = ? AND used_at IS NULL
        AND verified_at IS NULL AND expires_at > NOW()`,
    [reset.id, hashPin(pin)]
  );

  if (matched.affectedRows === 1) {
    return { ok: true, attemptsLeft: MAX_PIN_ATTEMPTS };
  }

  // Wrong PIN: count it, and burn the request if that was the last try.
  await db.execute(
    "UPDATE password_resets SET pin_attempts = pin_attempts + 1 WHERE id = ?",
    [reset.id]
  );

  const attemptsLeft = reset.attemptsLeft - 1;
  if (attemptsLeft <= 0) {
    await db.execute(
      "UPDATE password_resets SET used_at = NOW() WHERE id = ? AND used_at IS NULL",
      [reset.id]
    );
    return { ok: false, reason: "locked", attemptsLeft: 0 };
  }

  return { ok: false, reason: "wrong-pin", attemptsLeft };
}

/**
 * Set a new password using a reset token.
 *
 * --- CHANGED: the token alone is no longer enough. The request must
 * also carry verified_at, i.e. the PIN from the email was typed back.
 * Without that check the PIN would be a formality the browser could
 * simply skip by POSTing here directly.
 *
 * @returns {Promise<{ ok: boolean, reason?: "invalid-token" | "not-verified" }>}
 *
 * Runs inside a transaction so the password change and "token used"
 * mark happen together — or not at all.
 */
export async function resetPasswordWithToken(rawToken, newPassword) {
  const reset = await findValidResetToken(rawToken);
  if (!reset) return { ok: false, reason: "invalid-token" };
  if (!reset.verified) return { ok: false, reason: "not-verified" };

  const newHash = await hashPassword(newPassword);

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Claim the token. The "used_at IS NULL" check means that if two
    // requests arrive at the same moment, only one can win. The
    // "verified_at IS NOT NULL" check is the PIN gate again, re-tested
    // inside the transaction so it cannot be raced either.
    const [claimed] = await connection.execute(
      `UPDATE password_resets SET used_at = NOW()
       WHERE id = ? AND used_at IS NULL AND verified_at IS NOT NULL
         AND expires_at > NOW()`,
      [reset.id]
    );
    if (claimed.affectedRows === 0) {
      await connection.rollback();
      return { ok: false, reason: "invalid-token" };
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
    return { ok: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    // Always give the connection back to the pool.
    connection.release();
  }
}

/**
 * --- ADDED: "a••••@gmail.com" — enough for the user to recognise their
 * own address and know which inbox to open, without printing the whole
 * thing on a page anyone holding the link can load.
 */
export function maskEmail(email) {
  if (typeof email !== "string" || !email.includes("@")) return "";
  const [local, domain] = email.split("@");
  const head = local.slice(0, 1);
  return `${head}${"•".repeat(Math.max(1, local.length - 1))}@${domain}`;
}
