import db from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createSessionToken, setSessionCookie } from "@/lib/session";


export async function POST(request) {
  try {
    const { name, email, password, confirmPassword } = await request.json();

    if (!name || !email || !password) {
      return Response.json(
        { success: false, message: "Please fill in all fields" },
        { status: 400 }
      );
    }

    // if (confirmPassword !== undefined && password !== confirmPassword) {
    //   return Response.json(
    //     { success: false, message: "Passwords do not match" },
    //     { status: 400 }
    //   );
    // }

    if (password.length < 8) {
      return Response.json(
        { success: false, message: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const [existing] = await db.execute(
      "SELECT id FROM accounts WHERE email = ? LIMIT 1",
      [email]
    );

    if (existing.length > 0) {
      return Response.json(
        { success: false, message: "This email is already registered" },
        { status: 409 }
      );
    }

    const hashed = await hashPassword(password);

    const [result] = await db.execute(
      `INSERT INTO accounts (f_name, l_name, email, pwd, role, coin, streak)
       VALUES (?, '', ?, ?, 'user', 50, 0)`,
      [name, email, hashed]
    );

    const accountId = result.insertId;
    const token = createSessionToken({ accountId, role: "user" });
    await setSessionCookie(token);

    return Response.json({
      success: true,
      user: { id: accountId, name, email, role: "user" },
    });
  } catch (error) {
    console.error("Register API error:", error);
    return Response.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}