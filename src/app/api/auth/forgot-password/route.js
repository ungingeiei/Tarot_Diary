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
 * Needs no SMTP_* or APP_URL settings any more.
 * ---------------------------------------------------------------------
 */

import { findAccountByEmail, createResetToken } from "@/lib/passwordReset";

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
