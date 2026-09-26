"use client";

import { useState } from "react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log("Reset password for:", email);
  };

  return (
    <main className="forgot-password-page">
      <div className="forgot-password-container">
        <h1>Forgot Password?</h1>

        <p>
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button type="submit" className="send-reset-button">
            SEND RESET LINK
          </button>
        </form>

        <button
          type="button"
          className="back-login-button"
          onClick={() => (window.location.href = "/login")}
        >
          Back to Log In
        </button>
      </div>
    </main>
  );
}