/**
 * ---------------------------------------------------------------------
 * /api/auth/reset-password
 * ---------------------------------------------------------------------
 * Called by app/reset-password/page.jsx (the page /forgot-password sends
 * the user to). Two methods:
 *
 *   GET  ?token=...            -> is this reset session still valid?
 *        Response: { success: true } or { success: false, message }
 *        (lets the page show "expired" before the user types)
 *
 *   POST { token, password }   -> save the new password.
 *        Response: { success: true } or { success: false, message }
 *
 * All database work is in lib/passwordReset.js.
 * ---------------------------------------------------------------------
 */

import { findValidResetToken, resetPasswordWithToken } from "@/lib/passwordReset";
// passwordProblems = the register-page rules (lib/validators/password.js) + bcrypt's 72-byte limit.
import { passwordProblems } from "@/lib/apiAuth";

const INVALID_LINK_MESSAGE =
  "This reset page is invalid or has expired. Please start again from the forgot-password page.";

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
    const { token, password } = await request.json();

    // Re-check the password rules here too, because the browser check can be skipped
    // by calling this API directly. Sends back the list so the page can show each rule.
    const problems = passwordProblems(password);
    if (problems.length > 0) {
      return Response.json(
        { success: false, message: problems.join(" "), errors: problems },
        { status: 400 }
      );
    }

    const ok = await resetPasswordWithToken(token, password);

    if (!ok) {
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
