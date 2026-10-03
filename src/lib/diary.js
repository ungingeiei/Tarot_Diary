/**
 * ---------------------------------------------------------------------
 * DIARY — thin client over /api/diary
 * ---------------------------------------------------------------------
 * These used to read and write localStorage, which meant a user's saved
 * readings lived in one browser only. They now call the API, which
 * stores them in `saves` against the signed-in account.
 *
 * Every function is async because a network call replaced a synchronous
 * localStorage read; callers must await them.
 * ---------------------------------------------------------------------
 */

export async function getDiaryEntries() {
  const res = await fetch("/api/diary", { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  return Array.isArray(data.entries) ? data.entries : [];
}

/**
 * Save one reading.
 *
 * Only the card and which reading it was are sent: the text itself
 * lives in `card_meanings` and is joined back on read, so a saved entry
 * cannot drift out of sync with the card it came from.
 *
 * Returns true when it was stored.
 */
export async function saveDiaryEntry({ cardId, scope, topic }) {
  const res = await fetch("/api/diary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cardId, scope, topic }),
  });
  const data = await res.json().catch(() => ({}));
  return Boolean(res.ok && data.success);
}

/** Delete one entry, then return the remaining list. */
export async function deleteDiaryEntry(id) {
  await fetch(`/api/diary?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  return getDiaryEntries();
}
