import { clearSessionCookie } from "@/lib/session";

// Replaces NavMenu.jsx's client-only signOut() (localStorage flag).
// NavMenu should call this route (POST /api/auth/logout) before
// redirecting to /login, in addition to clearing any client state.

export async function POST() {
  await clearSessionCookie();
  return Response.json({ success: true });
}