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

  try {
    const parsed = readBody(await request.json().catch(() => ({})));
    if (parsed.error) return parsed.error;
    const { name, scope, topic, prediction, advice, image } = parsed;

    const kind = toKind(name);
    if (!kind) return badRequest("Card name must contain letters or numbers");

    // A card already in the deck gains a reading rather than a duplicate
    // row — adding "The Fool / Career" must not create a second Fool.
    const [existing] = await db.execute("SELECT id FROM cards WHERE kind = ? LIMIT 1", [kind]);
    let cardId;
    if (existing.length > 0) {
      cardId = existing[0].id;
      if (image) await db.execute("UPDATE cards SET pict = ? WHERE id = ?", [image, cardId]);
    } else {
      const [res] = await db.execute(
        "INSERT INTO cards (kind, name, pict, pred, adv) VALUES (?, ?, ?, '', NULL)",
        [kind, name, image || ""]
      );
      cardId = res.insertId;
    }

    const [clash] = await db.execute(
      "SELECT id FROM card_meanings WHERE card_id = ? AND scope = ? AND topic = ? LIMIT 1",
      [cardId, scope, topic]
    );
    if (clash.length > 0) {
      return Response.json(
        { success: false, message: `${name} already has a ${LABELS[topic]} reading` },
        { status: 409 }
      );
    }

    const [res] = await db.execute(
      `INSERT INTO card_meanings (card_id, scope, topic, summary, advice)
       VALUES (?, ?, ?, ?, ?)`,
      [cardId, scope, topic, prediction, advice]
    );

    return Response.json({ success: true, id: res.insertId });
  } catch (err) {
    console.error("Admin cards POST error:", err);
    return Response.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}

export async function PUT(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = readBody(body);
    if (parsed.error) return parsed.error;
    const { name, scope, topic, prediction, advice, image } = parsed;

    const id = body.id;
    if (!id) return badRequest("Missing id");

    const [rows] = await db.execute("SELECT card_id FROM card_meanings WHERE id = ? LIMIT 1", [id]);
    if (rows.length === 0) {
      return Response.json({ success: false, message: "Not found" }, { status: 404 });
    }
    const cardId = rows[0].card_id;

    // Renaming here renames the card everywhere it appears, which is
    // the point: the name belongs to the card, not to this reading.
    await db.execute("UPDATE cards SET name = ?, kind = ? WHERE id = ?", [name, toKind(name), cardId]);
    if (image) await db.execute("UPDATE cards SET pict = ? WHERE id = ?", [image, cardId]);

    await db.execute(
      "UPDATE card_meanings SET scope = ?, topic = ?, summary = ?, advice = ? WHERE id = ?",
      [scope, topic, prediction, advice, id]
    );

    return Response.json({ success: true });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return Response.json(
        { success: false, message: "Another card already uses that name or category" },
        { status: 409 }
      );
    }
    console.error("Admin cards PUT error:", err);
    return Response.json({ success: false, message: "Something went wrong" }, { status: 500 });
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
      try {
        await db.execute("DELETE FROM cards WHERE id = ?", [cardId]);
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
