"use client";

import { useEffect, useState } from "react";
import { BrandMark, MenuIcon, CloseXIcon, HeartCoinIcon } from "./TarotVisual";
import { NavMenu } from "./NavMenu";

/**
 * AppHeader
 * ---------
 * Shared top bar for category / draw / reading. It owns the drawer's
 * open/closed state itself, so every page that renders <AppHeader />
 * gets the exact same hamburger -> NavMenu drawer behaviour for free
 * — pressing the icon here no longer jumps straight to /diary, it
 * opens the same menu shown on the diary page (see components/NavMenu.jsx
 * for what each menu item does).
 *
 * The diary page does NOT use this component — it builds its own
 * header + NavMenu inline (in app/diary/page.jsx) because its "X"
 * icon has extra behaviour (navigating back to /category). Here, the
 * "X" just closes the drawer.
 */
export function AppHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    async function loadCoins() {
      try {
        const response = await fetch("/api/header");
        const data = await response.json();

        if (data.success) {
          setCredits(data.coins);
        }
      } catch (error) {
        console.error("Failed to load coins:", error);
      }
    }

    loadCoins();
  }, []);

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <button
            type="button"
            className="icon-button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <CloseXIcon /> : <MenuIcon />}
          </button>

          {!menuOpen && <BrandMark />}
        </div>

        <div
          className="credits-pill"
          aria-label={`${credits} credits`}
        >
          <span className="coin">
            <HeartCoinIcon />
          </span>

          <span>{credits}</span>
        </div>
      </header>

      {menuOpen && (
        <NavMenu
          onNavigate={() => setMenuOpen(false)}
          onDismiss={() => setMenuOpen(false)}
        />
      )}
    </>
  );
}
