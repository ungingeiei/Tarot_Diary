/**
 * GET /api/auth/google/callback
 *
 * Step 2: Google sends the browser back here with `code` + `state`.
 * We check the state, trade the code for tokens, find-or-create the
 * matching row in `accounts`, and issue the SAME JWT session cookie
 * that /api/auth/login issues — so everything downstream (getSession,
 * /api/auth/me, the coin and draw routes) keeps working unchanged.
 *
 * DEPENDS ON the backend branch: `@/lib/db` and `@/lib/session` live on
 * `origin/api`, as does the `accounts` table. This route only runs once
 * this branch is merged with it — the same way login/page.jsx already
 * imports `@/lib/auth` and `@/components/*` from sibling branches.
 *
 * Before first use, run the migration in
 * `public/database/google_oauth.sql` (adds `accounts.google_sub` and
 * makes `accounts.pwd` nullable — a Google account has no password).
 */

import { cookies } from "next/headers";
import db from "@/lib/db";
import { createSessionToken, setSessionCookie } from "@/lib/session";
import {
  decodeIdToken,
  exchangeCodeForTokens,
  getGoogleConfig,
  STATE_COOKIE,
  VERIFIER_COOKIE,
} from "@/lib/googleOAuth";

/** Every failure path lands the user back on /login with a reason. */
function redirectToLogin(request, error) {
  return Response.redirect(
    new URL(`/login?error=${encodeURIComponent(error)}`, request.url),
    302
  );
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const googleError = searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  const codeVerifier = cookieStore.get(VERIFIER_COOKIE)?.value;

  // One-shot values: clear them whatever happens next, so a replayed
  // callback URL cannot be reused.
  cookieStore.delete(STATE_COOKIE);
  cookieStore.delete(VERIFIER_COOKIE);

  if (!getGoogleConfig()) return redirectToLogin(request, "google_not_configured");

  // The user pressed "Cancel" on Google's consent screen.
  if (googleError) return redirectToLogin(request, "google_cancelled");

  if (!code || !state) return redirectToLogin(request, "google_bad_response");

  // CSRF check: the state coming back must match the one we set.
  if (!expectedState || !codeVerifier || state !== expectedState) {
    return redirectToLogin(request, "google_state_mismatch");
  }

  try {
    const tokens = await exchangeCodeForTokens({ code, codeVerifier });
    const claims = decodeIdToken(tokens.id_token);

    const googleSub = claims.sub;
    const email = (claims.email || "").toLowerCase();
    // An unverified Google email must not be trusted: it would let
    // someone claim an address (and so an existing account) they do not
    // actually own.
    if (!googleSub || !email || claims.email_verified !== true) {
      return redirectToLogin(request, "google_email_unverified");
    }

    const name = claims.given_name || claims.name || email.split("@")[0];
    const account = await findOrCreateAccount({ googleSub, email, name });

    const token = createSessionToken({
      accountId: account.id,
      role: account.role,
    });
    await setSessionCookie(token);

    // Back to the login page with a success flag: it hydrates the
    // client-side auth layer (lib/auth.js) from /api/auth/me and then
    // forwards to /category. Going straight to /category would set the
    // real session cookie but leave the localStorage-based Header
    // still showing a signed-out state.
    return Response.redirect(new URL("/login?google=success", request.url), 302);
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return redirectToLogin(request, "google_failed");
  }
}

/**
 * Three cases:
 *   1. Known google_sub  → sign that account in.
 *   2. Same email, no google_sub → link Google to the existing
 *      password account (the email is Google-verified, so this is the
 *      owner) instead of failing on the UNIQUE email constraint.
 *   3. Nobody           → create a passwordless account, same starting
 *      coin/streak defaults as /api/auth/register.
 */
async function findOrCreateAccount({ googleSub, email, name }) {
  const [rows] = await db.execute(
    `SELECT id, f_name, email, role, google_sub
       FROM accounts
      WHERE google_sub = ? OR email = ?
      LIMIT 1`,
    [googleSub, email]
  );

  if (rows.length > 0) {
    const existing = rows[0];
    if (!existing.google_sub) {
      await db.execute("UPDATE accounts SET google_sub = ? WHERE id = ?", [
        googleSub,
        existing.id,
      ]);
    }
    return existing;
  }

  const [result] = await db.execute(
    `INSERT INTO accounts (f_name, email, pwd, google_sub, role, coin, streak)
     VALUES (?, ?, NULL, ?, 'user', 100, 0)`,
    [name, email, googleSub]
  );

  return { id: result.insertId, f_name: name, email, role: "user" };
}
