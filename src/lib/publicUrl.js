/**
 * ---------------------------------------------------------------------
 * lib/publicUrl.js — the address the BROWSER used to reach us
 * ---------------------------------------------------------------------
 * Behind a load balancer the server has no idea what address the user
 * typed. The container listens on 0.0.0.0:3000, so `request.url` inside
 * a route handler is `http://0.0.0.0:3000/...` — fine for reading the
 * path and query, useless for building a redirect. Sending a browser to
 * 0.0.0.0 sends it nowhere.
 *
 * That is exactly how Google sign-in broke on AWS: every redirect in
 * the OAuth routes was built with `new URL(path, request.url)`, so the
 * browser was bounced to
 *     http://0.0.0.0:3000/login?error=google_not_configured
 *
 * Two things are derived here, and both must agree with reality:
 *
 *   publicBaseUrl()   where to send the browser back to
 *   cookiesAreSecure() whether cookies may carry the Secure flag
 *
 * THE SECOND ONE IS EASY TO GET WRONG AND BREAKS EVERY LOGIN.
 * `secure: true` tells the browser "only ever send this cookie over
 * HTTPS". The deployed site is plain HTTP (no certificate — Learner Lab
 * cannot register a domain), so a Secure session cookie is set and then
 * never sent back: sign-in appears to work and the user is still logged
 * out on the next page. The old code keyed this off NODE_ENV, which is
 * "production" on AWS, so it was broken there and only there.
 *
 * Configuration:
 *   APP_URL   the public base, e.g. http://my-alb-123.us-east-1.elb.amazonaws.com
 *             Terraform sets this from the load balancer's DNS name.
 *             Unset locally, where the fallbacks below do the job.
 * ---------------------------------------------------------------------
 */

const APP_URL = (process.env.APP_URL || "").trim().replace(/\/$/, "");

/**
 * The scheme+host a browser would use, with no trailing slash.
 *
 * In order: APP_URL, then the proxy's forwarded headers (the ALB sets
 * both), then whatever the request itself claims — which is the
 * 0.0.0.0 case, correct only when nothing is in front of us.
 *
 * @param {Request} request
 * @returns {string} e.g. "http://my-alb-123.us-east-1.elb.amazonaws.com"
 */
export function publicBaseUrl(request) {
  if (APP_URL) return APP_URL;

  const proto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) return `${proto || "http"}://${host}`;

  return new URL(request.url).origin;
}

/** Absolute URL for a path on this site, safe to redirect a browser to. */
export function publicUrl(request, path) {
  return new URL(path, `${publicBaseUrl(request)}/`).toString();
}

/**
 * May cookies be marked Secure?
 *
 * Only when the site really is HTTPS. With APP_URL set, its scheme is
 * the answer and NODE_ENV is irrelevant. Without it, fall back to the
 * old rule so an HTTPS deployment that sets no APP_URL keeps working.
 */
export function cookiesAreSecure() {
  if (APP_URL) return APP_URL.startsWith("https://");
  return process.env.NODE_ENV === "production";
}
