"use client";

/**
 * ---------------------------------------------------------------------
 * app/forgot-password/page.jsx — "FORGOT PASSWORD" PAGE  (/forgot-password)
 * ---------------------------------------------------------------------
 * Opened from the "Forgot your password?" button on the login page.
 *
 * Flow (one click):
 *   1. User types their email and presses GO TO RESET PASSWORD.
 *   2. We call  POST /api/auth/forgot-password  { email }.
 *   3. If the email is registered, the server answers with a one-time
 *      token and we open /reset-password?token=... at once, where the
 *      user types a new password. No email and no code are involved.
 *   4. If the email is not registered, the error is shown here.
 *
 * Looks the same as the register page: it reuses the existing
 * .auth-page / .register-card styles from globals.css, so no new CSS
 * is needed.
 * ---------------------------------------------------------------------
 */

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthField } from "../../components/AuthField";
import { BrandMark } from "../../components/TarotVisual";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

      if (!res.ok || !data.token) {
        throw new Error(data.message || "Could not start the password reset");
      }

      // Go to the reset-password page now, carrying the one-time token from the server.
      router.push(`/reset-password?token=${encodeURIComponent(data.token)}`);
      // The button stays disabled while the next page loads, so a second click cannot
      // start a second request (loading is only reset in the catch below).
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      // Only on an error do we let the user press the button again.
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
          <p>Enter your email, then choose a new password.</p>
        </div>

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
            {loading ? "OPENING..." : "GO TO RESET PASSWORD"}
          </button>
        </form>

        <p className="switch-text">
          Remembered it? <Link href="/login">Back to sign in</Link>
        </p>
      </section>

      <footer className="auth-footer register-footer">© 2026 Tarot Diary <span>·</span> Terms <span>·</span> Privacy</footer>
    </main>
  );
}
