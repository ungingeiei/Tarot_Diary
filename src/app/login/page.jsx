"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthField } from "../../components/AuthField";
import { BrandMark, TarotCard } from "../../components/TarotVisual";
import { signIn } from "../../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ---------------------------------------------------------------------
  // LOGIN SUBMIT — TWO VERSIONS BELOW. Exactly ONE should be active
  // (not commented out) at a time; the other stays commented out as a
  // reference. To switch: comment out the block you're not using and
  // uncomment the other one — don't delete either.
  // ---------------------------------------------------------------------

  // // ─── TEST MODE (currently ACTIVE) ───────────────────────────────────
  // // No real backend check — any email/password combo "succeeds" after
  // // a fake delay. Good for clicking through the app during development.
  // // This is the code referenced in the earlier answer about what makes
  // // the login button clickable without a real account.
  // const handleSubmit = (e) => {
  //   e.preventDefault();
  //   setError("");
  //   setLoading(true);
  //   // Stand-in for: POST /api/auth/login
  //   window.setTimeout(() => {
  //     setLoading(false);
  //     signIn({ name: email.split("@")[0] || "Seeker", email });
  //     router.push("/category");
  //   }, 1200);
  // };

  // //---------------------------------------------------------------------

  // ─── REAL MODE (commented out) ──────────────────────────────────────
  // Actually calls a backend endpoint and only signs the user in if the
  // server confirms the credentials. To activate: delete/comment out
  // the TEST MODE handleSubmit above, then uncomment this one. Adjust
  // the fetch URL/response shape to match your real API.
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Invalid email or password");
      }
      const user = await res.json(); // expect e.g. { name, email }
      signIn({ name: user.name || email.split("@")[0] || "Seeker", email });
      router.push("/category");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };
//---------------------------------------------------------------------

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

            {/* Only ever populated when REAL MODE's handleSubmit sets an
                error (TEST MODE never fails, so this stays empty/hidden). */}
            {error && <p className="login-error">{error}</p>}

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
