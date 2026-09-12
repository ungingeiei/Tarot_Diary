"use client";

import { useRouter } from "next/navigation";
import { signOut } from "../lib/auth";

/**
 * NavMenu
 * -------
 * The drawer that slides in from the left edge when the header's
 * hamburger button is pressed (HOME / ABOUT / PROFILE / DIARY / LOGOUT).
 * Renders its own dim backdrop + fixed left panel — see the
 * `.nav-menu-backdrop` / `.nav-menu` rules in app/globals.css if you
 * want to change its width, height, or overlay color.
 *
 * Each button's destination is defined right here in one place, so
 * if you need to point an item somewhere else later, this is the
 * only file to touch. HOME, ABOUT, and PROFILE currently point at
 * routes that don't exist yet (/home, /about, /profile) — HOME is
 * intentionally left 404ing until a real Home page is built; swap
 * these for real routes once those pages exist.
 *
 * `onNavigate` fires after any menu item is clicked, so the parent
 * page can close the drawer (and flip its header icon back from
 * "X" to the hamburger). Clicking the dim backdrop area also closes
 * the drawer the same way, but WITHOUT navigating anywhere — only
 * the header's own "X" icon counts as the explicit "close" action
 * that sends the user back to /category (see app/diary/page.jsx).
 */
export function NavMenu({ onNavigate, onDismiss }) {
  const router = useRouter();

  const go = (path) => {
    onNavigate?.();
    router.push(path);
  };

  const handleLogout = () => {
    // Stand-in for: POST /api/auth/logout
    signOut();
    onNavigate?.();
    router.push("/login");
  };

  return (
    <>
      {/* Dim backdrop covering the rest of the page — click to dismiss
          the drawer without navigating away. */}
      <div className="nav-menu-backdrop" onClick={() => onDismiss?.()} aria-hidden="true" />

      <nav className="nav-menu" aria-label="Main menu">
        {/* Intentionally 404s — there's no /home page yet. Point this
            at the real route once one exists. */}
        <button type="button" className="nav-menu-btn" onClick={() => go("/home")}>
          HOME
        </button>
        {/* TODO: build an /about page — this route doesn't exist yet */}
        <button type="button" className="nav-menu-btn" onClick={() => go("/about")}>
          ABOUT
        </button>
        {/* TODO: build a /profile page — this route doesn't exist yet */}
        <button type="button" className="nav-menu-btn" onClick={() => go("/profile")}>
          PROFILE
        </button>
        <button type="button" className="nav-menu-btn" onClick={() => go("/diary")}>
          DIARY
        </button>
        <button type="button" className="nav-menu-btn nav-menu-logout" onClick={handleLogout}>
          LOGOUT
        </button>
      </nav>
    </>
  );
}
