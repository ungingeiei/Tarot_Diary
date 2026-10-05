"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark, MenuIcon, CloseXIcon, TrashIcon } from "../../components/TarotVisual";
import { NavMenu } from "../../components/NavMenu";

/**
 * Diary page  (/diary)
 * --------------------
 * Now backed by the API instead of lib/diary.js (localStorage):
 *   - GET    /api/diary          the signed-in user's saved readings
 *   - DELETE /api/diary?id=...   delete one of them
 * Signed-out visitors are sent to /login.
 */

const CATEGORY_ACCENTS = {
  love: "#d98aa3",
  finance: "#c9a96e",
  career: "#7ea9d8",
  pets: "#8fd9b0",
  health: "#7fd1c0",
};

function accentFor(category) {
  return CATEGORY_ACCENTS[category] || "#8f7fd1";
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function formatDiaryDate(value) {
  // The API sends a plain date, "2026-10-05". Read it as text: turning it
  // into a Date would treat it as UTC midnight and show the previous day
  // in time zones behind UTC.
  const plain = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || "");
  if (plain) return `${Number(plain[3])} ${MONTHS[Number(plain[2]) - 1]} ${plain[1]}`;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export default function DiaryPage() {
  const router = useRouter();
  const [entries, setEntries] = useState([]);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/diary", { cache: "no-store" });
        if (cancelled) return;
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Could not load your diary");
        }
        setEntries(data.entries);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load your diary");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async (id) => {
    if (deletingId !== null) return;
    setDeletingId(id);
    setError("");
    try {
      const res = await fetch(`/api/diary?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Could not delete that entry");
      }
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  // Header icon button: toggles the NavMenu open/closed.
  // While the menu is OPEN this button shows the "X" (close) icon —
  // pressing it then is the "close" action, which navigates back to
  // the category page. If this menu ever gets reused on a page other
  // than diary and "close" should land somewhere else, just change
  // the router.push() target below.
  const handleHeaderIconClick = () => {
    if (menuOpen) {
      setMenuOpen(false);
      router.push("/diary"); // <-- "close" destination, change here if needed later
    } else {
      setMenuOpen(true);
    }
  };

  return (
    <main className="app-page diary-page">
      {/* Header: icon button sits top-left (header-left), matching
          the AppHeader used on category/draw/reading. */}
      <header className="app-header">
        <div className="header-left">
          <button
            type="button"
            className="icon-button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={handleHeaderIconClick}
          >
            {menuOpen ? <CloseXIcon /> : <MenuIcon />}
          </button>
          {!menuOpen && <BrandMark />}
        </div>
      </header>

      {/* Drawer menu (HOME / ABOUT / PROFILE / DIARY / LOGOUT). Slides
          in from the left and overlays the page — only rendered while
          menuOpen is true. See components/NavMenu.jsx to change where
          each item navigates. */}
      {menuOpen && (
        <NavMenu
          onNavigate={() => setMenuOpen(false)}
          onDismiss={() => setMenuOpen(false)}
        />
      )}

      <div className="diary-titlebar">
        <p className="diary-eyebrow">Tarot Diary</p>
        <div className="diary-heading-row">
          <h1>My Diary</h1>
          <button type="button" className="diary-close-btn" onClick={() => router.push("/category")}>
            Close
          </button>
        </div>
        <div className="diary-divider" />
      </div>

      <div className="diary-list">
        {error && <p className="diary-empty">{error}</p>}

        {!loaded ? null : entries.length === 0 ? (
          !error && (
            <p className="diary-empty">
              Your diary is empty. Save a reading and it will appear here.
            </p>
          )
        ) : (
          entries.map((entry) => {
            const isExpanded = expandedIds.has(entry.id);
            const hasAdvice = Boolean(entry.advice);
            // Collapsed view is intentionally terse (2 lines) so a diary
            // with many saved readings stays scannable. Anything cut off,
            // plus the advice (never shown collapsed), only appears once
            // the entry is expanded via "See more".
            const isLong = (entry.text || "").length > 90;
            const showToggle = isLong || hasAdvice;
            return (
              <article
                key={entry.id}
                className="diary-entry"
                style={{ "--accent": accentFor(entry.category) }}
              >
                <div className="diary-entry-top">
                  <div className="diary-entry-name-row">
                    <h2 className="diary-entry-name">{entry.cardName}</h2>
                    <span className="diary-pill">{entry.categoryLabel}</span>
                  </div>
                  <span className="diary-entry-date">{formatDiaryDate(entry.savedAt)}</span>
                </div>

                <p className={`diary-text${isExpanded ? " expanded" : ""}`}>
                  &ldquo;{entry.text}&rdquo;
                </p>

                {isExpanded && hasAdvice && (
                  <div className="diary-advice">
                    {entry.adviceTitle && <h3>{entry.adviceTitle}</h3>}
                    <p>{entry.advice}</p>
                  </div>
                )}

                {showToggle && (
                  <button
                    type="button"
                    className="diary-readmore"
                    onClick={() => toggleExpand(entry.id)}
                  >
                    {isExpanded ? "See less" : "See more"}
                  </button>
                )}

                <button
                  type="button"
                  className="diary-delete"
                  aria-label={`Delete ${entry.cardName} entry`}
                  disabled={deletingId !== null}
                  onClick={() => handleDelete(entry.id)}
                >
                  <TrashIcon />
                </button>
              </article>
            );
          })
        )}
      </div>
    </main>
  );
}
