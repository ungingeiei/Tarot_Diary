"use client";

/**
 * ---------------------------------------------------------------------
 * app/reset-password/page.jsx — "CHOOSE A NEW PASSWORD" PAGE
 * ---------------------------------------------------------------------
 * How the user gets here: they press GO TO RESET PASSWORD on
 * /forgot-password, which opens
 *          /reset-password?token=<64 hex characters>
 * (the token was just created by the server for the email they typed).
 *
 * --- CHANGED: THE RESET IS NOW TWO STEPS -----------------------------
 * Holding this link used to be the whole reset, so anyone who knew a
 * registered email could set a new password for it. /forgot-password now
 * also emails a 6-digit PIN, and this page asks for it before it will
 * show the password form:
 *
 *      token in the URL  -> the reset was started in this browser
 *      PIN in the inbox  -> the person owns the account's mailbox
 *
 * Both are needed. The PIN box here is only the front of it — the real
 * gate is /api/auth/reset-password, which refuses to save a password
 * until the PIN has been verified, so skipping this page changes
 * nothing.
 *
 * Flow:
 *   1. On load we ask  GET /api/auth/reset-password?token=...
 *      which answers with the step this reset is on:
 *        - the link is bad/expired -> show "expired" + back to /forgot-password
 *        - stage "pin"             -> show the PIN box
 *        - stage "password"        -> the PIN is already in, show the form
 *      (stage is asked of the server, not kept in the page, so a reload
 *       in the middle of the reset lands back on the right step.)
 *   2. PIN step:  POST { token, pin }      -> verify. Five wrong tries
 *      cancel the whole reset and the user must start again.
 *   3. Password:  POST { token, password } -> save. The password must
 *      follow the same rules as the register page, shown live from the
 *      moment the field is clicked.
 *   4. On success we show a confirmation and send the user to /login.
 *
 * Reuses the existing auth styles (globals.css) plus .field-rules /
 * .pin-field added for the condition list and the PIN box.
 * useSearchParams() must sit inside <Suspense> in the Next.js app
 * router, which is why the default export wraps ResetPasswordContent.
 * ---------------------------------------------------------------------
 */

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthField } from "../../components/AuthField";
import { FieldRules } from "../../components/FieldRules";
import { BrandMark } from "../../components/TarotVisual";
// Same password rules as the register page (no spaces, upper + lower case, number, special character).
// checkPasswordRules = every rule + whether it is met, for the live list.
import { validatePassword, checkPasswordRules } from "../../lib/validators/password";

const INVALID_LINK_MESSAGE =
  "This reset page is invalid or has expired. Please start again from the forgot-password page.";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  // --- ADDED: /forgot-password passes these so the PIN step can say
  // which inbox to open, and (in development, with no SMTP settings)
  // that the PIN is in the terminal instead. They are only wording —
  // nothing here is trusted for a decision, the server owns the stage.
  const maskedEmail = searchParams.get("to") || "";
  const delivery = searchParams.get("delivery") || "email";

  // "checking" -> asking the server | "valid" -> show the flow | "invalid" -> bad or missing token
  // No token in the URL is already known to be invalid.
  const [linkStatus, setLinkStatus] = useState(token ? "checking" : "invalid");
  // --- ADDED: which step of the reset we are on. The SERVER decides
  // this (GET above, and again on every POST), so it survives a reload
  // and cannot be skipped by editing the page's state.
  const [stage, setStage] = useState("pin");
  // --- ADDED: the PIN box, and how many wrong tries are left. null =
  // the server has not had to say yet.
  const [pin, setPin] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(null);
  const [verifying, setVerifying] = useState(false);
  // --- ADDED: the reset was cancelled after too many wrong PINs. The
  // only way on is a new one from /forgot-password.
  const [locked, setLocked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  // Messages for every password rule that currently fails (same idea as the register page).
  const [passwordErrors, setPasswordErrors] = useState([]);
  // --- ADDED: true once the password box has been clicked into, which
  // is when its conditions appear — same as the register page.
  const [passwordTouched, setPasswordTouched] = useState(false);

  // --- ADDED: the live password rules, recomputed on every keystroke.
  const passwordRules = checkPasswordRules(password);

  // Step 1: check the token as soon as the page opens, and find out
  // which step this reset is on.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !data.success) {
          setLinkStatus("invalid");
          return;
        }
        setLinkStatus("valid");
        // "password" when the PIN was already accepted (e.g. the user
        // reloaded the page after typing it).
        setStage(data.stage === "password" ? "password" : "pin");
        if (typeof data.attemptsLeft === "number") setAttemptsLeft(data.attemptsLeft);
      })
      .catch(() => {
        if (!cancelled) setLinkStatus("invalid");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  // --- ADDED: Step 2 — send the PIN from the email back to the server.
  const handleVerifyPin = async (e) => {
    e.preventDefault();
    setError("");

    // Checked here only to save a pointless round trip; the server
    // checks it too, and the server is what counts.
    if (!/^[0-9]{6}$/.test(pin.trim())) {
      setError("Please enter the 6-digit PIN from your email.");
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, pin: pin.trim() }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        if (data.locked) {
          // Out of tries: this reset is dead, so stop offering the box.
          setLocked(true);
          setAttemptsLeft(0);
        } else if (typeof data.attemptsLeft === "number") {
          setAttemptsLeft(data.attemptsLeft);
        }
        setError(data.message || "That PIN is not right.");
        setPin("");
        return;
      }

      // Right PIN — the password form is unlocked.
      setStage("password");
      setPin("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  // Step 3: save the new password.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Check the new password with the SAME rules as the register page.
    // Stop here and list every broken rule; nothing is sent to the server.
    const { valid, errors } = validatePassword(password);
    if (!valid) {
      setPasswordTouched(true);
      setPasswordErrors(errors);
      return;
    }
    setPasswordErrors([]);

    // Both boxes must match before we save.
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send the one-time token together with the new password.
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // The server re-checks the rules; show its list if it sent one.
        if (Array.isArray(data.errors) && data.errors.length > 0) {
          setPasswordErrors(data.errors);
          return;
        }
        // --- ADDED: the PIN step was not done (or was undone by a newer
        // reset). Go back to the PIN box rather than call the link dead.
        if (data.stage === "pin") {
          setStage("pin");
          setError(data.message || "Please enter the PIN we emailed you first.");
          return;
        }
        throw new Error(data.message || "Could not reset your password");
      }

      setDone(true);
      // Give the user a moment to read the message, then go to login.
      window.setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // What the heading says under the title, depending on the state.
  const subtitle = done
    ? "Password updated."
    : linkStatus === "invalid"
      ? "This page can't be used."
      : locked
        ? "This reset has been cancelled."
        : stage === "pin"
          ? "First, confirm it's really you."
          : "Choose a new password for your account.";

  return (
    <main className="auth-page register-page">
      <div className="register-bg-glow" />
      <div className="register-brand"><BrandMark /></div>

      <section className="register-card">
        <div className="ornament-top" aria-hidden="true"><span /><b /><span /></div>

        <div className="heading-block register-heading">
          <span className="gold-line small" />
          <h1>Reset password</h1>
          <p>{subtitle}</p>
        </div>

        {linkStatus === "checking" && (
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>Checking…</p>
        )}

        {linkStatus === "invalid" && (
          <div className="auth-form">
            <p className="login-error">{INVALID_LINK_MESSAGE}</p>
            <Link href="/forgot-password" className="gold-button" style={{ textAlign: "center", textDecoration: "none" }}>
              START AGAIN
            </Link>
          </div>
        )}

        {/* --- ADDED: too many wrong PINs. The reset is gone; the only
            thing left to offer is a new one. --- */}
        {linkStatus === "valid" && locked && (
          <div className="auth-form">
            <p className="login-error">{error || "Too many wrong PINs. This reset has been cancelled."}</p>
            <Link href="/forgot-password" className="gold-button" style={{ textAlign: "center", textDecoration: "none" }}>
              GET A NEW PIN
            </Link>
          </div>
        )}

        {/* --- ADDED: STEP 1 — the PIN from the email. --- */}
        {linkStatus === "valid" && !locked && !done && stage === "pin" && (
          <form onSubmit={handleVerifyPin} className="auth-form">
            {delivery === "console" ? (
              // The SMTP settings in .env are not complete, so
              // lib/mailer.js printed the PIN in the `npm run dev`
              // terminal. Said out loud, because otherwise the user waits
              // for an email that was never sent.
              //
              // --- CHANGED: this used to name SMTP_HOST as the missing
              // setting. That was only ever true of the first thing to be
              // filled in, and it sent people to check a line that was
              // already correct. The terminal prints WHICH setting is
              // still missing, so this points there instead of guessing.
              <p className="pin-dev-note">
                Email isn&apos;t set up yet — the <strong>SMTP_*</strong> settings in{" "}
                <strong>.env</strong> are incomplete, so your PIN was printed in the{" "}
                <strong>npm run dev</strong> terminal instead of being emailed. That
                terminal line also says which setting is still missing. Development only.
              </p>
            ) : (
              <p className="pin-note">
                We emailed a 6-digit PIN to <strong>{maskedEmail || "your email address"}</strong>.
                Enter it below to prove the account is yours. It expires in 30 minutes.
              </p>
            )}

            <div className="pin-field">
              <AuthField
                label="6-digit PIN"
                placeholder="000000"
                type="text"
                autoComplete="one-time-code"
                value={pin}
                // Digits only, 6 of them: anything else can only be a typo,
                // and letting it through would waste one of five attempts.
                onChange={(next) => setPin(next.replace(/[^0-9]/g, "").slice(0, 6))}
                icon="lock"
                inputProps={{ inputMode: "numeric", maxLength: 6, autoFocus: true }}
              />
            </div>

            {error && <p className="login-error">{error}</p>}

            {/* Only shown once a try has actually been used — telling
                someone "5 attempts left" before they have typed anything
                is just a warning about a problem they do not have. */}
            {attemptsLeft !== null && attemptsLeft < 5 && !error && (
              <p className="pin-note">{attemptsLeft} attempt(s) left.</p>
            )}

            <button className="gold-button" type="submit" disabled={verifying || pin.length !== 6}>
              {verifying ? "CHECKING..." : "CONFIRM PIN"}
            </button>

            <p className="switch-text" style={{ margin: 0 }}>
              No email? <Link href="/forgot-password">Send a new PIN</Link>
            </p>
          </form>
        )}

        {linkStatus === "valid" && done && (
          <div className="auth-form">
            <p style={{ margin: 0, color: "var(--cream)", fontSize: 13, lineHeight: 1.7 }}>
              Your password has been updated. Taking you to sign in…
            </p>
            <Link href="/login" className="gold-button" style={{ textAlign: "center", textDecoration: "none" }}>
              SIGN IN NOW
            </Link>
          </div>
        )}

        {/* STEP 2 — the new password, reachable only once the PIN is in. */}
        {linkStatus === "valid" && !locked && !done && stage === "password" && (
          <form onSubmit={handleSubmit} className="auth-form">
            <AuthField
              label="New password"
              placeholder="Create a new password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              icon="lock"
              showToggle
              // --- ADDED: the conditions open on the first click here
              // too, so both places that ask for a password behave the
              // same way.
              onFocus={() => setPasswordTouched(true)}
            />
            {/* --- CHANGED: was a red list of only the FAILING rules,
                and only after a refused submit. Now every rule is shown
                from the first click, ticking green as it is met. --- */}
            {passwordTouched && <FieldRules rules={passwordRules} title="Password must:" />}
            {passwordErrors.length > 0 && (
              <ul className="login-error" style={{ margin: "-4px 0 0", paddingLeft: "18px" }}>
                {passwordErrors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            )}
            <AuthField
              label="Confirm new password"
              placeholder="Type it again"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={setConfirm}
              icon="lock"
              showToggle
            />

            {error && <p className="login-error">{error}</p>}

            <button className="gold-button" type="submit" disabled={loading}>
              {loading ? "SAVING..." : "RESET PASSWORD"}
            </button>
          </form>
        )}
      </section>

      <footer className="auth-footer register-footer">© 2026 Tarot Diary <span>·</span> Terms <span>·</span> Privacy</footer>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
