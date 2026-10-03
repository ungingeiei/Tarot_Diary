/**
 * ---------------------------------------------------------------------
 * lib/apiAuth.js — "who is calling this API?" for every protected route
 * ---------------------------------------------------------------------
 * The session cookie (lib/session.js) only proves WHICH account is
 * calling. The account row is re-read from the database on every request,
 * so a deleted account or a changed role takes effect immediately instead
 * of waiting for the JWT to expire. `role` is never trusted from the token.
 *
 * Usage in a route:
 *     const auth = await requireUser();      // or requireAdmin()
 *     if (auth.error) return auth.error;     // ready-made 401 / 403
 *     const { account } = auth;
 * ---------------------------------------------------------------------
 */

import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { validatePassword } from "@/lib/validators/password";

const ACCOUNT_COLUMNS = `
  id, f_name, l_name, email, phone,
  DATE_FORMAT(dob, '%Y-%m-%d') AS dob,
  zodiac, role, coin, streak,
  (pwd IS NOT NULL)        AS has_password`;

/** The signed-in account id from the session cookie, or null. */
export async function getSessionAccountId() {
  let session = null;
  try {
    session = await getSession();
  } catch {
    return null; // bad / expired cookie = signed out
  }
  const id = Number(session?.accountId ?? session?.id ?? session?.user?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function getCurrentAccount() {
  const id = await getSessionAccountId();
  if (!id) return null;
  const [rows] = await db.execute(
    `SELECT ${ACCOUNT_COLUMNS} FROM accounts WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function requireUser() {
  const account = await getCurrentAccount();
  if (!account) return { error: Response.json({ success: false, message: "Please sign in first" }, { status: 401 }) };
  return { account };
}

export async function requireAdmin() {
  const auth = await requireUser();
  if (auth.error) return auth;
  if (auth.account.role !== "admin") {
    return { error: Response.json({ success: false, message: "Admin access only" }, { status: 403 }) };
  }
  return auth;
}

/** The shape sent to the browser — never includes pwd / google_sub. */
export function publicUser(account) {
  const fName = account.f_name || "";
  const lName = account.l_name || "";
  return {
    id: account.id,
    name: fName, // short name, what the header / greeting shows
    fName,
    lName,
    fullName: [fName, lName].filter(Boolean).join(" "),
    email: account.email,
    phone: account.phone || "",
    dob: account.dob || "",
    zodiac: account.zodiac || "",
    role: account.role,
    coin: account.coin,
    streak: account.streak,
    hasPassword: Boolean(account.has_password),
    hasGoogle: Boolean(account.has_google),
  };
}

/**
 * ONE password policy for register AND reset-password:
 * the rules in lib/validators/password.js, plus bcrypt's 72-byte limit
 * (bcrypt silently ignores everything after byte 72).
 * Returns a list of problems; empty = acceptable.
 */
export function passwordProblems(password) {
  const { errors } = validatePassword(password);
  const problems = [...errors];
  if (typeof password === "string" && Buffer.byteLength(password, "utf8") > 72) {
    problems.push("Password must be 72 bytes or fewer.");
  }
  return problems;
}
