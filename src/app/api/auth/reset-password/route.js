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
 *   POST { token, password }   -> save the new password.
 *        Response: { success: true } or { success: false, message }
 *
 * All database work is in lib/passwordReset.js.
 * ---------------------------------------------------------------------
 */

import { findValidResetToken, resetPasswordWithToken } from "@/lib/passwordReset";

const INVALID_LINK_MESSAGE =
  "This reset link is invalid or has expired. Please request a new one.";

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

    // Same minimum length as the register route.
    if (typeof password !== "string" || password.length < 8) {
      return Response.json(
        { success: false, message: "Password must be at least 8 characters" },
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
