"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthField } from "../../components/AuthField";
import { BrandMark, TarotCard } from "../../components/TarotVisual";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    window.setTimeout(() => setLoading(false), 1200);
  };

  return (
    <main className="auth-page login-page">
      <section className="login-visual">
        <div className="visual-glow" />
        <div className="visual-top"><BrandMark /></div>
        <div className="card-center"><TarotCard /></div>
        <p className="visual-quote">“Between what is seen and what is known,<br />the threshold opens.”</p>
      </section>

      <section className="auth-panel login-panel">
        <div className="mobile-brand"><BrandMark /></div>
        <div className="auth-content">
          <div className="heading-block">
            <span className="gold-line" />
            <h1>Welcome back</h1>
            <p>Sign in to continue your reading.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <AuthField label="Email address" placeholder="you@gmail.com" type="email" autoComplete="email" value={email} onChange={setEmail} icon="mail" />
            <AuthField label="Password" placeholder="••••••••••" type="password" autoComplete="current-password" value={password} onChange={setPassword} icon="lock" showToggle />

            <div className="forgot-row">
              <span />
              <button type="button">Forgot your password?</button>
            </div>

            <button className="gold-button" type="submit" disabled={loading}>
              {loading ? "SIGNING IN..." : "SIGN IN"}
            </button>
          </form>

          <div className="or-divider"><span /> <em>OR</em> <span /></div>

          <button type="button" className="google-button" onClick={() => alert("Connect Google OAuth here") }>
            <span className="google-g">G</span>
            Continue with Google
          </button>

          <p className="switch-text">New to Tarot Diary? <Link href="/register">Create an account</Link></p>
        </div>
        <Footer />
      </section>
    </main>
  );
}

function Footer() {
  return <footer className="auth-footer">© 2026 Tarot Diary <span>·</span> Terms <span>·</span> Privacy</footer>;
}
