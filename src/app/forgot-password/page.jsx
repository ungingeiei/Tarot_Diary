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
 *   3. On success we go straight to /reset-password?email=... where the
 *      user types the 6-digit code from the email plus the new password.
 *      (The server gives the same answer whether or not the email is
 *      registered, so this page never reveals who has an account.)
 *   4. Opening the emailed link (/reset-password?token=...) still works too.
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

      if (!res.ok) {
        throw new Error(data.message || "Could not send the reset code");
      }

      // Remember for 15 minutes that this browser sent the form. src/proxy.js (when it is
      // switched on) only lets a visitor open /reset-password if this cookie exists.
      document.cookie = "reset_requested=1; path=/; max-age=900; samesite=lax";

      // Go to the reset-password page now; the user types the code from the email there.
      router.push(`/reset-password?email=${encodeURIComponent(email.trim())}`);
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
          <p>Enter your email and we&apos;ll send you a code to reset your password.</p>
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
            {loading ? "SENDING..." : "SEND RESET CODE"}
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
