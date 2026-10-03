import db from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSessionToken, setSessionCookie } from "@/lib/session";

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
    const validPassword = await verifyPassword(password, account.pwd);

    if (!validPassword) {
      return Response.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

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