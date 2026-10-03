// rateLimit.js — tiny in-memory "too many tries" counter (no extra package or DB table).
// Data lives in server memory, so it resets when the server restarts and is
// not shared between several server instances (fine for a school project / one server).

// Keep the Map on globalThis so Next.js dev hot-reload does not wipe it every edit.
const store = globalThis.__rateLimitStore || new Map();
globalThis.__rateLimitStore = store;

// Remove entries whose time window already ended, so memory does not grow forever.
function sweep(now) {
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

// Ask "is this key still allowed to try?" WITHOUT counting a new attempt.
// Returns { allowed, retryAfterSeconds }.
export function checkRateLimit(key, { max, windowMs }) {
  const now = Date.now();
  if (store.size > 1000) sweep(now); // cheap cleanup only when the Map gets big

  const entry = store.get(key);

  // No record, or its window is over -> allowed.
  if (!entry || entry.resetAt <= now) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  // Too many failures inside the window -> blocked until the window ends.
  if (entry.count >= max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

// Count one FAILED attempt. The first failure starts the time window.
export function recordFailure(key, { windowMs }) {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
  } else {
    entry.count += 1;
  }
}

// Forget a key (used after a successful login so the user starts fresh).
export function resetRateLimit(key) {
  store.delete(key);
}

// Best-effort client IP from the request headers.
// x-forwarded-for is set by proxies/hosts like Vercel; it can be faked if the
// app is NOT behind a trusted proxy, which is why the email-based key also exists.
export function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}
