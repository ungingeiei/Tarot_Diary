"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthField } from "../../components/AuthField";
import { BrandMark } from "../../components/TarotVisual";
import { signIn } from "../../lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Matches register route's messages, e.g. "This email is
        // already registered", "Password must be at least 8 characters"
        throw new Error(data.message || "Could not create your account");
      }

      // /api/auth/register already set the httpOnly session cookie.
      // This also flips the client-side localStorage flag that
      // Header.jsx / NavMenu.jsx / the reading page still check via
      // lib/auth.js's isSignedIn() — same pattern login/page.jsx uses.
      signIn({ name: data.user.name, email: data.user.email });
      router.push("/category");
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
          <AuthField label="Confirm password" placeholder="Re-enter your password" type="password" autoComplete="new-password" value={confirmPassword} onChange={setConfirmPassword} icon="lock" showToggle />

          {error && <p className="login-error">{error}</p>}

          <button className="gold-button" type="submit" disabled={loading}>
            {loading ? "CREATING..." : "CREATE ACCOUNT"}
          </button>
        </form>

        <div className="or-divider"><span /> <em>OR</em> <span /></div>

        <button type="button" className="google-button" onClick={() => alert("Connect Google OAuth here") }>
          <span className="google-g">G</span>
          Continue with Google
        </button>

        <p className="switch-text">Already initiated? <Link href="/login">Sign in instead</Link></p>
      </section>

      <footer className="auth-footer register-footer">© 2026 Tarot Diary <span>·</span> Terms <span>·</span> Privacy</footer>
    </main>
  );
}