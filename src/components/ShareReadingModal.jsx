"use client";

import { useRef, useState } from "react";
import { CloseXIcon, ShareTarotCard } from "./TarotVisual";

// Ordered theme list — the toggle pill cycles through these, in order,
// wrapping back to the start. Each key has a matching pair of CSS
// classes (.share-panel.theme-<key> and .share-tarot-frame.theme-<key>)
// in globals.css that set its own gradient, glow, and line color.
const THEMES = [
  { key: "sea", label: "Sea" },
  { key: "flower", label: "Flower" },
  { key: "mountain", label: "Mountain" },
  { key: "star", label: "Star" },
  { key: "sky", label: "Sky" },
];

/**
 * ShareReadingModal
 * ------------------
 * The "Share Reading" preview: a themeable branded card the user can
 * cycle through (Sea / Flower / Mountain / Star / Sky), then download
 * as a PNG straight to their device. Rendering the shareable graphic
 * is kept separate from the detailed reading page — this is the
 * compact, pretty version made to be posted/sent elsewhere.
 *
 * Theme toggle: the pill shows the CURRENT theme name; pressing it
 * advances to the next theme in the list (wrapping around).
 *
 * Save-to-device: the capture area (title row + card + caption) is
 * rasterized with html2canvas and downloaded as a PNG. The Share
 * Reading button itself sits outside the capture area so it never
 * ends up in the exported image.
 */
export function ShareReadingModal({ card, categoryLabel, onClose }) {
  const [themeIndex, setThemeIndex] = useState(0);
  const [status, setStatus] = useState("idle"); // "idle" | "saving" | "error"
  const captureRef = useRef(null);

  const theme = THEMES[themeIndex];
  const cycleTheme = () => setThemeIndex((i) => (i + 1) % THEMES.length);

  const handleShare = async () => {
    if (!captureRef.current || status === "saving") return;
    setStatus("saving");
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: null,
        scale: Math.min(3, window.devicePixelRatio * 2 || 2),
        useCORS: true,
      });

      const dataUrl = canvas.toDataURL("image/png");
      const fileSafeName = (card?.name || "tarot-reading").toLowerCase().replace(/\s+/g, "-");

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `tarot-diary-${fileSafeName}-${theme.key}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      setStatus("idle");
    } catch (err) {
      console.error("Failed to save reading image:", err);
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 2500);
    }
  };

  return (
    <div className="share-modal-backdrop" role="dialog" aria-modal="true" aria-label="Share reading">
      <button type="button" className="share-modal-close" aria-label="Close" onClick={onClose}>
        <CloseXIcon />
      </button>

      <div className="share-modal-inner">
        <div className={`share-panel theme-${theme.key}`} ref={captureRef}>
          <div className="share-toprow">
            <button type="button" className="theme-toggle-pill" onClick={cycleTheme}>
              {theme.label}
            </button>
            <h2 className="share-title">{card.name}</h2>
            <span className="diary-pill share-diary-pill">{categoryLabel || "Diary"}</span>
          </div>

          <div className={`share-tarot-frame theme-${theme.key}`}>
            <ShareTarotCard name={card.name} />
          </div>

          <p className="share-caption">{card.shareBlurb}</p>
        </div>

        <div className="share-actions">
          <button type="button" className="gold-button-md" onClick={handleShare} disabled={status === "saving"}>
            {status === "saving" ? "Saving…" : status === "error" ? "Try Again" : "Share Reading"}
          </button>
        </div>
      </div>
    </div>
  );
}
