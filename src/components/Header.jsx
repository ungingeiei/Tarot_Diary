"use client";

import { useState } from "react";
import { BrandMark, MenuIcon, CloseXIcon, HeartCoinIcon } from "./TarotVisual";
import { NavMenu } from "./NavMenu";
import { useSession } from "../lib/auth";

export function AppHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  // The shared session rather than a fetch of its own: every page draws
  // this header, and each one was asking /api/auth/me again. The store
  // also takes the new balance from the "tarotdiary-coins-change" event,
  // so a draw or a check-in updates the number without a round trip.
  const { user } = useSession();
  const credits = user?.coins ?? 0;
  // Coins pay for readings, and an admin does not have one. Showing a
  // balance they can neither spend nor need only made the console look
  // like the reading side of the app.
  const showCredits = Boolean(user) && user.role !== "admin";

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

        {showCredits && (
          <div
            className="credits-pill"
            aria-label={`${credits} credits`}
          >
            <span className="coin">
              <HeartCoinIcon />
            </span>

            <span>{credits}</span>
          </div>
        )}
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