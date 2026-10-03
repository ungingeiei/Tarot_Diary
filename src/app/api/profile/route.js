/**
 * /api/profile — the signed-in user's own details.
 *
 *   GET -> { profile }
 *   PUT { firstName, lastName, email, phone, dob, zodiac } -> updated profile
 *
 * Replaces the hard-coded "Luna Seraphine" values that were typed
 * straight into profile/page.jsx as defaultValue attributes.
 *
 * The account is always taken from the session; there is no id in the
 * URL, so one user cannot read or edit another's profile.
 */

import db from "@/lib/db";
import { getSession } from "@/lib/session";

const FIELDS =
  "id, f_name, l_name, email, phone, dob, zodiac, role, coin, streak";

function unauthorized() {
  return Response.json(
    { success: false, message: "Not signed in" },
    { status: 401 }
  );
}

/**
 * `dob` is a DATE. Sending it as an ISO timestamp would shift the day
 * for anyone east or west of the server, so it goes out as plain
 * YYYY-MM-DD and the page formats it for display.
 */
function toDateString(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function shape(row) {
  return {
    id: row.id,
    firstName: row.f_name || "",
    lastName: row.l_name || "",
    email: row.email || "",
    phone: row.phone || "",
    dob: toDateString(row.dob),
    zodiac: row.zodiac || "",
    role: row.role,
    coins: row.coin,
    streak: row.streak,
  };
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const [rows] = await db.execute(
      `SELECT ${FIELDS} FROM accounts WHERE id = ? LIMIT 1`,
      [session.accountId]
    );
    if (rows.length === 0) return unauthorized();

    return Response.json({ success: true, profile: shape(rows[0]) });
  } catch (error) {
    console.error("Profile GET error:", error);
    return Response.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await request.json().catch(() => ({}));
    const clean = (v) => (typeof v === "string" ? v.trim() : "");

    const firstName = clean(body.firstName);
    const lastName = clean(body.lastName);
    const email = clean(body.email).toLowerCase();
    const phone = clean(body.phone);
    const dob = clean(body.dob);
    const zodiac = clean(body.zodiac);

    if (!firstName) {
      return Response.json(
        { success: false, message: "First name is required" },
        { status: 400 }
      );
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return Response.json(
        { success: false, message: "Please enter a valid email address" },
        { status: 400 }
      );
    }
    // The page sends YYYY-MM-DD from a date input; anything else would
    // reach MySQL as an invalid DATE and be stored as NULL without
    // telling the user their birthday was dropped.
    if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      return Response.json(
        { success: false, message: "Date of birth must be a valid date" },
        { status: 400 }
      );
    }

    // `email` is UNIQUE: catching it here gives a readable message
    // instead of a 500 from the constraint.
    const [clash] = await db.execute(
      "SELECT id FROM accounts WHERE email = ? AND id <> ? LIMIT 1",
      [email, session.accountId]
    );
    if (clash.length > 0) {
      return Response.json(
        { success: false, message: "That email is already used by another account" },
        { status: 409 }
      );
    }

    await db.execute(
      `UPDATE accounts
          SET f_name = ?, l_name = ?, email = ?, phone = ?, dob = ?, zodiac = ?
        WHERE id = ?`,
      [
        firstName,
        lastName || null,
        email,
        phone || null,
        dob || null,
        zodiac || null,
        session.accountId,
      ]
    );

    const [rows] = await db.execute(
      `SELECT ${FIELDS} FROM accounts WHERE id = ? LIMIT 1`,
      [session.accountId]
    );

    return Response.json({ success: true, profile: shape(rows[0]) });
  } catch (error) {
    console.error("Profile PUT error:", error);
    return Response.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}
