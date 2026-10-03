"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthField } from "../../components/AuthField";
import CheckInReward from "../../components/CheckInReward";
import { BrandMark, TarotCard } from "../../components/TarotVisual";
import { signIn } from "../../lib/auth";

/**
 * `googleStatus` / `googleErrorCode` come from the query string, read by
 * the server component in page.jsx and handed down as props. Reading
 * them with useSearchParams() here instead would force the whole form
 * under a <Suspense> boundary, which strips it out of the prerendered
 * HTML and leaves an empty panel until JS loads.
 */
export function LoginForm({ googleStatus = "", googleErrorCode = "" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // True while we are bouncing through Google, so the whole panel can
  // show a disabled/waiting state instead of looking clickable.
  // Set the moment the button is pressed, so the panel shows a waiting
  // state during the hand-off to accounts.google.com.
  const [googleStarting, setGoogleStarting] = useState(false);
  const [googleReturnError, setGoogleReturnError] = useState("");
  // Signed in for real; the daily-reward modal now stands between the
  // user and the home page, for both the password and the Google path.
  const [showReward, setShowReward] = useState(false);

  // /api/auth/google/callback sends the browser back to this page with
  // ?google=success (cookie already set) or ?error=<code>. Both are
  // derived during render — no effect has to push them into state.
  const isGoogleReturn = googleStatus === "success";
  const googleError =
    googleReturnError ||
    (googleErrorCode
      ? GOOGLE_ERRORS[googleErrorCode] || "Google sign-in failed. Please try again."
      : "");

  // Busy until we either land on /category or fail.
  const googleBusy = googleStarting || (isGoogleReturn && !googleReturnError);

  // ─── GOOGLE OAUTH RETURN LEG ────────────────────────────────────────
  // The real httpOnly session cookie already exists by now; mirror it
  // into the client-side auth layer (lib/auth.js, which the Header
  // reads) and then move on to /category.
  useEffect(() => {
    if (!isGoogleReturn) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) throw new Error("Could not load your account");
        const data = await res.json();
        const user = data.user || {};
        if (cancelled) return;
        signIn({ name: user.name || "Seeker", email: user.email || "" });
        setShowReward(true);
      } catch (err) {
        if (cancelled) return;
        setGoogleReturnError(err.message || "Google sign-in failed. Please try again.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isGoogleReturn, router]);

  // ---------------------------------------------------------------------
  // LOGIN SUBMIT — TWO VERSIONS BELOW. Exactly ONE should be active
  // (not commented out) at a time; the other stays commented out as a
  // reference. To switch: comment out the block you're not using and
  // uncomment the other one — don't delete either.
  // ---------------------------------------------------------------------

  // // ─── TEST MODE (currently ACTIVE) ───────────────────────────────────
  // // No real backend check — any email/password combo "succeeds" after
  // // a fake delay. Good for clicking through the app during development.
  // // This is the code referenced in the earlier answer about what makes
  // // the login button clickable without a real account.
  // const handleSubmit = (e) => {
  //   e.preventDefault();
  //   setError("");
  //   setLoading(true);
  //   // Stand-in for: POST /api/auth/login
  //   window.setTimeout(() => {
  //     setLoading(false);
  //     signIn({ name: email.split("@")[0] || "Seeker", email });
  //     router.push("/category");
  //   }, 1200);
  // };

  // //---------------------------------------------------------------------

  // ─── REAL MODE (commented out) ──────────────────────────────────────
  // Actually calls a backend endpoint and only signs the user in if the
  // server confirms the credentials. To activate: delete/comment out
  // the TEST MODE handleSubmit above, then uncomment this one. Adjust
  // the fetch URL/response shape to match your real API.
  
  // --- CHANGED: the email + password typed here are now CHECKED BY THE
  // SERVER before the user is allowed to reach the home page (/category).
  // Two checks, both must pass:
  //   1. POST /api/auth/login  -> the server looks the email up in the
  //      `accounts` table and compares the password with the stored
  //      hash. Wrong email or password => it answers 401 and we stop.
  //      (On success it also sets the httpOnly session cookie.)
  //   2. GET  /api/auth/me     -> asks "who is signed in?" using that new
  //      cookie, confirming the session works and the account exists.
  // Only after both succeed do we save the sign-in (lib/auth.js, which
  // the Header reads) and navigate. Otherwise the user stays on this
  // page and sees an error message.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // ----- Check 1: email + password -----
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid email or password");
      }

      // ----- Check 2: the account/session is really valid -----
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      const meData = await meRes.json().catch(() => ({}));
      if (!meRes.ok || !meData.success || !meData.user) {
        throw new Error("We couldn't verify your account. Please try again.");
      }

      // ----- Verified: sign in and go to the home page -----
      // The routes reply { success, user: { name, email, ... } }, so the
      // name is read from `user.name` (reading it from the top level
      // would store "undefined").
      const user = meData.user;
      signIn({
        name: user.name || email.split("@")[0] || "Seeker",
        email: user.email || email,
      });
      setShowReward(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };
//---------------------------------------------------------------------

  return (
    <main className="auth-page login-page">
      <section className="login-visual">
        <div className="visual-glow" />
        <div className="visual-top"><BrandMark /></div>
        <div className="card-center"><TarotCard /></div>
        <p className="visual-quote">“Between what is seen and what is known,<br />the threshold opens.”</p>
      </section>

      <section className="auth-panel login-panel">
        <div className="mobile-brand"><BrandMark /></div>
        <div className="auth-content">
          <div className="heading-block">
            <span className="gold-line" />
            <h1>Welcome back</h1>
            <p>Sign in to continue your reading.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <AuthField label="Email address" placeholder="you@gmail.com" type="email" autoComplete="email" value={email} onChange={setEmail} icon="mail" />
            <AuthField label="Password" placeholder="••••••••••" type="password" autoComplete="current-password" value={password} onChange={setPassword} icon="lock" showToggle />

            <div className="forgot-row">
              <span />
              {/* --- CHANGED: now opens the forgot-password page
                  (app/forgot-password/page.jsx), where the user asks for
                  an emailed reset link. Same button, same styling. */}
              <button type="button" onClick={() => router.push("/forgot-password")}>
                Forgot your password?
              </button>
            </div>

            {/* Only ever populated when REAL MODE's handleSubmit sets an
                error (TEST MODE never fails, so this stays empty/hidden). */}
            {(error || googleError) && (
              <p className="login-error">{error || googleError}</p>
            )}

            <button className="gold-button" type="submit" disabled={loading || googleBusy}>
              {loading ? "SIGNING IN..." : "SIGN IN"}
            </button>
          </form>

          <div className="or-divider"><span /> <em>OR</em> <span /></div>

          {/* A full page navigation, NOT fetch(): the browser itself has
              to follow the redirect to accounts.google.com. */}
          <button
            type="button"
            className="google-button"
            disabled={googleBusy || loading}
            onClick={() => {
              setError("");
              setGoogleStarting(true);
              // An absolute URL, and a full navigation rather than
              // router.push(): /api/auth/google is a route handler that
              // 302s the browser out to accounts.google.com.
              window.location.assign(
                new URL("/api/auth/google", window.location.origin).toString()
              );
            }}
          >
            <span className="google-g">G</span>
            {googleBusy ? "Connecting to Google..." : "Continue with Google"}
          </button>

          <p className="switch-text">New to Tarot Diary? <Link href="/register">Create an account</Link></p>
        </div>
        <Footer />
      </section>

      {showReward && <CheckInReward onCollect={() => router.push("/")} />}
    </main>
  );
}

// Reasons the callback route can bounce back with, turned into
// something a person can act on.
const GOOGLE_ERRORS = {
  google_cancelled: "Google sign-in was cancelled.",
  google_not_configured:
    "Google sign-in isn't configured on this server yet (missing GOOGLE_CLIENT_ID).",
  google_state_mismatch:
    "That sign-in link expired. Please try Continue with Google again.",
  google_bad_response: "Google didn't send back a valid response. Please try again.",
  google_email_unverified:
    "That Google account's email isn't verified, so it can't be used to sign in.",
  google_failed: "Google sign-in failed. Please try again.",
};

function Footer() {
  return <footer className="auth-footer">© 2026 Tarot Diary <span>·</span> Terms <span>·</span> Privacy</footer>;
}
