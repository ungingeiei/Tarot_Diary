"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SelectField } from "./SelectField";

/**
 * ---------------------------------------------------------------------
 * DateField — a calendar that belongs to this page
 * ---------------------------------------------------------------------
 * Replaces <input type="date">. The browser's own picker is drawn by the
 * OS: a white panel with its own typography that cannot be styled, which
 * on this dark gold panel looked like a different program had opened.
 *
 * It also could not be navigated: reaching 1998 from today meant clicking
 * the month arrow a few hundred times. Month and year are dropdowns here.
 *
 * Value in and out is "YYYY-MM-DD", or "" for empty — the same shape the
 * `dob` column and /api/profile already use. Dates are assembled from
 * their parts as strings rather than through Date#toISOString, which
 * would shift the day for anyone east or west of UTC.
 * ---------------------------------------------------------------------
 */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const pad = (n) => String(n).padStart(2, "0");
const toValue = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** "1998-11-14" -> { y: 1998, m: 10, d: 14 }, or null. */
function parse(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  if (m < 0 || m > 11 || d < 1 || d > 31) return null;
  return { y, m, d };
}

function formatLong(value) {
  const parts = parse(value);
  if (!parts) return "";
  return `${parts.d} ${MONTHS[parts.m].toUpperCase()} ${parts.y}`;
}

export function DateField({
  value = "",
  onChange,
  placeholder = "Date",
  // Wide enough for a birthday without being an endless list.
  yearsBack = 110,
  yearsForward = 0,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const today = useMemo(() => {
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
  }, []);

  const selected = parse(value);

  // Which month the grid is showing. Opening on a chosen date starts
  // there; otherwise it starts on this month.
  const [view, setView] = useState(() => ({
    y: selected?.y ?? today.y,
    m: selected?.m ?? today.m,
  }));

  // Re-opening after the value changed elsewhere should land on it.
  useEffect(() => {
    if (open && selected) setView({ y: selected.y, m: selected.m });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on a click outside or on Escape, the way a dropdown is expected
  // to behave; without this the panel would stay open over the form.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const years = useMemo(() => {
    const newest = today.y + yearsForward;
    return Array.from({ length: yearsBack + yearsForward + 1 }, (_, i) => newest - i);
  }, [today.y, yearsBack, yearsForward]);

  // The grid: blanks for the days before the 1st, then this month's days.
  const cells = useMemo(() => {
    const firstWeekday = new Date(view.y, view.m, 1).getDay();
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    return [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
  }, [view]);

  const shiftMonth = (delta) => {
    setView((v) => {
      const next = new Date(v.y, v.m + delta, 1);
      return { y: next.getFullYear(), m: next.getMonth() };
    });
  };

  const choose = (day) => {
    onChange?.(toValue(view.y, view.m, day));
    setOpen(false);
  };

  return (
    <div className="date-field" ref={wrapRef}>
      <button
        type="button"
        className={`date-field-trigger${value ? "" : " is-empty"}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>{formatLong(value) || placeholder}</span>
        <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2"
                fill="none" stroke="currentColor" strokeWidth="1.5" />
          <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="1.5" />
          <line x1="8" y1="3" x2="8" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="16" y1="3" x2="16" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="date-panel" role="dialog" aria-label="Choose a date">
          <div className="date-panel-head">
            <button
              type="button"
              className="date-nav"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
            >
              ‹
            </button>

            <div className="date-selects">
              <SelectField
                compact
                ariaLabel="Month"
                value={view.m}
                onChange={(m) => setView((v) => ({ ...v, m: Number(m) }))}
                options={MONTHS.map((name, i) => ({ value: i, label: name }))}
              />

              <SelectField
                compact
                ariaLabel="Year"
                value={view.y}
                onChange={(y) => setView((v) => ({ ...v, y: Number(y) }))}
                options={years.map((y) => ({ value: y, label: String(y) }))}
              />
            </div>

            <button
              type="button"
              className="date-nav"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className="date-weekdays" aria-hidden="true">
            {WEEKDAYS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="date-grid">
            {cells.map((day, i) =>
              day === null ? (
                <span key={`blank-${i}`} className="date-cell is-blank" />
              ) : (
                <button
                  key={day}
                  type="button"
                  className={
                    "date-cell" +
                    (selected && selected.y === view.y && selected.m === view.m && selected.d === day
                      ? " is-selected"
                      : "") +
                    (today.y === view.y && today.m === view.m && today.d === day
                      ? " is-today"
                      : "")
                  }
                  onClick={() => choose(day)}
                >
                  {day}
                </button>
              )
            )}
          </div>

          <div className="date-panel-foot">
            <button
              type="button"
              className="date-clear"
              onClick={() => {
                onChange?.("");
                setOpen(false);
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DateField;
