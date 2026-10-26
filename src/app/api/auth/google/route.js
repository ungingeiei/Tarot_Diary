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
import { cookiesAreSecure, publicUrl } from "@/lib/publicUrl";

export async function GET(request) {
  if (!getGoogleConfig()) {
    // Misconfiguration is a server problem, but the user is sitting in
    // a browser — send them back to the login page with a message
    // rather than showing a raw 500.
    // publicUrl(), not `new URL(path, request.url)`: behind the load
    // balancer request.url is http://0.0.0.0:3000/… and redirecting a
    // browser there sends it nowhere. See lib/publicUrl.js.
    return Response.redirect(publicUrl(request, "/login?error=google_not_configured"), 302);
  }

  const state = createState();
  const { verifier, challenge } = createPkcePair();

  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    // Secure only when the site really is HTTPS — on plain HTTP the
    // browser would drop these, and the state check on the way back
    // from Google would fail with google_state_mismatch.
    secure: cookiesAreSecure(),
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
