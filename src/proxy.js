// ==== Middle ware for restricting from modify path ====
// (Next.js 16 renamed "middleware" to "proxy"; it is the same idea: this file
//  runs BEFORE every page request, so we can redirect visitors early.)
//
// STATUS: switched OFF while we check every page in development.
// Next.js crashes if a proxy.js file exports nothing, so a do-nothing PLACEHOLDER is
// kept below and the real code is commented out.
// To turn it ON: (1) delete the PLACEHOLDER block, (2) delete the two lines that say
// "DELETE THIS LINE TO TURN ON" (the first starts with /*, the last ends with */),
// (3) un-comment the document.cookie line in src/app/forgot-password/page.jsx,
// then restart `npm run dev`.

// ---- PLACEHOLDER START: does nothing, just lets every request through ----
import { NextResponse } from "next/server";
export function proxy() {
  return NextResponse.next();
}
// ---- PLACEHOLDER END ----

/* ---- DELETE THIS LINE TO TURN ON ----
import { NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";

// Pages anyone may open without logging in.
const PUBLIC_PATHS = new Set([
  "/",
  "/about",
  "/login",
  "/register",
  "/forgot-password",
]);

// Page for choosing a new password; it has its own extra rule (see below).
const RESET_PATH = "/reset-password";

// Short-lived cookie that /forgot-password sets after the user sent the email form.
const RESET_COOKIE = "reset_requested";

export function proxy(request) {
  const { pathname, searchParams } = request.nextUrl;

  // Treat "/login/" and "/login" as the same path.
  const path =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  // 1) Public pages: let everyone in.
  if (PUBLIC_PATHS.has(path)) return NextResponse.next();

  // 2) Reset-password page: allowed only if the user already sent an email from
  //    /forgot-password (cookie) OR opened the emailed link (it carries ?token=).
  //    The token is still checked by the API, so a fake token only shows "link expired".
  if (path === RESET_PATH) {
    const sentEmail = request.cookies.get(RESET_COOKIE)?.value === "1";
    const hasToken = searchParams.has("token");
    if (sentEmail || hasToken) return NextResponse.next();
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 3) Every other page needs a valid login cookie, otherwise go to /login.
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (sessionToken && verifySessionToken(sessionToken)) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

// Run only on pages. Skip /api (API routes check login themselves, and login/register
// must stay reachable), Next.js internals, and files with an extension (images, .svg, .ico).
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
// ---- DELETE THIS LINE TO TURN ON ---- */
