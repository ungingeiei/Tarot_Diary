/**
 * /api/diary — the readings a user kept.
 *
 *   GET                  -> this account's saved readings, newest first
 *   POST   { cardId, scope, topic }  -> save one
 *   DELETE ?id=<saveId>  -> remove one
 *
 * Replaces src/lib/diary.js, which kept entries in localStorage: they
 * were per-browser, lost on a cache clear, and invisible to any other
 * device the same person signed in from.
 *
 * Every request is scoped to the signed-in account via getSession() —
 * the client never names which diary to touch.
 */

import db from "@/lib/db";
import { getSession } from "@/lib/session";

const VALID_SCOPES = ["category", "period"];

function unauthorized() {
  return Response.json(
    { success: false, message: "Not signed in" },
    { status: 401 }
  );
}

/**
 * The id of this account's diary, created on first use.
 *
 * `diaries` has one row per account (UNIQUE on acc_id), so the INSERT
 * cannot create a second one even if two saves arrive together — the
 * loser of that race re-reads the winner's row.
 */
async function getOrCreateDiaryId(accountId) {
  const [rows] = await db.execute(
    "SELECT id FROM diaries WHERE acc_id = ? LIMIT 1",
    [accountId]
  );
  if (rows.length > 0) return rows[0].id;

  try {
    const [result] = await db.execute(
      "INSERT INTO diaries (acc_id) VALUES (?)",
      [accountId]
    );
    return result.insertId;
  } catch (error) {
    if (error.code !== "ER_DUP_ENTRY") throw error;
    const [again] = await db.execute(
      "SELECT id FROM diaries WHERE acc_id = ? LIMIT 1",
      [accountId]
    );
    return again[0].id;
  }
}

// ----- GET: list -----
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    // The reading text is joined back in rather than copied into each
    // save, so fixing a typo in `card_meanings` fixes every diary entry
    // that shows it.
    const [rows] = await db.execute(
      `SELECT s.id, s.scope, s.topic, s.saved_at,
              c.kind, c.name, c.pict,
              m.summary, m.advice
         FROM saves s
         JOIN diaries d ON d.id = s.diary_id
         JOIN cards   c ON c.id = s.card_id
         LEFT JOIN card_meanings m
                ON m.card_id = s.card_id
               AND m.scope = s.scope
               AND m.topic = s.topic
        WHERE d.acc_id = ?
        ORDER BY s.saved_at DESC, s.id DESC`,
      [session.accountId]
    );

    const labels = {
      love: "Love", finance: "Finance", career: "Career",
      pets: "Pets", health: "Health",
      daily: "Daily", weekly: "Weekly", monthly: "Monthly",
    };

    return Response.json({
      success: true,
      // Field names match what diary/page.jsx already reads, so the
      // page did not need reshaping when it stopped using localStorage.
      entries: rows.map((r) => ({
        id: r.id,
        cardId: r.kind,
        cardName: r.name,
        image: r.pict,
        imageAlt: `${r.name}, Rider-Waite-Smith tarot deck`,
        category: r.topic,
        categoryLabel: labels[r.topic] || r.topic,
        text: r.summary ? String(r.summary).split("\n\n").join(" ") : "",
        adviceTitle: `Your Advice for ${labels[r.topic] || r.topic}`,
        advice: r.advice || "",
        savedAt: r.saved_at,
      })),
    });
  } catch (error) {
    console.error("Diary GET error:", error);
    return Response.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}

// ----- POST: save one -----
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const { cardId, scope, topic } = await request.json();

    if (!cardId || !VALID_SCOPES.includes(scope) || !topic) {
      return Response.json(
        { success: false, message: "Invalid reading" },
        { status: 400 }
      );
    }

    // `cardId` is the card's `kind` slug, which is what the API hands
    // the page. Looking it up here also rejects a card that does not
    // exist, before the insert hits the foreign key.
    const [cards] = await db.execute(
      "SELECT id FROM cards WHERE kind = ? LIMIT 1",
      [cardId]
    );
    if (cards.length === 0) {
      return Response.json(
        { success: false, message: "Unknown card" },
        { status: 400 }
      );
    }

    const diaryId = await getOrCreateDiaryId(session.accountId);

    const [result] = await db.execute(
      `INSERT INTO saves (card_id, diary_id, scope, topic, date, saved_at)
       VALUES (?, ?, ?, ?, CURDATE(), NOW())`,
      [cards[0].id, diaryId, scope, topic]
    );

    return Response.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error("Diary POST error:", error);
    return Response.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}

// ----- DELETE: remove one -----
export async function DELETE(request) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return Response.json(
        { success: false, message: "Missing id" },
        { status: 400 }
      );
    }

    // The account check is part of the DELETE itself: passing someone
    // else's save id matches no row rather than deleting theirs.
    const [result] = await db.execute(
      `DELETE s FROM saves s
         JOIN diaries d ON d.id = s.diary_id
        WHERE s.id = ? AND d.acc_id = ?`,
      [id, session.accountId]
    );

    if (result.affectedRows === 0) {
      return Response.json(
        { success: false, message: "Not found" },
        { status: 404 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Diary DELETE error:", error);
    return Response.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}
