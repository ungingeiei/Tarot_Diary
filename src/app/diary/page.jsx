"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark, MenuIcon, CloseXIcon, TrashIcon } from "../../components/TarotVisual";
import { NavMenu } from "../../components/NavMenu";
import { deleteDiaryEntry, getDiaryEntries } from "../../lib/diary";

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

function formatDiaryDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
  return `${day} ${month} ${date.getFullYear()}`;
}

export default function DiaryPage() {
  const router = useRouter();
  const [entries, setEntries] = useState([]);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [loaded, setLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Stand-in for: GET /api/diary
    setEntries(getDiaryEntries());
    setLoaded(true);
  }, []);

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = (id) => {
    // Stand-in for: DELETE /api/diary/:id
    setEntries(deleteDiaryEntry(id));
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
        {!loaded ? null : entries.length === 0 ? (
          <p className="diary-empty">
            Your diary is empty. Save a reading and it will appear here.
          </p>
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
