/**
 * ---------------------------------------------------------------------
 * GOOGLE OAUTH 2.0 — hand-rolled authorization-code flow (with PKCE).
 * ---------------------------------------------------------------------
 * No external dependency: just Google's documented HTTP endpoints, so
 * this drops in next to the existing custom JWT session in
 * `src/lib/session.js` instead of replacing it (as next-auth would).
 *
 * Required environment variables (put them in `.env.local`, which is
 * gitignored — never commit the secret):
 *
 *   GOOGLE_CLIENT_ID      = <client id from Google Cloud Console>
 *   GOOGLE_CLIENT_SECRET  = <client secret>
 *   GOOGLE_REDIRECT_URI   = http://localhost:3000/api/auth/google/callback
 *
 * The redirect URI must be registered byte-for-byte identically under
 * "Authorized redirect URIs" on the OAuth 2.0 Client ID in Google Cloud
 * Console, or Google answers with redirect_uri_mismatch.
 * ---------------------------------------------------------------------
 */

import crypto from "node:crypto";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

// Short-lived cookies that carry the CSRF state and the PKCE verifier
// across the redirect to Google and back. They are deleted in the
// callback as soon as they have been checked.
export const STATE_COOKIE = "google_oauth_state";
export const VERIFIER_COOKIE = "google_oauth_verifier";
export const OAUTH_COOKIE_MAX_AGE = 60 * 10; // 10 minutes

export function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return null; // callers turn this into a friendly error, not a crash
  }
  return { clientId, clientSecret, redirectUri };
}

function base64url(buffer) {
  return buffer.toString("base64url");
}

export function createState() {
  return base64url(crypto.randomBytes(32));
}

/** PKCE: a random verifier plus its S256 challenge. */
export function createPkcePair() {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(
    crypto.createHash("sha256").update(verifier).digest()
  );
  return { verifier, challenge };
}

export function buildAuthorizationUrl({ state, codeChallenge }) {
  const config = getGoogleConfig();
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  // Always show the account chooser rather than silently reusing
  // whichever Google account the browser is already signed in to.
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

/** Trades the one-time `code` for Google's tokens. Throws on failure. */
export async function exchangeCodeForTokens({ code, codeVerifier }) {
  const config = getGoogleConfig();
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
      code_verifier: codeVerifier,
    }),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Google token exchange failed: ${data.error || res.status} ${
        data.error_description || ""
      }`.trim()
    );
  }
  return data; // { access_token, id_token, expires_in, ... }
}

/**
 * Reads the claims out of Google's id_token.
 *
 * The signature is deliberately NOT re-verified here: we received this
 * token directly from Google's token endpoint over TLS, in a
 * server-to-server request authenticated with our client secret, which
 * Google's own docs state makes signature validation unnecessary. (If
 * an id_token ever arrives from the *browser* instead — e.g. the
 * Google Identity Services one-tap flow — it MUST be verified against
 * Google's JWKS before being trusted.)
 */
export function decodeIdToken(idToken) {
  const parts = String(idToken || "").split(".");
  if (parts.length !== 3) throw new Error("Malformed id_token from Google");
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  return payload; // { sub, email, email_verified, name, picture, ... }
}
