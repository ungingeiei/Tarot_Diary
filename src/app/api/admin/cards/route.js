/**
 * /api/admin/cards — the deck, for the admin console.
 *
 *   GET                 -> every card reading, newest card first
 *   POST   { name, category, prediction, advice, image }
 *   PUT    { id, name, category, prediction, advice, image }
 *   DELETE ?id=<meaningId>
 *
 * Replaces the useState array in addcard/page.jsx, where added cards
 * lived until the next refresh.
 *
 * ONE ROW HERE = ONE READING, not one card. The console's dropdown
 * mixes the three periods and the five categories in a single list, and
 * that is exactly the grain of `card_meanings`: a card named in two
 * categories is two rows sharing one `cards` row.
 */

import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { dropImageIfUnused } from "@/lib/cardImages";

// label -> (scope, topic) in the database
const TOPICS = {
  Daily: ["period", "daily"],
  Weekly: ["period", "weekly"],
  Monthly: ["period", "monthly"],
  Love: ["category", "love"],
  Finance: ["category", "finance"],
  Career: ["category", "career"],
  Pets: ["category", "pets"],
  Health: ["category", "health"],
};

const LABELS = Object.fromEntries(
  Object.entries(TOPICS).map(([label, [, topic]]) => [topic, label])
);

/** "The Hanged Man" -> "the_hanged_man", which is what `cards.kind` holds. */
function toKind(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Admin only. A normal session must not be able to rewrite the deck
 * every other user reads, so this checks the role on the session rather
 * than trusting anything the browser sends.
 */
async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    return { error: Response.json({ success: false, message: "Not signed in" }, { status: 401 }) };
  }
  if (session.role !== "admin") {
    return { error: Response.json({ success: false, message: "Admins only" }, { status: 403 }) };
  }
  return { session };
}

function badRequest(message) {
  return Response.json({ success: false, message }, { status: 400 });
}

/** Validates the four fields every write shares. */
function readBody(body) {
  const clean = (v) => (typeof v === "string" ? v.trim() : "");
  const name = clean(body.name);
  const category = clean(body.category);
  const prediction = clean(body.prediction);
  const advice = clean(body.advice);
  const image = clean(body.image);

  if (!name) return { error: badRequest("Card name is required") };
  if (!TOPICS[category]) return { error: badRequest("Pick a valid category or period") };
  if (!prediction) return { error: badRequest("Prediction is required") };
  if (!advice) return { error: badRequest("Advice is required") };

  const [scope, topic] = TOPICS[category];
  return { name, scope, topic, prediction, advice, image };
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const [rows] = await db.execute(
      `SELECT m.id, m.scope, m.topic, m.summary, m.advice,
              c.id AS card_id, c.kind, c.name, c.pict
         FROM card_meanings m
         JOIN cards c ON c.id = m.card_id
        ORDER BY c.id DESC, m.scope, m.topic`
    );

    return Response.json({
      success: true,
      cards: rows.map((r) => ({
        id: r.id,
        cardId: r.card_id,
        kind: r.kind,
        name: r.name,
        title: String(r.name).toUpperCase(),
        category: LABELS[r.topic] || r.topic,
        prediction: r.summary,
        advice: r.advice,
        image: r.pict,
      })),
    });
  } catch (err) {
    console.error("Admin cards GET error:", err);
    return Response.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  let connection;
  try {
    const parsed = readBody(await request.json().catch(() => ({})));
    if (parsed.error) return parsed.error;
    const { name, scope, topic, prediction, advice, image } = parsed;

    const kind = toKind(name);
    if (!kind) return badRequest("Card name must contain letters or numbers");

    // The card row and its reading are written together or not at all:
    // the duplicate check below comes AFTER the card may already have
    // been created or had its picture swapped, and without a transaction
    // a rejected add would leave those changes behind.
    connection = await db.getConnection();
    await connection.beginTransaction();

    // A card already in the deck gains a reading rather than a duplicate
    // row — adding "The Fool / Career" must not create a second Fool.
    //
    // Matched on the NAME as well as the slug. The seeded deck's slugs
    // came from its source data ("fool", "high_priestess"), which is not
    // what toKind() derives from the display name ("the_fool"), so
    // matching on the slug alone quietly created a duplicate card for
    // every seeded card an admin added a reading to.
    const [existing] = await connection.execute(
      "SELECT id, pict FROM cards WHERE name = ? OR kind = ? LIMIT 1",
      [name, kind]
    );
    let cardId;
    let replacedImage = null;

    if (existing.length > 0) {
      cardId = existing[0].id;
      if (image && existing[0].pict !== image) {
        await connection.execute("UPDATE cards SET pict = ? WHERE id = ?", [image, cardId]);
        replacedImage = existing[0].pict;
      }
    } else {
      const [res] = await connection.execute(
        "INSERT INTO cards (kind, name, pict, pred, adv) VALUES (?, ?, ?, '', NULL)",
        [kind, name, image || ""]
      );
      cardId = res.insertId;
    }

    const [clash] = await connection.execute(
      "SELECT id FROM card_meanings WHERE card_id = ? AND scope = ? AND topic = ? LIMIT 1",
      [cardId, scope, topic]
    );
    if (clash.length > 0) {
      await connection.rollback();
      return Response.json(
        { success: false, message: `${name} already has a ${LABELS[topic]} reading` },
        { status: 409 }
      );
    }

    const [res] = await connection.execute(
      `INSERT INTO card_meanings (card_id, scope, topic, summary, advice)
       VALUES (?, ?, ?, ?, ?)`,
      [cardId, scope, topic, prediction, advice]
    );

    await connection.commit();

    // Only once the swap is committed — rolling back would have put the
    // old picture back in use.
    if (replacedImage) await dropImageIfUnused(replacedImage, cardId);

    return Response.json({ success: true, id: res.insertId });
  } catch (err) {
    if (connection) await connection.rollback().catch(() => {});
    if (err.code === "ER_DUP_ENTRY") {
      return Response.json(
        { success: false, message: "Another card already uses that name" },
        { status: 409 }
      );
    }
    console.error("Admin cards POST error:", err);
    return Response.json({ success: false, message: "Something went wrong" }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

export async function PUT(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  let connection;
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = readBody(body);
    if (parsed.error) return parsed.error;
    const { name, scope, topic, prediction, advice, image } = parsed;

    const id = body.id;
    if (!id) return badRequest("Missing id");

    // The card and the reading change together. Without this, moving a
    // reading to a category the card already has rejected the request
    // AFTER the rename had been written, leaving the card renamed by a
    // call that answered 409.
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      "SELECT card_id FROM card_meanings WHERE id = ? LIMIT 1",
      [id]
    );
    if (rows.length === 0) {
      await connection.rollback();
      return Response.json({ success: false, message: "Not found" }, { status: 404 });
    }
    const cardId = rows[0].card_id;

    // Renaming here renames the card everywhere it appears, which is
    // the point: the name belongs to the card, not to this reading.
    //
    // `kind` is deliberately left alone. It is the card's own
    // identifier, so rewriting it on every edit would churn an id for
    // the sake of a display name, and would have renamed the seeded
    // slugs the first time anyone corrected a typo.
    await connection.execute(
      "UPDATE cards SET name = ? WHERE id = ?",
      [name, cardId]
    );

    let replacedImage = null;
    if (image) {
      const [[before]] = await connection.execute(
        "SELECT pict FROM cards WHERE id = ?",
        [cardId]
      );
      if (before?.pict !== image) {
        await connection.execute("UPDATE cards SET pict = ? WHERE id = ?", [image, cardId]);
        replacedImage = before?.pict || null;
      }
    }

    const [[was]] = await connection.execute(
      "SELECT scope, topic FROM card_meanings WHERE id = ?",
      [id]
    );

    await connection.execute(
      "UPDATE card_meanings SET scope = ?, topic = ?, summary = ?, advice = ? WHERE id = ?",
      [scope, topic, prediction, advice, id]
    );

    // A reading moved to another category takes the diary entries saved
    // from it with it. `saves` records the (card, scope, topic) it was
    // saved under, and the diary reads its text back through that triple
    // — left behind, an entry would still list but with nothing to say.
    if (was && (was.scope !== scope || was.topic !== topic)) {
      await connection.execute(
        "UPDATE saves SET scope = ?, topic = ? WHERE card_id = ? AND scope = ? AND topic = ?",
        [scope, topic, cardId, was.scope, was.topic]
      );
    }

    await connection.commit();

    // Only once the swap is committed — a rollback would have put the old
    // picture back in use.
    if (replacedImage) await dropImageIfUnused(replacedImage, cardId);

    return Response.json({ success: true });
  } catch (err) {
    if (connection) await connection.rollback().catch(() => {});
    if (err.code === "ER_DUP_ENTRY") {
      return Response.json(
        { success: false, message: "Another card already uses that name or category" },
        { status: 409 }
      );
    }
    console.error("Admin cards PUT error:", err);
    return Response.json({ success: false, message: "Something went wrong" }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

export async function DELETE(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return badRequest("Missing id");

    const [rows] = await db.execute("SELECT card_id FROM card_meanings WHERE id = ? LIMIT 1", [id]);
    if (rows.length === 0) {
      return Response.json({ success: false, message: "Not found" }, { status: 404 });
    }
    const cardId = rows[0].card_id;

    await db.execute("DELETE FROM card_meanings WHERE id = ?", [id]);

    // A card with no readings left would be undrawable and invisible
    // everywhere except this console, so it goes too — unless a diary
    // entry still points at it, which the foreign key will refuse.
    const [left] = await db.execute(
      "SELECT COUNT(*) AS n FROM card_meanings WHERE card_id = ?",
      [cardId]
    );
    if (left[0].n === 0) {
      const [[card]] = await db.execute("SELECT pict FROM cards WHERE id = ?", [cardId]);
      try {
        await db.execute("DELETE FROM cards WHERE id = ?", [cardId]);
        // Only once the row is really gone — a card kept alive by a diary
        // entry still needs its picture.
        await dropImageIfUnused(card?.pict, cardId);
      } catch (err) {
        if (err.code !== "ER_ROW_IS_REFERENCED_2") throw err;
      }
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("Admin cards DELETE error:", err);
    return Response.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}
