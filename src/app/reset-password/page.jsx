"use client";

/**
 * ---------------------------------------------------------------------
 * app/reset-password/page.jsx — "CHOOSE A NEW PASSWORD" PAGE
 * ---------------------------------------------------------------------
 * How the user gets here: they press GO TO RESET PASSWORD on
 * /forgot-password, which opens
 *          /reset-password?token=<64 hex characters>
 * (the token was just created by the server for the email they typed).
 * No email and no code are involved.
 *
 * Flow:
 *   1. On load we ask  GET /api/auth/reset-password?token=...
 *      whether the token is still valid (not used, not expired).
 *        - invalid  -> show "expired" + a button back to /forgot-password
 *        - valid    -> show the new-password form
 *   2. On submit we call  POST /api/auth/reset-password  { token, password }.
 *      The password must follow the same rules as the register page.
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
// Same password rules as the register page (no spaces, upper + lower case, number, special character).
import { validatePassword } from "../../lib/validators/password";

const INVALID_LINK_MESSAGE =
  "This reset page is invalid or has expired. Please start again from the forgot-password page.";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  // "checking" -> asking the server | "valid" -> show form | "invalid" -> bad or missing token
  // No token in the URL is already known to be invalid.
  const [linkStatus, setLinkStatus] = useState(token ? "checking" : "invalid");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  // Messages for every password rule that currently fails (same idea as the register page).
  const [passwordErrors, setPasswordErrors] = useState([]);

  // Step 1: check the token as soon as the page opens.
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

    // Check the new password with the SAME rules as the register page.
    // Stop here and list every broken rule; nothing is sent to the server.
    const { valid, errors } = validatePassword(password);
    if (!valid) {
      setPasswordErrors(errors);
      return;
    }
    setPasswordErrors([]);

    // Both boxes must match before we save.
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send the one-time token together with the new password.
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // The server re-checks the rules; show its list if it sent one.
        if (Array.isArray(data.errors) && data.errors.length > 0) {
          setPasswordErrors(data.errors);
          return;
        }
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
      ? "This page can't be used."
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
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>Checking…</p>
        )}

        {linkStatus === "invalid" && (
          <div className="auth-form">
            <p className="login-error">{INVALID_LINK_MESSAGE}</p>
            <Link href="/forgot-password" className="gold-button" style={{ textAlign: "center", textDecoration: "none" }}>
              START AGAIN
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
              placeholder="Create a new password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              icon="lock"
              showToggle
            />
            {/* Shows every password rule that currently fails (same look as the register page). */}
            {passwordErrors.length > 0 && (
              <ul className="login-error" style={{ margin: "-4px 0 0", paddingLeft: "18px" }}>
                {passwordErrors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            )}
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
