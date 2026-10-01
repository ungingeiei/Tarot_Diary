"use client";

/**
 * ---------------------------------------------------------------------
 * app/forgot-password/page.jsx — "FORGOT PASSWORD" PAGE  (/forgot-password)
 * ---------------------------------------------------------------------
 * Opened from the "Forgot your password?" button on the login page.
 *
 * Flow:
 *   1. User types their email and presses SEND RESET LINK.
 *   2. We call  POST /api/auth/forgot-password  { email }.
 *   3. On success we swap the form for a confirmation message.
 *      (The server gives the same answer whether or not the email is
 *      registered, so this page never reveals who has an account.)
 *   4. The user opens the emailed link -> /reset-password?token=...
 *
 * Looks the same as the register page: it reuses the existing
 * .auth-page / .register-card styles from globals.css, so no new CSS
 * is needed.
 * ---------------------------------------------------------------------
 */

import Link from "next/link";
import { useState } from "react";
import { AuthField } from "../../components/AuthField";
import { BrandMark } from "../../components/TarotVisual";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false); // true after the request succeeds

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Could not send the reset link");
      }

      setSent(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page register-page">
      <div className="register-bg-glow" />
      <div className="register-brand"><BrandMark /></div>

      <section className="register-card">
        <div className="ornament-top" aria-hidden="true"><span /><b /><span /></div>

        <div className="heading-block register-heading">
          <span className="gold-line small" />
          <h1>Forgot password?</h1>
          <p>
            {sent
              ? "Check your inbox."
              : "Enter your email and we'll send you a link to reset your password."}
          </p>
        </div>

        {sent ? (
          // ----- Step 2: confirmation (replaces the form) -----
          <div className="auth-form">
            <p style={{ margin: 0, color: "var(--cream)", fontSize: 13, lineHeight: 1.7 }}>
              If <strong style={{ color: "var(--gold)" }}>{email}</strong> is registered,
              a reset link is on its way. It works for 30 minutes and can be used once.
            </p>
            <Link href="/login" className="gold-button" style={{ textAlign: "center", textDecoration: "none" }}>
              BACK TO SIGN IN
            </Link>
          </div>
        ) : (
          // ----- Step 1: email form -----
          <form onSubmit={handleSubmit} className="auth-form">
            <AuthField
              label="Email address"
              placeholder="you@gmail.com"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              icon="mail"
            />

            {error && <p className="login-error">{error}</p>}

            <button className="gold-button" type="submit" disabled={loading || !email.trim()}>
              {loading ? "SENDING..." : "SEND RESET LINK"}
            </button>
          </form>
        )}

        {!sent && (
          <p className="switch-text">
            Remembered it? <Link href="/login">Back to sign in</Link>
          </p>
        )}
      </section>

      <footer className="auth-footer register-footer">© 2026 Tarot Diary <span>·</span> Terms <span>·</span> Privacy</footer>
    </main>
  );
}
