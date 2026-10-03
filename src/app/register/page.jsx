"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthField } from "../../components/AuthField";
import { BrandMark } from "../../components/TarotVisual";
// --- ADDED: password rule checker used before saving to accounts.pwd ---
import { validatePassword } from "../../lib/validators/password";
import { signIn } from "../../lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  // Whatever the server rejected the sign-up for — an email that is
  // already taken, a field left empty. Separate from passwordErrors,
  // which are the client-side rules checked before anything is sent.
  const [error, setError] = useState("");
  // --- ADDED: holds the messages for whichever password rules currently
  // fail, so they can be shown under the field. Empty = password is OK.
  const [passwordErrors, setPasswordErrors] = useState([]);
  // True from the moment "Continue with Google" is pressed until the
  // browser leaves this page, so the button stops looking clickable.
  const [googleStarting, setGoogleStarting] = useState(false);

  // --- CHANGED: the account is now really created. This used to be a
  // setTimeout that only flipped the button label, so nothing was ever
  // saved. The same two-step the login page uses:
  //   1. POST /api/auth/register -> hashes the password, inserts the row
  //      into `accounts`, and sets the httpOnly session cookie.
  //   2. GET  /api/auth/me       -> confirms that cookie really works
  //      before we claim the user is signed in.
  // Only then is the sign-in mirrored into lib/auth.js (which the Header
  // reads) and the user sent to the home page.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // --- ADDED: gate the save on the password rules. Stop here if any
    // rule fails; only a fully-valid password is sent to the server
    // (where it is hashed and saved into `accounts.pwd`).
    const { valid, errors } = validatePassword(password);
    if (!valid) {
      setPasswordErrors(errors);
      return;
    }
    setPasswordErrors([]);
    // --- END ADDED ---

    setLoading(true);
    try {
      // ----- Step 1: create the account -----
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        // e.g. 409 "This email is already registered"
        throw new Error(data.message || "Could not create your account");
      }

      // ----- Step 2: the session cookie is really valid -----
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      const meData = await meRes.json().catch(() => ({}));
      if (!meRes.ok || !meData.success || !meData.user) {
        throw new Error("We couldn't verify your account. Please try again.");
      }

      const user = meData.user;
      signIn({
        name: user.name || name,
        email: user.email || email,
      });
      router.push("/");
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
          <h1>Create account</h1>
          <p>Your reading awaits. Join the circle.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <AuthField label="Full name" placeholder="Your name" autoComplete="name" value={name} onChange={setName} icon="user" />
          <AuthField label="Email address" placeholder="you@gmail.com" type="email" autoComplete="email" value={email} onChange={setEmail} icon="mail" />
          <AuthField label="Password" placeholder="Create a password" type="password" autoComplete="new-password" value={password} onChange={setPassword} icon="lock" showToggle />
          {/* --- ADDED: lists every password rule that currently fails --- */}
          {passwordErrors.length > 0 && (
            <ul className="login-error" style={{ margin: "-4px 0 0", paddingLeft: "18px" }}>
              {passwordErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
          {/* --- END ADDED --- */}

          {/* Server-side rejections: the email is taken, a field is
              missing, the database is unreachable. Without this the
              sign-up would just silently do nothing. */}
          {error && <p className="login-error">{error}</p>}

          <button className="gold-button" type="submit" disabled={loading || googleStarting}>
            {loading ? "CREATING..." : "CREATE ACCOUNT"}
          </button>
        </form>

        <div className="or-divider"><span /> <em>OR</em> <span /></div>

        {/* Same route as the login page: /api/auth/google creates the
            account on first sign-in, so there is no separate "sign up
            with Google" flow. A full navigation, NOT fetch() — the
            browser itself has to follow the 302 to accounts.google.com. */}
        <button
          type="button"
          className="google-button"
          disabled={googleStarting || loading}
          onClick={() => {
            setGoogleStarting(true);
            window.location.assign(
              new URL("/api/auth/google", window.location.origin).toString()
            );
          }}
        >
          <span className="google-g">G</span>
          {googleStarting ? "Connecting to Google..." : "Continue with Google"}
        </button>

        <p className="switch-text">Already initiated? <Link href="/login">Sign in instead</Link></p>
      </section>

      <footer className="auth-footer register-footer">© 2026 Tarot Diary <span>·</span> Terms <span>·</span> Privacy</footer>
    </main>
  );
}