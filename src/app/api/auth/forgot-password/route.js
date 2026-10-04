/**
 * ---------------------------------------------------------------------
 * POST /api/auth/forgot-password
 * ---------------------------------------------------------------------
 * Called by app/forgot-password/page.jsx.
 *
 * Body:     { email }
 * Response: { success: true, message }  — ALWAYS the same message.
 *
 * What it does:
 *   1. Looks the email up in the `accounts` table (via lib/passwordReset).
 *   2. If the account exists, creates a one-time reset token + a 6-digit code
 *      in the database and emails both (link:  <APP_URL>/reset-password?token=...).
 *      The page then sends the user to /reset-password?email=... to type the code.
 *   3. Replies with the same generic message whether or not the email
 *      exists. This is on purpose: it stops people from using this form
 *      to find out which emails are registered (the login route follows
 *      the same rule).
 *
 * .env.local needs:  APP_URL=http://localhost:3000   (your site's address)
 * ---------------------------------------------------------------------
 */

import { findAccountByEmail, createResetToken } from "@/lib/passwordReset";
import { sendPasswordResetEmail } from "@/lib/mailer";

const GENERIC_MESSAGE =
  "If that email is registered, we've sent a link to reset your password.";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    // Basic format check — the only case where we show a different error.
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return Response.json(
        { success: false, message: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const account = await findAccountByEmail(email);

    if (account) {
      // Returns null if a link was requested in the last minute.
      const reset = await createResetToken(account.id);

      if (reset) {
        const baseUrl = process.env.APP_URL || "http://localhost:3000";
        const resetUrl = `${baseUrl}/reset-password?token=${reset.token}`;
        // The email carries the link AND the 6-digit code for the reset-password page.
        await sendPasswordResetEmail(account.email, resetUrl, reset.code);
      }
    }

    return Response.json({ success: true, message: GENERIC_MESSAGE });
  } catch (error) {
    console.error("Forgot password API error:", error);
    return Response.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
