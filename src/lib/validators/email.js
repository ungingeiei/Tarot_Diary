/**
 * ---------------------------------------------------------------------
 * lib/validators/email.js — "is this address a REAL Google mailbox?"
 * ---------------------------------------------------------------------
 * Why this exists:
 *   Sign-up used to accept any text with an @ in it, so accounts could
 *   be created on mailboxes that do not exist. Nothing could ever be
 *   delivered to them — which is exactly why the forgot-password flow
 *   had to hand its reset token straight back to the browser instead of
 *   mailing anything (see app/api/auth/forgot-password/route.js).
 *
 *   The app already signs people in with Google, and the reset flow now
 *   sends a PIN by email, so both halves need the address to be a
 *   mailbox Google actually hosts. That is the rule this file enforces:
 *
 *       REGISTER ONLY ACCEPTS AN EMAIL GOOGLE HOSTS.
 *       Anything else is refused and the user is told why.
 *
 * How "Google hosts it" is decided — two steps, cheapest first:
 *   1. gmail.com / googlemail.com -> yes, no network call needed.
 *   2. Any other domain -> ask DNS for its MX records (the servers that
 *      receive its mail). A Google Workspace domain always points at
 *      *.google.com / *.googlemail.com (aspmx.l.google.com,
 *      smtp-relay.gmail.com, …). No MX at all = the domain cannot
 *      receive mail from anyone, so it is refused too.
 *
 * What this does NOT prove: that the exact mailbox in front of the @
 * exists. DNS only answers for the domain. The PIN the reset flow mails
 * is what proves the individual mailbox — this file just makes sure the
 * PIN has somewhere to go.
 *
 * NOTE: this is server-only (node:dns). The register page reaches it
 * through POST /api/auth/check-email, never by importing it.
 * ---------------------------------------------------------------------
 */

import { promises as dns } from "dns";

// Domains we know belong to Google without asking DNS.
const GOOGLE_CONSUMER_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

// An MX host ending in one of these is a Google mail server, which is
// what every Google Workspace domain points at.
const GOOGLE_MX_SUFFIXES = [
  ".google.com",
  ".googlemail.com",
  ".google",
];

// Deliberately loose: one @, no spaces, a dot in the domain. The Google
// check below is the real gate, so there is no point re-implementing
// RFC 5322 here.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The messages the register page shows as its email conditions. Kept
// here so the page, the check route and the register route all say the
// same thing (the same reason password.js owns the password messages).
export const EMAIL_MESSAGES = {
  required: "Email address is required.",
  shape: "Enter a complete email address, e.g. you@gmail.com.",
  notGoogle:
    "Email must be a Google account (Gmail, or a domain hosted by Google Workspace).",
  lookupFailed:
    "We couldn't check this email's domain just now. Please try again.",
};

// MX answers barely change, and the register page asks on every pause in
// typing, so the result is remembered for an hour per domain. Lives on
// globalThis so Next.js dev hot-reload does not throw it away on each
// edit (same trick as lib/rateLimit.js).
const CACHE_TTL_MS = 60 * 60 * 1000;
const mxCache = globalThis.__googleMxCache || new Map();
globalThis.__googleMxCache = mxCache;

/** The lower-cased part after the @, or "" if the address has no shape. */
export function emailDomain(email) {
  if (typeof email !== "string") return "";
  const at = email.lastIndexOf("@");
  return at === -1 ? "" : email.slice(at + 1).trim().toLowerCase();
}

/** Shape only — no network. Safe to call from anywhere. */
export function hasEmailShape(email) {
  return typeof email === "string" && EMAIL_SHAPE.test(email.trim());
}

/**
 * Is this domain's mail handled by Google?
 * @returns {Promise<"google" | "other" | "unknown">}
 *   "google"  - accept it
 *   "other"   - a real domain, but not Google (or it takes no mail at all)
 *   "unknown" - DNS itself failed (offline, timeout). NOT a rejection:
 *               the caller must not blame the user for our outage.
 */
async function lookupDomain(domain) {
  if (GOOGLE_CONSUMER_DOMAINS.has(domain)) return "google";

  const cached = mxCache.get(domain);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  let records;
  try {
    records = await dns.resolveMx(domain);
  } catch (error) {
    // ENOTFOUND / ENODATA = the domain really has no mail servers, which
    // is an answer. Everything else (timeout, no network) is our problem.
    if (error.code === "ENOTFOUND" || error.code === "ENODATA") {
      mxCache.set(domain, { result: "other", expiresAt: Date.now() + CACHE_TTL_MS });
      return "other";
    }
    return "unknown";
  }

  const isGoogle = records.some((record) => {
    const host = String(record.exchange || "").toLowerCase().replace(/\.$/, "");
    return GOOGLE_MX_SUFFIXES.some((suffix) => host.endsWith(suffix));
  });

  const result = isGoogle ? "google" : "other";
  mxCache.set(domain, { result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}

/**
 * The one function callers use: check an address end to end.
 *
 * @param {string} email
 * @returns {Promise<{ ok: boolean, retryable: boolean, email: string, problems: string[] }>}
 *   ok        - true only if the address is shaped right AND Google hosts it
 *   retryable - true when DNS failed rather than the address being wrong,
 *               so the caller can answer 503 "try again" instead of
 *               telling the user their email is bad
 *   email     - the trimmed, lower-cased address to store
 *   problems  - messages to show, same style as passwordProblems()
 */
export async function checkGoogleEmail(email) {
  const cleaned = typeof email === "string" ? email.trim().toLowerCase() : "";

  if (!cleaned) {
    return { ok: false, retryable: false, email: cleaned, problems: [EMAIL_MESSAGES.required] };
  }
  if (!hasEmailShape(cleaned)) {
    return { ok: false, retryable: false, email: cleaned, problems: [EMAIL_MESSAGES.shape] };
  }

  const verdict = await lookupDomain(emailDomain(cleaned));
  if (verdict === "google") {
    return { ok: true, retryable: false, email: cleaned, problems: [] };
  }
  if (verdict === "unknown") {
    return { ok: false, retryable: true, email: cleaned, problems: [EMAIL_MESSAGES.lookupFailed] };
  }
  return { ok: false, retryable: false, email: cleaned, problems: [EMAIL_MESSAGES.notGoogle] };
}
