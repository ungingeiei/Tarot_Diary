/**
 * ---------------------------------------------------------------------
 * POST /api/auth/check-email
 * ---------------------------------------------------------------------
 * Called by app/register/page.jsx while the user types, so the email
 * conditions under the field can be answered the same way the password
 * conditions are: live, before CREATE ACCOUNT is ever pressed.
 *
 * Body:     { email }
 * Response: { success: true, google, taken, problems }
 *           { success: false, message } (429) -> asked too often
 *           { success: false, message } (503) -> DNS is not answering
 *
 *   google   - true if Google hosts this address's mail
 *              (lib/validators/email.js: gmail.com/googlemail.com, or a
 *              domain whose MX records point at Google Workspace)
 *   taken    - true if an account already uses it
 *   problems - the messages to show, in the same style as the password
 *              rules. Empty = this address can be used to sign up.
 *
 * WHY THIS ROUTE EXISTS: the check needs DNS (node:dns), which only the
 * server can do, and the answer must reach the user BEFORE they submit.
 * It is only a courtesy, though — /api/auth/register makes the same two
 * checks itself, because nothing coming from a browser can be trusted.
 *
 * `taken` is no more than the register route already reveals with its
 * 409 ("This email is already registered"), so this route does not
 * widen what an outsider can learn. The IP limit is what keeps it from
 * being a comfortable way to test a list of addresses: 30 checks in 5
 * minutes is far more than anyone filling in one form needs, and the
 * answers are cached per domain so repeat typing is free.
 * ---------------------------------------------------------------------
 */

import db from "@/lib/db";
import { checkGoogleEmail } from "@/lib/validators/email";
import { checkRateLimit, getClientIp, recordFailure } from "@/lib/rateLimit";

const WINDOW_MS = 5 * 60 * 1000;
const MAX_PER_IP = 30;

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    const ip = getClientIp(request);
    const ipKey = `check-email:ip:${ip}`;
    const ipRule = { max: MAX_PER_IP, windowMs: WINDOW_MS };

    const limit = checkRateLimit(ipKey, ipRule);
    if (!limit.allowed) {
      return Response.json(
        {
          success: false,
          message: "Too many email checks. Please try again in a few minutes.",
        },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }
    // Every call counts, not just the rejected ones: a caller probing
    // addresses gets a useful answer each time, so each time must cost.
    recordFailure(ipKey, ipRule);

    const verdict = await checkGoogleEmail(body.email);

    // DNS itself failed — our problem, not a bad address. 503 so the page
    // can say "couldn't check" instead of telling the user their email is
    // wrong, and so it knows to try again.
    if (verdict.retryable) {
      return Response.json(
        { success: false, message: verdict.problems[0] },
        { status: 503 }
      );
    }

    // Only ask the database once the address is a plausible Google one —
    // no point looking up text that could never be registered anyway.
    let taken = false;
    if (verdict.ok) {
      const [rows] = await db.execute(
        "SELECT id FROM accounts WHERE email = ? LIMIT 1",
        [verdict.email]
      );
      taken = rows.length > 0;
    }

    return Response.json({
      success: true,
      google: verdict.ok,
      taken,
      problems: taken
        ? [...verdict.problems, "This email is already registered. Sign in instead."]
        : verdict.problems,
    });
  } catch (error) {
    console.error("Check email API error:", error);
    return Response.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}
