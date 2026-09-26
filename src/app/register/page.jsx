"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthField } from "../../components/AuthField";
import { BrandMark } from "../../components/TarotVisual";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    window.setTimeout(() => setLoading(false), 1200);
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