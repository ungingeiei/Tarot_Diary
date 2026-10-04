"use client";

/**
 * ---------------------------------------------------------------------
 * app/reset-password/page.jsx — "CHOOSE A NEW PASSWORD" PAGE
 * ---------------------------------------------------------------------
 * Two ways to arrive here:
 *   A) right after SEND RESET CODE on /forgot-password:
 *          /reset-password?email=<the email>
 *      The user types the 6-digit code from the email + a new password.
 *   B) from the link inside the email:
 *          /reset-password?token=<64 hex characters>
 *      No code needed; the link itself is the proof.
 *
 * Flow:
 *   1. (link only) On load we ask  GET /api/auth/reset-password?token=...
 *      whether the link is still valid (not used, not expired).
 *        - invalid  -> show "link expired" + a button to request a new one
 *        - valid    -> show the new-password form
 *      (email + code mode is not pre-checked, so this page never reveals
 *       whether an email is registered.)
 *   2. On submit we call  POST /api/auth/reset-password
 *        { token, password }   or   { email, code, password }.
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
  "This reset link is invalid or has expired. Please request a new one.";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  // Set when the user came from /forgot-password (and has no emailed link open).
  const email = searchParams.get("email") || "";
  // true = the user types the 6-digit code; false = the emailed link is the proof.
  const codeMode = !token && Boolean(email);

  // "checking" -> asking the server | "valid" -> show form | "invalid" -> bad link
  // A link is checked with the server first. Code mode shows the form at once.
  // Neither a token nor an email in the URL is already known to be invalid.
  const [linkStatus, setLinkStatus] = useState(
    token ? "checking" : email ? "valid" : "invalid"
  );
  // The 6-digit code typed from the email (code mode only).
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  // Messages for every password rule that currently fails (same idea as the register page).
  const [passwordErrors, setPasswordErrors] = useState([]);

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

    // Code mode: the code must be exactly 6 digits.
    if (codeMode && !/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from the email");
      return;
    }

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
        // Link: send the token. Code mode: send the email and the code instead.
        body: JSON.stringify(codeMode ? { email, code, password } : { token, password }),
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
      ? "This link can't be used."
      : codeMode
        ? "Enter the code we emailed you and choose a new password."
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
            {codeMode && (
              <>
                {/* Shows which email the code was sent to. */}
                <p style={{ margin: 0, color: "var(--cream)", fontSize: 13, lineHeight: 1.7 }}>
                  We sent a 6-digit code to{" "}
                  <strong style={{ color: "var(--gold)" }}>{email}</strong>. If it is
                  registered, the code is in your inbox now and works for 30 minutes.
                </p>
                <AuthField
                  label="6-digit code"
                  placeholder="123456"
                  autoComplete="one-time-code"
                  value={code}
                  // Keep digits only, at most 6.
                  onChange={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
                  icon="mail"
                />
              </>
            )}
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
            {codeMode && (
              <p className="switch-text">
                No email? <Link href="/forgot-password">Send a new code</Link>
              </p>
            )}
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
