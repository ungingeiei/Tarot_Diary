"use client";

/**
 * ---------------------------------------------------------------------
 * lib/auth.js — who is signed in, according to the database
 * ---------------------------------------------------------------------
 * This file used to be a stand-in: "signed in" was a key in
 * localStorage, written by the login page and read by everyone else. The
 * real session has been an httpOnly cookie for a while now (lib/session.js),
 * and GET /api/auth/me turns that cookie into the account row — so the
 * flag was a second, weaker copy of the truth that could disagree with it:
 *
 *   - the cookie expires, the flag does not, so the app went on showing
 *     LOGOUT and a signed-in nav until something called an API and got a 401
 *   - the flag survives in a browser whose cookies were cleared
 *   - anyone could write the key by hand and the UI would believe it
 *
 * Now there is one source of truth, the database, read through
 * /api/auth/me and held here so that every component sharing the page
 * shares one answer and one request.
 *
 * Usage in a client component:
 *     const { user, loading } = useSession();
 *     if (user?.role === "admin") ...
 *
 * `user` is null when signed out. Its shape is whatever /api/auth/me
 * returns: { id, name, email, role, coins, streak, claimedToday, checkinDay }.
 * ---------------------------------------------------------------------
 */

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

// "idle" -> nothing asked yet | "loading" -> asking | "ready" -> `user` is the answer
let state = { user: null, loading: true };
const listeners = new Set();
let inflight = null;

// useSyncExternalStore compares snapshots by identity, so `state` is only
// ever replaced when something actually changed — never rebuilt per read,
// which would re-render forever.
function publish(next) {
  state = next;
  for (const listener of listeners) listener();
}

function getSnapshot() {
  return state;
}

// Rendered on the server there is no cookie to read, so every page starts
// as "signed out, still loading". A constant, because this is called
// during server rendering and must not change between calls.
const SERVER_SNAPSHOT = { user: null, loading: true };
function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

/** Asks the server who is signed in. Never throws; a failure reads as signed out. */
export function refreshSession() {
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      publish({ user: res.ok && data.success ? data.user : null, loading: false });
    } catch {
      // Offline or the server is down: not signed in as far as the UI goes.
      publish({ user: null, loading: false });
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/**
 * Seeds the store from a response that already carries the account, so
 * the page that just signed in does not ask the same question twice.
 */
export function setSession(user) {
  publish({ user: user || null, loading: false });
}

/**
 * Ends the session on the SERVER — the httpOnly cookie is the session, and
 * only the server can clear it. Clearing something here would have left the
 * real one valid, which is exactly what the old localStorage version did.
 */
export async function signOut() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // Even if that request fails, stop showing this device as signed in.
  }
  publish({ user: null, loading: false });
}

function subscribe(listener) {
  listeners.add(listener);
  // The first component to ask is what triggers the request.
  if (state.loading && !inflight) refreshSession();
  return () => listeners.delete(listener);
}

/** The signed-in account, or null. `loading` is true until the first answer. */
export function useSession() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// The coin balance changes on a draw and on the daily check-in, and the
// pages that cause it already know the new number. Taking it from the
// event keeps the header honest without another round trip.
if (typeof window !== "undefined") {
  window.addEventListener("tarotdiary-coins-change", (event) => {
    const coins = event.detail?.coin;
    if (typeof coins !== "number" || !state.user) return;
    publish({ ...state, user: { ...state.user, coins } });
  });
}

/**
 * ---------------------------------------------------------------------
 * Role guards
 * ---------------------------------------------------------------------
 * An admin signs in to run the card console, not to have a reading, so
 * the two halves of the app do not overlap: the reading side sends an
 * admin to the console, and the console sends everyone else back.
 *
 * These only decide what is DRAWN. The protection that matters is
 * requireAdmin() inside /api/admin/*, which re-reads the role from the
 * database on every request and cannot be talked out of it from here.
 * ---------------------------------------------------------------------
 */

export const ADMIN_HOME = "/addcard";
export const USER_HOME = "/";

/** Nothing is decided until the session has actually come back. */
function useRoleRedirect(shouldLeave, destination) {
  const session = useSession();
  const router = useRouter();
  const { user, loading } = session;

  useEffect(() => {
    if (loading) return;
    if (shouldLeave(user)) router.replace(destination);
  }, [loading, user, shouldLeave, destination, router]);

  return session;
}

const isAdmin = (user) => user?.role === "admin";
const isNotAdmin = (user) => Boolean(user) && user.role !== "admin";

/** For the reading side of the app: admins are sent to the console. */
export function useUserOnly(destination = ADMIN_HOME) {
  return useRoleRedirect(isAdmin, destination);
}

/**
 * For the console: a signed-in non-admin is sent back to the app.
 * Signed-out visitors are left alone — each page already sends them to
 * /login itself, with its own loading state.
 */
export function useAdminOnly(destination = USER_HOME) {
  return useRoleRedirect(isNotAdmin, destination);
}
