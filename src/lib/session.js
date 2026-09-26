import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET;
export const SESSION_COOKIE = "tarotdiary_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

if (!JWT_SECRET) {
  console.warn(
    "[session] JWT_SECRET is not set. Set it in your environment before deploying."
  );
}

export function createSessionToken({ accountId, role }) {
  return jwt.sign({ accountId, role }, JWT_SECRET, {
    expiresIn: SESSION_MAX_AGE_SECONDS,
  });
}

export function verifySessionToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null; // expired, tampered, or malformed
  }
}

export async function setSessionCookie(token) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}