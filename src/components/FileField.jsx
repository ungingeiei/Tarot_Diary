"use client";

import { useRef } from "react";

/**
 * ---------------------------------------------------------------------
 * FileField — a file picker that belongs to this page
 * ---------------------------------------------------------------------
 * Replaces a bare <input type="file">. The browser draws that control
 * itself — on this dark gold panel it came out as a grey OS button
 * reading "เลือกไฟล์ / ไม่ได้เลือกไฟล์ใด", in the system font, which no
 * amount of CSS reaches: the button is a shadow part that Safari and
 * Firefox do not expose at all.
 *
 * So the real input is kept, because it is what opens the file dialog
 * and what carries the file, and it is moved out of sight behind a
 * button of our own. Clicking the button clicks the input.
 *
 * `onChange` receives the original change event, so callers read
 * `event.target.files[0]` exactly as before.
 *
 * --- ADDED: `previewUrl` draws the chosen image as a small square
 * INSIDE the field. The add-card form used to put a 120x170 preview in
 * a block underneath, which made the whole control grow the moment a
 * file was picked and shoved the rest of the form down. A thumbnail
 * that sits in the row keeps the field exactly the size it was empty.
 * ---------------------------------------------------------------------
 */
export function FileField({
  accept,
  disabled = false,
  onChange,
  fileName = "",
  label = "Choose image",
  emptyText = "No file chosen",
  ariaLabel,
  previewUrl = "",
}) {
  const inputRef = useRef(null);

  return (
    <div className={`file-field${disabled ? " is-disabled" : ""}`}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={onChange}
        className="file-field-input"
        aria-label={ariaLabel || label}
        // Not display:none or hidden — a hidden input cannot be focused,
        // which would take the field off the keyboard path entirely.
        tabIndex={-1}
      />

      <button
        type="button"
        className="file-field-button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </button>

      {/* Decoration: the filename beside it already says which file
          this is, so a screen reader gains nothing from the image. */}
      {previewUrl && (
        <img src={previewUrl} alt="" aria-hidden="true" className="file-field-thumb" />
      )}

      <span className={`file-field-name${fileName ? "" : " is-empty"}`}>
        {fileName || emptyText}
      </span>
    </div>
  );
}
