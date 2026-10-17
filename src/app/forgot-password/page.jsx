"use client";

/**
 * ---------------------------------------------------------------------
 * app/forgot-password/page.jsx — "FORGOT PASSWORD" PAGE  (/forgot-password)
 * ---------------------------------------------------------------------
 * Opened from the "Forgot your password?" button on the login page.
 *
 * Flow:
 *   1. User types their email and presses SEND RESET PIN.
 *   2. We call  POST /api/auth/forgot-password  { email }.
 *   3. If the email is registered, the server mails a 6-digit PIN to
 *      that address and answers with a one-time token. We open
 *      /reset-password?token=... at once, where the user types the PIN
 *      first and only then a new password.
 *   4. If the email is not registered, the error is shown here.
 *
 * --- CHANGED: a PIN is now part of this -----------------------------
 * The token this page receives used to be the whole reset, so anyone who
 * knew a registered email could set a new password for that account.
 * The token now only identifies the reset; the PIN that was mailed is
 * what proves the mailbox belongs to the person asking. Nothing on this
 * page enforces that — /api/auth/reset-password does — this page just
 * carries the two extra details the next page needs for its wording:
 *   to       : the masked address, so the user knows which inbox
 *   delivery : "email", or "console" when SMTP_HOST is unset and the PIN
 *              was printed in the terminal instead (development only)
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

      // Go to the reset-password page now, carrying the one-time token from
      // the server plus the wording details for its PIN step. The token is
      // the only one of the three that means anything to the server.
      const params = new URLSearchParams({ token: data.token });
      if (data.maskedEmail) params.set("to", data.maskedEmail);
      if (data.delivery) params.set("delivery", data.delivery);
      router.push(`/reset-password?${params.toString()}`);
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
          {/* --- CHANGED: say that a PIN is coming, so the next page's
              PIN box is expected rather than a surprise. --- */}
          <p>Enter your email. We&apos;ll send a 6-digit PIN to confirm it&apos;s you.</p>
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
            {loading ? "SENDING PIN..." : "SEND RESET PIN"}
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
