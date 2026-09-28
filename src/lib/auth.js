/**
 * ---------------------------------------------------------------------
 * MOCK AUTH LAYER — stand-in for a real backend.
 * ---------------------------------------------------------------------
 * There is no server here, so "signed in" is simulated with a session
 * flag in localStorage. Swap the bodies of these functions for real
 * calls (e.g. to /api/auth/session) once a backend exists — every
 * caller (reading page, header, etc.) only depends on this file.
 * ---------------------------------------------------------------------
 */

const AUTH_KEY = "tarotdiary_session";

export function isSignedIn() {
  if (typeof window === "undefined") return false;
  return !!window.localStorage.getItem(AUTH_KEY);
}

export function getCurrentUser() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function signIn({ name = "", email = "" } = {}) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_KEY, JSON.stringify({ name, email }));
  window.dispatchEvent(new Event("tarotdiary-auth-change"));
}

export function signOut() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_KEY);
  window.dispatchEvent(new Event("tarotdiary-auth-change"));
}
