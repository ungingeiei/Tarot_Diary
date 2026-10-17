/**
 * ---------------------------------------------------------------------
 * POST /api/auth/forgot-password
 * ---------------------------------------------------------------------
 * Called by app/forgot-password/page.jsx (the GO TO RESET PASSWORD button).
 *
 * Body:     { email }
 * Response: { success: true, token, delivery, maskedEmail, minutes }
 *                                              -> the email is registered
 *           { success: false, message } (404)   -> no account with that email
 *           { success: false, message } (502)   -> the PIN could not be mailed
 *
 * What it does:
 *   1. Looks the email up in the `accounts` table (via lib/passwordReset).
 *   2. If the account exists, creates a one-time reset request: a token
 *      AND a 6-digit PIN.
 *   3. Mails the PIN to that address (lib/mailer.js) and returns the
 *      token, so the page can open /reset-password?token=... at once.
 *
 * --- CHANGED: THE TOKEN IS NO LONGER THE WHOLE RESET -----------------
 * This route used to hand back a token that was, by itself, permission
 * to set a new password — so anyone who knew a registered email could
 * take over that account. It now also mails a PIN, and
 * /api/auth/reset-password refuses to save anything until that PIN has
 * been typed back. The token proves the reset started in this browser;
 * the PIN proves the person owns the mailbox. Neither is enough alone.
 *
 * This is what register's new "must be a Google-hosted address" rule
 * (lib/validators/email.js) buys: every account's email is a mailbox
 * that can actually receive the PIN, which is why mailing one is now a
 * flow that works rather than the dead end it used to be.
 *
 * `delivery` tells the page where the PIN went: "email", or "console"
 * when SMTP_HOST is unset and lib/mailer.js printed it in the terminal
 * instead (development only — see the warning in that file).
 *
 * Every REQUEST is rate-limited, not just the ones that fail: a success
 * is exactly what an attacker wants, so counting failures only — the way
 * /api/auth/login does — would leave this route unlimited for the one
 * case that matters. Three tries per email and ten per IP in fifteen
 * minutes still leaves room for someone who mistypes their own address,
 * while a script walking a list of emails is stopped.
 *
 * Needs SMTP_* in .env.local to really send mail; without them the PIN
 * appears in the `npm run dev` terminal.
 * ---------------------------------------------------------------------
 */

import {
  findAccountByEmail,
  createResetRequest,
  maskEmail,
  RESET_LIFETIME_MINUTES,
} from "@/lib/passwordReset";
import { sendResetPin } from "@/lib/mailer";
import { checkRateLimit, getClientIp, recordFailure } from "@/lib/rateLimit";

const WINDOW_MS = 15 * 60 * 1000; // counting window: 15 minutes
const MAX_PER_EMAIL = 3; // reset requests one email may start in that window
const MAX_PER_IP = 10; // reset requests one IP may start, across all emails

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

    // Make the one-time token + PIN (both valid 30 minutes).
    const { token, pin } = await createResetRequest(account.id);

    // Safety net: a real token is exactly 64 hex characters. Anything else means an OLD
    // src/lib/passwordReset.js is still in the project, which would make the reset page
    // open with a broken address. The terminal shows this message.
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
      throw new Error(
        "createResetRequest() did not return a 64-character token. Replace src/lib/passwordReset.js with the new version."
      );
    }

    // --- ADDED: mail the PIN. The token is only returned if this worked:
    // sending the user to a page that asks for a PIN they will never
    // receive would be worse than failing here, where we can say so.
    const { delivery } = await sendResetPin({
      to: account.email,
      pin,
      minutes: RESET_LIFETIME_MINUTES,
    });

    if (delivery === "failed") {
      return Response.json(
        {
          success: false,
          message:
            "We couldn't send your reset PIN just now. Please try again in a few minutes.",
        },
        { status: 502 }
      );
    }

    return Response.json({
      success: true,
      token,
      delivery, // "email" | "console"
      maskedEmail: maskEmail(account.email),
      minutes: RESET_LIFETIME_MINUTES,
    });
  } catch (error) {
    console.error("Forgot password API error:", error);
    return Response.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
