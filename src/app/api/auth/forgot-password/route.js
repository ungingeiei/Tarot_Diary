/**
 * ---------------------------------------------------------------------
 * POST /api/auth/forgot-password
 * ---------------------------------------------------------------------
 * Called by app/forgot-password/page.jsx (the GO TO RESET PASSWORD button).
 *
 * Body:     { email }
 * Response: { success: true, token }          -> the email is registered
 *           { success: false, message } (404)  -> no account with that email
 *
 * What it does:
 *   1. Looks the email up in the `accounts` table (via lib/passwordReset).
 *   2. If the account exists, creates a one-time reset token in the
 *      database and sends it back in the response. The page then opens
 *      /reset-password?token=... straight away.
 *
 * NO EMAIL IS SENT and NO CODE IS ASKED. Many emails used to register are
 * not real mailboxes, so a normal "check your inbox" flow cannot work for
 * them. The trade-off: anyone who knows a registered email can set a new
 * password for it. Fine for testing; add an email/code check before real use.
 *
 * Because the token is handed straight back, every REQUEST is counted, not
 * just the ones that fail: a success is exactly what an attacker wants, so
 * counting failures only — the way /api/auth/login does — would leave this
 * route unlimited for the one case that matters. Three tries per email and
 * ten per IP in fifteen minutes still leaves room for someone who mistypes
 * their own address, while a script walking a list of emails is stopped.
 * It does NOT make the flow safe, only slow; the email check above is what
 * would.
 *
 * Needs no SMTP_* or APP_URL settings any more.
 * ---------------------------------------------------------------------
 */

import { findAccountByEmail, createResetToken } from "@/lib/passwordReset";
import { checkRateLimit, getClientIp, recordFailure } from "@/lib/rateLimit";

const WINDOW_MS = 15 * 60 * 1000; // counting window: 15 minutes
const MAX_PER_EMAIL = 3; // reset tokens one email may be handed in that window
const MAX_PER_IP = 10; // reset tokens one IP may ask for, across all emails

export async function POST(request) {
  try {
    // Read and clean the email from the request body.
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    // Basic format check.
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return Response.json(
        { success: false, message: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // The email counter is NOT scoped to the IP the way login's is: whoever
    // is after this account only needs the address, and can ask from
    // anywhere. Both counters are read before the account lookup, so a
    // blocked caller cannot use this route to probe which emails exist.
    const ip = getClientIp(request);
    const emailKey = `forgot:email:${email}`;
    const ipKey = `forgot:ip:${ip}`;
    const emailRule = { max: MAX_PER_EMAIL, windowMs: WINDOW_MS };
    const ipRule = { max: MAX_PER_IP, windowMs: WINDOW_MS };

    const emailLimit = checkRateLimit(emailKey, emailRule);
    const ipLimit = checkRateLimit(ipKey, ipRule);
    if (!emailLimit.allowed || !ipLimit.allowed) {
      const retryAfter = Math.max(
        emailLimit.retryAfterSeconds,
        ipLimit.retryAfterSeconds
      );
      return Response.json(
        {
          success: false,
          message: `Too many password reset requests. Please try again in ${Math.ceil(
            retryAfter / 60
          )} minute(s).`,
        },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    // Counted here, before the lookup: a wrong address and a right one must
    // cost the caller the same, or the counter itself says which is which.
    recordFailure(emailKey, emailRule);
    recordFailure(ipKey, ipRule);

    // Is this email registered? If not, tell the user so they can fix a typo.
    const account = await findAccountByEmail(email);
    if (!account) {
      return Response.json(
        { success: false, message: "We couldn't find an account with that email" },
        { status: 404 }
      );
    }

    // Make the one-time token (valid 30 minutes) and hand it to the page.
    const token = await createResetToken(account.id);

    // Safety net: a real token is exactly 64 hex characters. Anything else means an OLD
    // src/lib/passwordReset.js is still in the project (it returned an object, not text),
    // which would make the reset page open with a broken address. The terminal shows this message.
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
      throw new Error(
        "createResetToken() did not return a 64-character token. Replace src/lib/passwordReset.js with the new version."
      );
    }

    return Response.json({ success: true, token });
  } catch (error) {
    console.error("Forgot password API error:", error);
    return Response.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
