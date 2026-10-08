import db from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSessionToken, setSessionCookie } from "@/lib/session";
import {
  checkRateLimit,
  recordFailure,
  resetRateLimit,
  getClientIp,
} from "@/lib/rateLimit";

// Rate-limit settings (change the numbers here if you want it stricter/looser).
// Only FAILED logins are counted, so normal users are never slowed down.
const WINDOW_MS = 15 * 60 * 1000; // counting window: 15 minutes
const MAX_FAILS_PER_EMAIL = 5; // wrong tries allowed for one email from one IP
const MAX_FAILS_PER_IP = 20; // wrong tries allowed from one IP across all emails

// NOTE ON RESPONSE SHAPE: login/page.jsx's REAL MODE handler currently
// does `const user = await res.json()` and reads `user.name` directly
// (flat, no wrapper). This route returns `{ success, user: {...} }`
// to match the other routes' shape (draw, header). Update ONE side —
// either flatten this response, or change page.jsx to read
// `data.user.name` — before wiring this up, or login will silently
// store "undefined" as the signed-in name.

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json(
        { success: false, message: "Please enter both email and password" },
        { status: 400 }
      );
    }

        // Build two counters: "this IP + this email" and "this IP overall".
    // Email is trimmed/lowercased so "A@x.com" and "a@x.com" share one counter.
    const ip = getClientIp(request);
    const emailKey = `login:email:${ip}:${String(email).trim().toLowerCase()}`;
    const ipKey = `login:ip:${ip}`;
    const emailRule = { max: MAX_FAILS_PER_EMAIL, windowMs: WINDOW_MS };
    const ipRule = { max: MAX_FAILS_PER_IP, windowMs: WINDOW_MS };

    // Stop early (before the DB query and slow bcrypt check) if either counter is full.
    const emailLimit = checkRateLimit(emailKey, emailRule);
    const ipLimit = checkRateLimit(ipKey, ipRule);
    if (!emailLimit.allowed || !ipLimit.allowed) {
      const retryAfter = Math.max(
        emailLimit.retryAfterSeconds,
        ipLimit.retryAfterSeconds
      );
      return Response.json(
        {
          success: false,
          message: `Too many login attempts. Please try again in ${Math.ceil(
            retryAfter / 60
          )} minute(s).`,
        },
        // 429 = Too Many Requests; Retry-After tells clients (and Postman) how long to wait.
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const [rows] = await db.execute(
      "SELECT id, f_name, email, pwd, role FROM accounts WHERE email = ? LIMIT 1",
      [email]
    );

    // Same generic message for "no such email" and "wrong password" —
    // deliberately not distinguishing them (unlike the doc's Alternative
    // Flow - B, which reveals whether the email exists). Revealing that
    // makes it easy to enumerate registered emails; consider whether
    // the doc's UX or this security tradeoff matters more for the demo.
    if (rows.length === 0) {
      return Response.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    const account = rows[0];
    // Google-created accounts have pwd = NULL; bcrypt would throw on NULL,
    // so treat it as "wrong password" instead of crashing with a 500.
    const validPassword = account.pwd
      ? await verifyPassword(password, account.pwd)
      : false;

    if (!validPassword) {
      // Count this wrong password toward the limits.
      recordFailure(emailKey, emailRule);
      recordFailure(ipKey, ipRule);
      return Response.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Correct password: clear this email's failure counter so the user starts fresh.
    resetRateLimit(emailKey);

    const token = createSessionToken({
      accountId: account.id,
      role: account.role,
    });
    await setSessionCookie(token);

    return Response.json({
      success: true,
      user: {
        id: account.id,
        name: account.f_name,
        email: account.email,
        role: account.role,
      },
    });
  } catch (error) {
    console.error("Login API error:", error);
    return Response.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}