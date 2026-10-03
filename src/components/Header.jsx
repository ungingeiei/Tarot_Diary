"use client";

import { useEffect, useState } from "react";
import { BrandMark, MenuIcon, CloseXIcon, HeartCoinIcon } from "./TarotVisual";
import { NavMenu } from "./NavMenu";

export function AppHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    async function loadCoins() {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();

        if (data.success) {
          setCredits(data.user.coins);
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