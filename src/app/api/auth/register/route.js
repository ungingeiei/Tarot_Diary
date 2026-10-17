/**
 * ---------------------------------------------------------------------
 * POST /api/auth/register
 * ---------------------------------------------------------------------
 * Called by app/register/page.jsx (the CREATE ACCOUNT button).
 *
 * Body:     { name, email, password }
 * Response: { success: true, user }                 -> account created,
 *                                                      session cookie set
 *           { success: false, message, errors } (400) -> a rule was broken
 *           { success: false, message } (409)         -> email already used
 *
 * Every check the register page makes is made again here, because a
 * browser can be skipped: anyone can POST to this route directly. The
 * page's live condition lists are there so the user is not guessing;
 * THIS is where the rules are actually enforced.
 *
 * --- CHANGED: two checks were too weak to be worth having ------------
 *   1. The password only had to be 8 characters long, while the page
 *      demanded upper + lower case, a digit, a special character and no
 *      spaces (lib/validators/password.js). A direct POST could store a
 *      password the app's own policy forbids. It now shares one policy
 *      with the reset flow: passwordProblems() in lib/apiAuth.js, which
 *      is those rules plus bcrypt's 72-byte limit — bcrypt silently
 *      ignores everything past byte 72, so a longer password is partly
 *      decoration and saying so beats pretending.
 *   2. The email only had to be non-empty. It must now be an address
 *      Google hosts (lib/validators/email.js). See that file for why:
 *      in short, the forgot-password flow mails a PIN, and a mailbox
 *      that cannot receive one is an account nobody can ever recover.
 *
 * `errors` is a list so the page can show each broken rule, the same
 * shape /api/auth/reset-password already answers with.
 * ---------------------------------------------------------------------
 */

import db from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createSessionToken, setSessionCookie } from "@/lib/session";
import { passwordProblems } from "@/lib/apiAuth";
import { checkGoogleEmail } from "@/lib/validators/email";

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return Response.json(
        { success: false, message: "Please fill in all fields" },
        { status: 400 }
      );
    }

    // --- ADDED: the email must be a mailbox Google hosts.
    // Done before the password work: it is the cheaper check, and a
    // failure here means nothing else matters.
    const emailVerdict = await checkGoogleEmail(email);
    if (emailVerdict.retryable) {
      // DNS is not answering. Our fault, so do not blame the address —
      // and do NOT fall through and create the account, which would let
      // a DNS outage become a way around the rule.
      return Response.json(
        { success: false, message: emailVerdict.problems[0] },
        { status: 503 }
      );
    }
    if (!emailVerdict.ok) {
      return Response.json(
        {
          success: false,
          message: emailVerdict.problems.join(" "),
          errors: emailVerdict.problems,
        },
        { status: 400 }
      );
    }
    // Stored lower-cased and trimmed, so "Me@Gmail.com" and "me@gmail.com"
    // cannot become two accounts (and so the login lookup always matches).
    const cleanEmail = emailVerdict.email;

    // --- CHANGED: the full password policy, not just a length check.
    const problems = passwordProblems(password);
    if (problems.length > 0) {
      return Response.json(
        { success: false, message: problems.join(" "), errors: problems },
        { status: 400 }
      );
    }

    const [existing] = await db.execute(
      "SELECT id FROM accounts WHERE email = ? LIMIT 1",
      [cleanEmail]
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
      [name, cleanEmail, hashed]
    );

    const accountId = result.insertId;
    const token = createSessionToken({ accountId, role: "user" });
    await setSessionCookie(token);

    return Response.json({
      success: true,
      user: { id: accountId, name, email: cleanEmail, role: "user" },
    });
  } catch (error) {
    console.error("Register API error:", error);
    return Response.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}
