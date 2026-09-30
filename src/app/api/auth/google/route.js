/**
 * GET /api/auth/google
 *
 * Step 1 of the Google sign-in flow: mint a CSRF `state` and a PKCE
 * verifier, stash both in short-lived httpOnly cookies, then bounce the
 * browser to Google's consent screen. The "Continue with Google" button
 * on the login page is a plain link to this route — it has to be a
 * full navigation, not fetch(), because the browser itself must follow
 * the redirect to accounts.google.com.
 */

import { cookies } from "next/headers";
import {
  buildAuthorizationUrl,
  createPkcePair,
  createState,
  getGoogleConfig,
  OAUTH_COOKIE_MAX_AGE,
  STATE_COOKIE,
  VERIFIER_COOKIE,
} from "@/lib/googleOAuth";

export async function GET(request) {
  if (!getGoogleConfig()) {
    // Misconfiguration is a server problem, but the user is sitting in
    // a browser — send them back to the login page with a message
    // rather than showing a raw 500.
    const url = new URL("/login?error=google_not_configured", request.url);
    return Response.redirect(url, 302);
  }

  const state = createState();
  const { verifier, challenge } = createPkcePair();

  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // must survive the cross-site redirect back from Google
    path: "/",
    maxAge: OAUTH_COOKIE_MAX_AGE,
  };
  cookieStore.set(STATE_COOKIE, state, cookieOptions);
  cookieStore.set(VERIFIER_COOKIE, verifier, cookieOptions);

  return Response.redirect(
    buildAuthorizationUrl({ state, codeChallenge: challenge }),
    302
  );
}
