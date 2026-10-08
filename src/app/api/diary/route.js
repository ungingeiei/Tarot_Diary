/**
 * ---------------------------------------------------------------------
 * /api/diary — the signed-in user's saved readings
 * ---------------------------------------------------------------------
 * Every method needs a session (401 otherwise) and only ever touches the
 * caller's OWN diary — ownership is enforced inside the SQL (diaries.acc_id),
 * never taken from the request.
 *
 *   GET                                  -> { success, entries: [...] }  newest first
 *   POST   { cardId, scope, topic }      -> { success, entry }           save a reading
 *   DELETE ?id=<saveId>                  -> { success }                  (or body { id })
 *
 * The reading card from /api/cards/* carries `id`, `scope` and `topic`; the
 * page sends those three back. An entry has the same fields lib/diary.js
 * (the localStorage mock) used, so the diary page renders it unchanged:
 *   { id, savedAt, cardId, cardName, image, imageAlt, category,
 *     categoryLabel, text, adviceTitle, advice }
 *
 * What gets saved is checked by the SERVER:
 *   - scope/topic must be one of the eight real readings, and
 *   - this account must actually have drawn that card for that reading
 *     (draw_history), so a client cannot save a card it never drew.
 * The text is read back from card_meanings when the diary is listed; it is
 * never copied from the request. Saving the same reading twice on one day
 * is a no-op that returns the existing entry.
 * ---------------------------------------------------------------------
 */

import db from "@/lib/db";
import { requireUser } from "@/lib/apiAuth";
import { KIND_LABELS, isValidReading, splitParagraphs } from "@/lib/cardQueries";

function toDiaryEntry(row) {
  const label = KIND_LABELS[row.topic] || row.topic;
  return {
    id: row.id,
    savedAt: row.saved_at, // "YYYY-MM-DD"
    cardId: row.card_id,
    cardName: row.name,
    image: row.pict,
    imageAlt: `${row.name}, tarot card`,
    category: row.topic,
    categoryLabel: label,
    text: splitParagraphs(row.summary).join(" "),
    adviceTitle: `Your Advice for ${label}`,
    advice: row.advice || "",
  };
}

// LEFT JOIN: an entry still lists if an admin later removed that reading's text.
async function findEntries(executor, accountId, extraWhere = "", extraParams = []) {
  const [rows] = await executor.execute(
    `SELECT s.id, DATE_FORMAT(s.date, '%Y-%m-%d') AS saved_at, s.scope, s.topic,
            c.id AS card_id, c.name, c.pict, m.summary, m.advice
       FROM saves s
       JOIN diaries d ON d.id = s.diary_id
       JOIN cards   c ON c.id = s.card_id
       LEFT JOIN card_meanings m
              ON m.card_id = s.card_id AND m.scope = s.scope AND m.topic = s.topic
      WHERE d.acc_id = ? ${extraWhere}
      ORDER BY s.date DESC, s.saved_at DESC, s.id DESC`,
    [accountId, ...extraParams]
  );
  return rows.map(toDiaryEntry);
}

/**
 * Each account has exactly one diary (UNIQUE acc_id). Created on first use,
 * which also covers Google sign-ups that never went through /register.
 * The LAST_INSERT_ID(id) trick makes insertId the existing id on a repeat.
 */
async function ensureDiary(executor, accountId) {
  const [result] = await executor.execute(
    "INSERT INTO diaries (acc_id) VALUES (?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)",
    [accountId]
  );
  return result.insertId;
}

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    return Response.json({ success: true, entries: await findEntries(db, auth.account.id) });
  } catch (error) {
    console.error("Diary GET error:", error);
    return Response.json({ success: false, message: "Could not load your diary" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const accountId = auth.account.id;

    const body = (await request.json().catch(() => null)) || {};
    const cardId = Number(body.cardId);
    const scope = typeof body.scope === "string" ? body.scope : "";
    const topic = typeof body.topic === "string" ? body.topic.toLowerCase() : "";
    if (!Number.isInteger(cardId) || cardId <= 0) {
      return Response.json({ success: false, message: "cardId is required" }, { status: 400 });
    }
    if (!isValidReading(scope, topic)) {
      return Response.json({ success: false, message: "scope and topic must describe a real reading" }, { status: 400 });
    }

    const [cards] = await db.execute("SELECT id FROM cards WHERE id = ? LIMIT 1", [cardId]);
    if (cards.length === 0) {
      return Response.json({ success: false, message: "That card does not exist" }, { status: 404 });
    }

    // The account must have drawn this card for this reading.
    const [drawn] = await db.execute(
      "SELECT id FROM draw_history WHERE account_id = ? AND card_id = ? AND scope = ? AND topic = ? LIMIT 1",
      [accountId, cardId, scope, topic]
    );
    if (drawn.length === 0) {
      return Response.json({ success: false, message: "You can only save a reading you have drawn" }, { status: 403 });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const diaryId = await ensureDiary(connection, accountId);
      // Lock the diary row so two simultaneous saves cannot both insert.
      await connection.execute("SELECT id FROM diaries WHERE id = ? FOR UPDATE", [diaryId]);

      const [existing] = await connection.execute(
        "SELECT id FROM saves WHERE diary_id = ? AND card_id = ? AND scope = ? AND topic = ? AND date = CURDATE() LIMIT 1",
        [diaryId, cardId, scope, topic]
      );
      let saveId;
      let duplicate = false;
      if (existing.length > 0) {
        saveId = existing[0].id;
        duplicate = true;
      } else {
        const [result] = await connection.execute(
          "INSERT INTO saves (card_id, diary_id, scope, topic, date) VALUES (?, ?, ?, ?, CURDATE())",
          [cardId, diaryId, scope, topic]
        );
        saveId = result.insertId;
      }
      await connection.commit();

      const [entry] = await findEntries(db, accountId, "AND s.id = ?", [saveId]);
      return duplicate
        ? Response.json({ success: true, entry, duplicate: true })
        : Response.json({ success: true, entry }, { status: 201 });
    } catch (error) {
      await connection.rollback().catch(() => {});
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Diary POST error:", error);
    return Response.json({ success: false, message: "Could not save your reading" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const fromQuery = new URL(request.url).searchParams.get("id");
    const id = Number(fromQuery ?? ((await request.json().catch(() => null)) || {}).id);
    if (!Number.isInteger(id) || id <= 0) return Response.json({ success: false, message: "id is required" }, { status: 400 });

    // The JOIN on the caller's own diary is the ownership check.
    const [result] = await db.execute(
      `DELETE s FROM saves s
         JOIN diaries d ON d.id = s.diary_id
        WHERE s.id = ? AND d.acc_id = ?`,
      [id, auth.account.id]
    );
    if (result.affectedRows === 0) return Response.json({ success: false, message: "Diary entry not found" }, { status: 404 });
    return Response.json({ success: true });
  } catch (error) {
    console.error("Diary DELETE error:", error);
    return Response.json({ success: false, message: "Could not delete that entry" }, { status: 500 });
  }
}
