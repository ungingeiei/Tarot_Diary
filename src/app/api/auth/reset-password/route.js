/**
 * ---------------------------------------------------------------------
 * /api/auth/reset-password
 * ---------------------------------------------------------------------
 * Called by app/reset-password/page.jsx (the page /forgot-password sends
 * the user to). Three operations, because the reset is now two steps:
 *
 *   GET  ?token=...                  -> which step is this reset on?
 *        Response: { success: true, stage: "pin" | "password",
 *                    maskedEmail, attemptsLeft }
 *        (lets the page draw the PIN box or the password form, and show
 *         "expired" before the user types anything)
 *
 *   POST { token, pin }              -> step 1: check the PIN from the email.
 *        Response: { success: true, stage: "password" }
 *                  { success: false, message, attemptsLeft, locked }
 *
 *   POST { token, password }         -> step 2: save the new password.
 *        Response: { success: true } or { success: false, message }
 *
 * --- CHANGED: STEP 1 IS NEW ------------------------------------------
 * The token in the URL is no longer permission to change a password; it
 * only identifies the reset. The PIN mailed by /api/auth/forgot-password
 * is what proves the caller owns the mailbox, and the save below is
 * refused until it has been typed back. The check is HERE, not only in
 * the page, because anything the browser does can be skipped by calling
 * this route directly — the page's PIN box is a convenience, this is the
 * actual gate.
 *
 * The two POSTs are told apart by which field is present, so the page
 * never needs a second URL. A body carrying both is treated as step 1:
 * verify first, then let the page send the password on its own.
 *
 * All database work is in lib/passwordReset.js.
 * ---------------------------------------------------------------------
 */

import {
  findValidResetToken,
  resetPasswordWithToken,
  verifyResetPin,
  maskEmail,
  RESET_MAX_PIN_ATTEMPTS,
} from "@/lib/passwordReset";
// passwordProblems = the register-page rules (lib/validators/password.js) + bcrypt's 72-byte limit.
import { passwordProblems } from "@/lib/apiAuth";
import { checkRateLimit, getClientIp, recordFailure } from "@/lib/rateLimit";

const INVALID_LINK_MESSAGE =
  "This reset page is invalid or has expired. Please start again from the forgot-password page.";

// --- ADDED: the PIN's own limit, on top of the per-request attempt
// counter in the database. That counter stops guessing at ONE reset;
// this stops someone starting a fresh reset for every five guesses, or
// spraying PINs at many tokens from one machine.
const PIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_PIN_TRIES_PER_IP = 20;

// ----- GET: which step is this reset on? -----
export async function GET(request) {
  try {
    const token = new URL(request.url).searchParams.get("token");
    const reset = await findValidResetToken(token);

    if (!reset) {
      return Response.json(
        { success: false, message: INVALID_LINK_MESSAGE },
        { status: 400 }
      );
    }

    // Only the masked address goes out: whoever holds this link should be
    // able to tell it is their own inbox without being shown an address
    // they did not already know.
    return Response.json({
      success: true,
      stage: reset.verified ? "password" : "pin",
      maskedEmail: maskEmail(reset.email),
      attemptsLeft: reset.attemptsLeft,
    });
  } catch (error) {
    console.error("Reset password (check) API error:", error);
    return Response.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}

// ----- POST: step 1 (pin) or step 2 (password) -----
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { token, pin, password } = body;

    // --- ADDED: step 1 — the PIN from the email.
    // Checked first, so a body with both fields verifies rather than
    // saving: the password can never slip past the PIN.
    if (typeof pin === "string") {
      const ip = getClientIp(request);
      const ipKey = `reset-pin:ip:${ip}`;
      const ipRule = { max: MAX_PIN_TRIES_PER_IP, windowMs: PIN_WINDOW_MS };

      const ipLimit = checkRateLimit(ipKey, ipRule);
      if (!ipLimit.allowed) {
        return Response.json(
          {
            success: false,
            message: `Too many PIN attempts. Please try again in ${Math.ceil(
              ipLimit.retryAfterSeconds / 60
            )} minute(s).`,
          },
          {
            status: 429,
            headers: { "Retry-After": String(ipLimit.retryAfterSeconds) },
          }
        );
      }

      const result = await verifyResetPin(token, pin);

      if (result.ok) {
        return Response.json({ success: true, stage: "password" });
      }

      // Only wrong tries are counted, so a user typing their real PIN
      // correctly first time never moves the counter.
      recordFailure(ipKey, ipRule);

      if (result.reason === "invalid-token") {
        return Response.json(
          { success: false, message: INVALID_LINK_MESSAGE },
          { status: 400 }
        );
      }

      if (result.reason === "locked") {
        return Response.json(
          {
            success: false,
            locked: true,
            attemptsLeft: 0,
            message: `That PIN was wrong ${RESET_MAX_PIN_ATTEMPTS} times, so this reset has been cancelled. Please start again to get a new PIN.`,
          },
          { status: 400 }
        );
      }

      return Response.json(
        {
          success: false,
          attemptsLeft: result.attemptsLeft,
          message: `That PIN is not right. ${result.attemptsLeft} attempt(s) left.`,
        },
        { status: 400 }
      );
    }

    // --- Step 2: the new password (only reachable once the PIN is in).
    // Re-check the password rules here too, because the browser check can be skipped
    // by calling this API directly. Sends back the list so the page can show each rule.
    const problems = passwordProblems(password);
    if (problems.length > 0) {
      return Response.json(
        { success: false, message: problems.join(" "), errors: problems },
        { status: 400 }
      );
    }

    const result = await resetPasswordWithToken(token, password);

    if (!result.ok) {
      // "not-verified" is its own answer: the link itself is fine, the
      // PIN step was simply skipped. Telling the page to go back to the
      // PIN box is far more use than calling the link expired.
      if (result.reason === "not-verified") {
        return Response.json(
          {
            success: false,
            stage: "pin",
            message: "Please enter the PIN we emailed you before choosing a new password.",
          },
          { status: 403 }
        );
      }
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
