"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ---------------------------------------------------------------------
 * SelectField — a dropdown that belongs to this page
 * ---------------------------------------------------------------------
 * Replaces <select>. The open list of a native select is drawn by the
 * operating system: a light grey sheet with its own typography that no
 * amount of CSS can reach. `appearance: none` restyles the closed
 * control only — the moment it opens, the panel is the OS's again.
 *
 * `options` is a list of strings, or of { value, label }.
 * ---------------------------------------------------------------------
 */

function normalise(option) {
  return typeof option === "string" ? { value: option, label: option } : option;
}

export function SelectField({
  value = "",
  onChange,
  options = [],
  placeholder = "Select",
  ariaLabel,
  // The month and year pickers inside the calendar sit in a tight row and
  // need the smaller of the two sizes.
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const listRef = useRef(null);

  const items = options.map(normalise);
  const current = items.find((o) => String(o.value) === String(value));

  // Close on a click outside or on Escape, the way a dropdown is expected
  // to behave.
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

  // Opening a long list — a hundred-odd years — on its first entry would
  // leave the chosen one somewhere off screen.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const selected = listRef.current.querySelector('[data-selected="true"]');
    if (selected) selected.scrollIntoView({ block: "center" });
  }, [open]);

  return (
    <div
      className={`select-field${compact ? " is-compact" : ""}`}
      ref={wrapRef}
    >
      <button
        type="button"
        className={`select-trigger${current ? "" : " is-empty"}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className="select-value">{current ? current.label : placeholder}</span>
        <span className="select-caret" aria-hidden="true" />
      </button>

      {open && (
        <ul className="select-panel" role="listbox" ref={listRef}>
          {items.map((option) => {
            const isSelected = String(option.value) === String(value);
            return (
              <li key={String(option.value)}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-selected={isSelected}
                  className={`select-option${isSelected ? " is-selected" : ""}`}
                  onClick={() => {
                    onChange?.(option.value);
                    setOpen(false);
                  }}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default SelectField;
