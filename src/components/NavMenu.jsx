"use client";

import { useRouter } from "next/navigation";
import { signOut, useSession } from "../lib/auth";

/**
 * NavMenu
 * -------
 * The drawer that slides in from the left edge when the header's
 * hamburger button is pressed (HOME / ABOUT / PROFILE / DIARY / LOGOUT).
 * Renders its own dim backdrop + fixed left panel — see the
 * `.nav-menu-backdrop` / `.nav-menu` rules in app/globals.css if you
 * want to change its width, height, or overlay color.
 *
 * Two menus, picked by the signed-in account's role. An admin is here
 * to run the card console, not to have a reading, so the reading items
 * (HOME, ABOUT, DIARY) are not theirs to see — every one of those pages
 * now turns an admin away anyway (useUserOnly in lib/auth.js), and a
 * menu leading to a redirect is worse than no menu item.
 *
 * Each button's destination is defined right here in one place, so if
 * you need to point an item somewhere else later, this is the only file
 * to touch.
 *
 * `onNavigate` fires after any menu item is clicked, so the parent
 * page can close the drawer (and flip its header icon back from
 * "X" to the hamburger). Clicking the dim backdrop area also closes
 * the drawer the same way, but WITHOUT navigating anywhere — only
 * the header's own "X" icon counts as the explicit "close" action
 * that sends the user back to /category (see app/diary/page.jsx).
 */
const USER_ITEMS = [
  { label: "HOME", path: "/" },
  { label: "ABOUT", path: "/about" },
  { label: "PROFILE", path: "/profile" },
  { label: "DIARY", path: "/diary" },
];

const ADMIN_ITEMS = [
  { label: "MANAGE CARDS", path: "/addcard" },
  { label: "PROFILE", path: "/admin" },
];

export function NavMenu({ onNavigate, onDismiss }) {
  const router = useRouter();
  const { user } = useSession();
  const items = user?.role === "admin" ? ADMIN_ITEMS : USER_ITEMS;

  const go = (path) => {
    onNavigate?.();
    router.push(path);
  };

  const handleLogout = async () => {
    // signOut() posts to /api/auth/logout, which is what clears the
    // httpOnly session cookie — the session lives on the server, so
    // nothing this page could clear on its own would end it.
    await signOut();
    onNavigate?.();
    router.push("/login");
  };

  return (
    <>
      {/* Dim backdrop covering the rest of the page — click to dismiss
          the drawer without navigating away. */}
      <div className="nav-menu-backdrop" onClick={() => onDismiss?.()} aria-hidden="true" />

      <nav className="nav-menu" aria-label="Main menu">
        {items.map((item) => (
          <button
            key={item.path}
            type="button"
            className="nav-menu-btn"
            onClick={() => go(item.path)}
          >
            {item.label}
          </button>
        ))}
        <button type="button" className="nav-menu-btn nav-menu-logout" onClick={handleLogout}>
          LOGOUT
        </button>
      </nav>
    </>
  );
}
