/**
 * ---------------------------------------------------------------------
 * /api/profile — the signed-in user's own profile
 * ---------------------------------------------------------------------
 *   GET   -> { success, profile }
 *   PATCH -> { success, profile }   body: any of
 *            { fName, lName, email, phone, dob, zodiac }
 *
 * Only the fields that are sent are changed. The account id always comes
 * from the session, so one user can never edit another's profile, and
 * `role`, `coin` and `streak` cannot be set from here at all.
 *
 *   fName   required if sent, 1-255 chars
 *   lName   optional, "" clears it
 *   email   valid address, must be unused (409 otherwise). Google accounts
 *           cannot change it: their email is what Google verified.
 *   phone   digits with optional + ( ) - and spaces, 6-20 characters, "" clears
 *   dob     "YYYY-MM-DD", a real date between 1900 and today, "" clears.
 *           Send ISO — the profile page shows "14 NOVEMBER 1998" but must
 *           convert before sending.
 *   zodiac  one of the 12 signs ("" clears). If dob is sent WITHOUT zodiac,
 *           the sign is worked out from the date automatically.
 * ---------------------------------------------------------------------
 */

import db from "@/lib/db";
import { requireUser, publicUser } from "@/lib/apiAuth";
import { ZODIAC_SIGNS, zodiacFor, parseBirthDate } from "@/lib/zodiac";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9() \-]{6,20}$/;

async function loadProfile(accountId) {
  const [rows] = await db.execute(
    `SELECT id, f_name, l_name, email, phone, DATE_FORMAT(dob, '%Y-%m-%d') AS dob,
            zodiac, role, coin, streak, (pwd IS NOT NULL) AS has_password
       FROM accounts WHERE id = ? LIMIT 1`,
    [accountId]
  );
  return rows[0] ? publicUser(rows[0]) : null;
}

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    return Response.json({ success: true, profile: publicUser(auth.account) });
  } catch (error) {
    console.error("Profile GET error:", error);
    return Response.json({ success: false, message: "Could not load your profile" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const { account } = auth;

    const body = (await request.json().catch(() => null)) || {};
    const sets = [];
    const params = [];
    const has = (key) => body[key] !== undefined;
    const str = (value) => (typeof value === "string" ? value.trim() : null);

    if (has("fName")) {
      const value = str(body.fName);
      if (!value) return Response.json({ success: false, message: "First name is required" }, { status: 400 });
      if (value.length > 255) return Response.json({ success: false, message: "First name is too long" }, { status: 400 });
      sets.push("f_name = ?");
      params.push(value);
    }

    if (has("lName")) {
      const value = str(body.lName);
      if (value === null) return Response.json({ success: false, message: "Last name is invalid" }, { status: 400 });
      if (value.length > 255) return Response.json({ success: false, message: "Last name is too long" }, { status: 400 });
      sets.push("l_name = ?");
      params.push(value || null);
    }

    if (has("email")) {
      const value = str(body.email)?.toLowerCase();
      if (!value || value.length > 255 || !EMAIL_PATTERN.test(value)) {
        return Response.json(
          { success: false, message: "Please enter a valid email address" },
          { status: 400 }
        );
      }
      if (value !== account.email) {
        if (account.has_google) {
          return Response.json(
            { success: false, message: "The email of a Google account can't be changed here" },
            { status: 400 }
          );
        }
        sets.push("email = ?");
        params.push(value);
      }
    }

    if (has("phone")) {
      const value = str(body.phone);
      if (value === null) return Response.json({ success: false, message: "Phone number is invalid" }, { status: 400 });
      if (value && !PHONE_PATTERN.test(value)) {
        return Response.json(
          { success: false, message: "Phone number can only contain digits, spaces and + ( ) -  (6-20 characters)" },
          { status: 400 }
        );
      }
      sets.push("phone = ?");
      params.push(value || null);
    }

    let birth = null;
    if (has("dob")) {
      const value = str(body.dob);
      if (value === null) return Response.json({ success: false, message: "Date of birth is invalid" }, { status: 400 });
      if (value) {
        birth = parseBirthDate(value);
        if (!birth) return Response.json(
          { success: false, message: "Date of birth must be a real date (YYYY-MM-DD) in the past" },
          { status: 400 }
        );
      }
      sets.push("dob = ?");
      params.push(birth ? birth.value : null);
    }

    if (has("zodiac")) {
      const value = str(body.zodiac)?.toUpperCase();
      if (value === undefined || value === null) return Response.json({ success: false, message: "Zodiac is invalid" }, { status: 400 });
      if (value && !ZODIAC_SIGNS.includes(value)) {
        return Response.json(
          { success: false, message: `Zodiac must be one of: ${ZODIAC_SIGNS.join(", ")}` },
          { status: 400 }
        );
      }
      sets.push("zodiac = ?");
      params.push(value || null);
    } else if (birth) {
      // Date given, sign not: work the sign out from the date.
      sets.push("zodiac = ?");
      params.push(zodiacFor(birth.month, birth.day));
    }

    if (sets.length === 0) return Response.json({ success: false, message: "Nothing to update" }, { status: 400 });

    try {
      await db.execute(`UPDATE accounts SET ${sets.join(", ")} WHERE id = ?`, [
        ...params,
        account.id,
      ]);
    } catch (error) {
      if (error?.code === "ER_DUP_ENTRY") return Response.json(
        { success: false, message: "That email is already used by another account" },
        { status: 409 }
      );
      throw error;
    }

    return Response.json({ success: true, profile: await loadProfile(account.id) });
  } catch (error) {
    console.error("Profile PATCH error:", error);
    return Response.json({ success: false, message: "Could not update your profile" }, { status: 500 });
  }
}
