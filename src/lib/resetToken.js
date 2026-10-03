// ==== Middle ware for restricting from modify path ====
// resetToken.js — creates and checks the "reset token" that lets a user open /reset-password.
// The token is a signed JWT made by the server, so nobody can invent one by editing the URL.
//
// STATUS: switched OFF (commented out) while we check every page in development.
// To turn it ON: delete the two lines that say "DELETE THIS LINE TO TURN ON"
// (the first starts with /*, the last ends with */). See the full checklist in src/proxy.js.

/* ---- DELETE THIS LINE TO TURN ON ----
import jwt from "jsonwebtoken";

// Use a DIFFERENT secret from the login cookie. If both shared one secret, a reset token
// could be pasted into the login cookie and be accepted as a real login.
const RESET_SECRET = process.env.JWT_SECRET
  ? `${process.env.JWT_SECRET}:password-reset`
  : null;

// The link stops working after 15 minutes.
const RESET_MAX_AGE_SECONDS = 15 * 60;

// Called by the forgot-password API to make a token for one account.
export function createResetJwt(accountId) {
  if (!RESET_SECRET) throw new Error("JWT_SECRET is not set");
  return jwt.sign({ purpose: "password-reset", accountId }, RESET_SECRET, {
    expiresIn: RESET_MAX_AGE_SECONDS,
  });
}

// Called by proxy.js. Returns the token data if it is real and not expired, otherwise null.
export function verifyResetJwt(token) {
  if (!RESET_SECRET || !token) return null;
  try {
    const data = jwt.verify(token, RESET_SECRET);
    return data.purpose === "password-reset" ? data : null;
  } catch {
    return null; // fake, edited, or expired
  }
}
// ---- DELETE THIS LINE TO TURN ON ---- */
