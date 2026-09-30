/**
 * ---------------------------------------------------------------------
 * MOCK DIARY STORAGE — stand-in for a real backend.
 * ---------------------------------------------------------------------
 * Saved readings live in localStorage. Swap the bodies of these
 * functions for real API calls once a backend exists — every caller
 * (reading page, diary page) only depends on this file.
 * ---------------------------------------------------------------------
 */

const DIARY_KEY = "tarotdiary_entries";

export function getDiaryEntries() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DIARY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Stand-in for: POST /api/diary
export function saveDiaryEntry(entry) {
  if (typeof window === "undefined") return null;
  const entries = getDiaryEntries();
  const newEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: new Date().toISOString(),
    ...entry,
  };
  window.localStorage.setItem(DIARY_KEY, JSON.stringify([newEntry, ...entries]));
  return newEntry;
}

// Stand-in for: DELETE /api/diary/:id
export function deleteDiaryEntry(id) {
  if (typeof window === "undefined") return [];
  const next = getDiaryEntries().filter((entry) => entry.id !== id);
  window.localStorage.setItem(DIARY_KEY, JSON.stringify(next));
  return next;
}
