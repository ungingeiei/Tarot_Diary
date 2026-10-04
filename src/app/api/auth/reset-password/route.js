/**
 * ---------------------------------------------------------------------
 * /api/auth/reset-password
 * ---------------------------------------------------------------------
 * Called by app/reset-password/page.jsx (the page the emailed link
 * opens). Two methods:
 *
 *   GET  ?token=...            -> is this link still valid?
 *        Response: { success: true } or { success: false, message }
 *        (lets the page show "link expired" before the user types)
 *
 *   POST { token, password }          -> save the new password (user opened the emailed link).
 *   POST { email, code, password }    -> save the new password (user typed the 6-digit code
 *                                        from the email on the reset-password page).
 *        Response: { success: true } or { success: false, message, errors? }
 *
 * All database work is in lib/passwordReset.js.
 * ---------------------------------------------------------------------
 */

import {
  findValidResetToken,
  resetPasswordWithToken,
  resetPasswordWithCode,
} from "@/lib/passwordReset";
// In-memory "too many wrong tries" counter (same helper the login route uses).
import { checkRateLimit, recordFailure, getClientIp } from "@/lib/rateLimit";
// passwordProblems = the register-page rules (lib/validators/password.js) + bcrypt's 72-byte limit.
import { passwordProblems } from "@/lib/apiAuth";

const INVALID_LINK_MESSAGE =
  "This reset link is invalid or has expired. Please request a new one.";

// One message for every wrong-code reason (no such email, wrong code, expired, used up),
// so this form cannot be used to find out which emails are registered.
const INVALID_CODE_MESSAGE =
  "That code is wrong or has expired. Check the email, or request a new code.";

// Code guessing limits (on top of the 5 tries each code already has in the database).
const CODE_WINDOW_MS = 30 * 60 * 1000; // counting window: 30 minutes
const MAX_CODE_FAILS_PER_EMAIL = 10;
const MAX_CODE_FAILS_PER_IP = 30;

// ----- GET: check the link before showing the form -----
export async function GET(request) {
  try {
    const token = new URL(request.url).searchParams.get("token");
    const valid = await findValidResetToken(token);

    if (!valid) {
      return Response.json(
        { success: false, message: INVALID_LINK_MESSAGE },
        { status: 400 }
      );
    }
    return Response.json({ success: true });
  } catch (error) {
    console.error("Reset password (check) API error:", error);
    return Response.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}

// ----- POST: set the new password -----
export async function POST(request) {
  try {
    const { token, email, code, password } = await request.json();

    // Re-check the password rules here too, because the browser check can be skipped
    // by calling this API directly. Sends back the list so the page can show each rule.
    const problems = passwordProblems(password);
    if (problems.length > 0) {
      return Response.json(
        { success: false, message: problems.join(" "), errors: problems },
        { status: 400 }
      );
    }

    // ----- Flow A: the user opened the emailed link (token in the URL) -----
    if (token) {
      const ok = await resetPasswordWithToken(token, password);
      if (!ok) {
        return Response.json(
          { success: false, message: INVALID_LINK_MESSAGE },
          { status: 400 }
        );
      }
    }
    // ----- Flow B: the user typed the 6-digit code from the email -----
    else if (typeof email === "string" && email && typeof code === "string") {
      const cleanEmail = email.trim().toLowerCase();
      const ip = getClientIp(request);
      const emailKey = `reset-code:email:${ip}:${cleanEmail}`;
      const ipKey = `reset-code:ip:${ip}`;
      const emailRule = { max: MAX_CODE_FAILS_PER_EMAIL, windowMs: CODE_WINDOW_MS };
      const ipRule = { max: MAX_CODE_FAILS_PER_IP, windowMs: CODE_WINDOW_MS };

      // Too many wrong codes already? Stop before touching the database (429 = Too Many Requests).
      const emailLimit = checkRateLimit(emailKey, emailRule);
      const ipLimit = checkRateLimit(ipKey, ipRule);
      if (!emailLimit.allowed || !ipLimit.allowed) {
        const retryAfter = Math.max(emailLimit.retryAfterSeconds, ipLimit.retryAfterSeconds);
        return Response.json(
          {
            success: false,
            message: `Too many wrong codes. Please try again in ${Math.ceil(retryAfter / 60)} minute(s).`,
          },
          { status: 429, headers: { "Retry-After": String(retryAfter) } }
        );
      }

      const ok = await resetPasswordWithCode(cleanEmail, code.trim(), password);
      if (!ok) {
        // Count this wrong try toward the limits.
        recordFailure(emailKey, emailRule);
        recordFailure(ipKey, ipRule);
        return Response.json(
          { success: false, message: INVALID_CODE_MESSAGE },
          { status: 400 }
        );
      }
    }
    // Neither a token nor an email + code was sent.
    else {
      return Response.json(
        { success: false, message: INVALID_LINK_MESSAGE },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      message: "Your password has been updated. You can sign in now.",
    });
  } catch (error) {
    console.error("Reset password API error:", error);
    return Response.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}
