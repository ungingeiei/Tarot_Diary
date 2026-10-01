"use client";

/**
 * ---------------------------------------------------------------------
 * app/reset-password/page.jsx — "CHOOSE A NEW PASSWORD" PAGE
 * ---------------------------------------------------------------------
 * This is the page the emailed link opens:
 *     /reset-password?token=<64 hex characters>
 *
 * Flow:
 *   1. On load we ask  GET /api/auth/reset-password?token=...  whether
 *      the link is still valid (not used, not expired).
 *        - invalid  -> show "link expired" + a button to request a new one
 *        - valid    -> show the new-password form
 *   2. On submit we call  POST /api/auth/reset-password { token, password }.
 *   3. On success we show a confirmation and send the user to /login.
 *
 * Reuses the existing auth styles (globals.css) — no new CSS needed.
 * useSearchParams() must sit inside <Suspense> in the Next.js app
 * router, which is why the default export wraps ResetPasswordContent.
 * ---------------------------------------------------------------------
 */

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthField } from "../../components/AuthField";
import { BrandMark } from "../../components/TarotVisual";

const INVALID_LINK_MESSAGE =
  "This reset link is invalid or has expired. Please request a new one.";

function ResetPasswordContent() {
  const router = useRouter();
  const token = useSearchParams().get("token") || "";

  // "checking" -> asking the server | "valid" -> show form | "invalid" -> bad link
  // No token in the URL at all is already known to be invalid.
  const [linkStatus, setLinkStatus] = useState(token ? "checking" : "invalid");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // Step 1: check the link as soon as the page opens.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((res) => {
        if (!cancelled) setLinkStatus(res.ok ? "valid" : "invalid");
      })
      .catch(() => {
        if (!cancelled) setLinkStatus("invalid");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  // Step 2: save the new password.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Checked here first so the user gets instant feedback.
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Could not reset your password");
      }

      setDone(true);
      // Give the user a moment to read the message, then go to login.
      window.setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // What the heading says under the title, depending on the state.
  const subtitle = done
    ? "Password updated."
    : linkStatus === "invalid"
      ? "This link can't be used."
      : "Choose a new password for your account.";

  return (
    <main className="auth-page register-page">
      <div className="register-bg-glow" />
      <div className="register-brand"><BrandMark /></div>

      <section className="register-card">
        <div className="ornament-top" aria-hidden="true"><span /><b /><span /></div>

        <div className="heading-block register-heading">
          <span className="gold-line small" />
          <h1>Reset password</h1>
          <p>{subtitle}</p>
        </div>

        {linkStatus === "checking" && (
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>Checking your link…</p>
        )}

        {linkStatus === "invalid" && (
          <div className="auth-form">
            <p className="login-error">{INVALID_LINK_MESSAGE}</p>
            <Link href="/forgot-password" className="gold-button" style={{ textAlign: "center", textDecoration: "none" }}>
              REQUEST A NEW LINK
            </Link>
          </div>
        )}

        {linkStatus === "valid" && done && (
          <div className="auth-form">
            <p style={{ margin: 0, color: "var(--cream)", fontSize: 13, lineHeight: 1.7 }}>
              Your password has been updated. Taking you to sign in…
            </p>
            <Link href="/login" className="gold-button" style={{ textAlign: "center", textDecoration: "none" }}>
              SIGN IN NOW
            </Link>
          </div>
        )}

        {linkStatus === "valid" && !done && (
          <form onSubmit={handleSubmit} className="auth-form">
            <AuthField
              label="New password"
              placeholder="At least 8 characters"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              icon="lock"
              showToggle
            />
            <AuthField
              label="Confirm new password"
              placeholder="Type it again"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={setConfirm}
              icon="lock"
              showToggle
            />

            {error && <p className="login-error">{error}</p>}

            <button className="gold-button" type="submit" disabled={loading}>
              {loading ? "SAVING..." : "RESET PASSWORD"}
            </button>
          </form>
        )}
      </section>

      <footer className="auth-footer register-footer">© 2026 Tarot Diary <span>·</span> Terms <span>·</span> Privacy</footer>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
