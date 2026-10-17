"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthField } from "../../components/AuthField";
import { FieldRules } from "../../components/FieldRules";
import { BrandMark } from "../../components/TarotVisual";
import CheckInReward from "../../components/CheckInReward";
// --- ADDED: password rule checker used before saving to accounts.pwd ---
// checkPasswordRules = every rule + whether it is met, for the live list.
import { validatePassword, checkPasswordRules } from "../../lib/validators/password";
import { setSession } from "../../lib/auth";

// --- ADDED: the same loose shape test as lib/validators/email.js.
// It is copied rather than imported because that file uses node:dns and
// so cannot be pulled into a "use client" page. Only the shape is
// duplicated; whether GOOGLE hosts the address is a question only the
// server can answer, and /api/auth/check-email is the only thing that
// decides it. Keep the two in step if either changes.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// How long to wait after the last keystroke before asking the server
// about the email. Long enough that typing an address is one request,
// short enough that the answer arrives while the user is still looking
// at the field.
const EMAIL_CHECK_DEBOUNCE_MS = 500;

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
  // --- ADDED: true once the password box has been clicked into. The
  // rules used to appear only after CREATE ACCOUNT was pressed and
  // refused; now they are on screen from the moment the user reaches
  // the field, so there is nothing to discover the hard way. It stays
  // true after blur — hiding a half-met list the instant the user tabs
  // to the next field would be worse than leaving it up.
  const [passwordTouched, setPasswordTouched] = useState(false);
  // --- ADDED: same idea for the email box.
  const [emailTouched, setEmailTouched] = useState(false);
  // --- ADDED: what the server last said about the typed email.
  //   status: "idle"    nothing asked yet (or the shape is not an email)
  //           "checking" a request is in flight
  //           "ok"      answered: google / taken below are current
  //           "error"   we could not ask (offline, rate-limited)
  //   google: Google hosts this address's mail
  //   taken:  an account already uses it
  //   checked: the exact address the verdict is about, so a verdict
  //            left over from a moment ago is never read as the answer
  //            for what is in the box now
  const [emailCheck, setEmailCheck] = useState({
    status: "idle",
    checked: "",
    google: false,
    taken: false,
    message: "",
  });
  // True from the moment "Continue with Google" is pressed until the
  // browser leaves this page, so the button stops looking clickable.
  const [googleStarting, setGoogleStarting] = useState(false);
  // Same as the login page: a new account collects day 1 of the streak
  // before reaching the home page, instead of silently landing there
  // with coins it was never shown.
  const [showReward, setShowReward] = useState(false);

  // --- ADDED: the live password rules, recomputed on every keystroke.
  const passwordRules = checkPasswordRules(password);
  const emailShapeOk = EMAIL_SHAPE.test(email.trim());

  // --- ADDED: which check is the newest. Requests can come back out of
  // order, and a slow answer about an address the user has already
  // changed must not overwrite a fresh one — so every run takes a
  // ticket, and only the holder of the latest ticket may set state.
  const emailCheckId = useRef(0);

  /**
   * --- ADDED: ask the server about one address.
   *
   * Returns the verdict as well as storing it, because handleSubmit
   * needs the answer right away and cannot wait for a re-render.
   *
   * On "error" (rate-limited, offline) the sign-up is NOT blocked here:
   * /api/auth/register makes the same check itself and is the one that
   * counts, so a hiccup in this courtesy call must not trap a user who
   * typed a perfectly good address.
   */
  const runEmailCheck = useCallback(async (candidate) => {
    const trimmed = candidate.trim();
    const ticket = (emailCheckId.current += 1);
    // Apply a result only while this is still the newest request.
    const apply = (verdict) => {
      if (emailCheckId.current === ticket) setEmailCheck(verdict);
      return verdict;
    };

    if (!EMAIL_SHAPE.test(trimmed)) {
      return apply({ status: "idle", checked: "", google: false, taken: false, message: "" });
    }

    apply({ status: "checking", checked: trimmed, google: false, taken: false, message: "" });
    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        return apply({
          status: "error",
          checked: trimmed,
          google: false,
          taken: false,
          message: data.message || "We couldn't check this email just now.",
        });
      }

      return apply({
        status: "ok",
        checked: trimmed,
        google: Boolean(data.google),
        taken: Boolean(data.taken),
        message: "",
      });
    } catch {
      return apply({
        status: "error",
        checked: trimmed,
        google: false,
        taken: false,
        message: "We couldn't check this email just now.",
      });
    }
  }, []);

  // --- ADDED: check the email as the user types, once they stop.
  // The timer is cleared on every keystroke, so only the address the
  // user settled on is ever sent — one request per address, not one per
  // character.
  useEffect(() => {
    // Nothing to ask about until it at least looks like an address. No
    // state is cleared here: `emailVerdict` below ignores any answer that
    // is not about what is currently typed, so an old one cannot linger.
    if (!emailShapeOk) return;
    const timer = window.setTimeout(() => runEmailCheck(email), EMAIL_CHECK_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [email, emailShapeOk, runEmailCheck]);

  // --- ADDED: a verdict only speaks for the address it was about.
  // Inside the debounce pause the box already holds something newer than
  // the last answer, and reading that answer as current would tick the
  // conditions green for an address nobody has checked. Derived rather
  // than reset in the effect, so there is one source of truth and no
  // extra render.
  const emailVerdict =
    emailCheck.checked === email.trim()
      ? emailCheck
      : { status: "idle", checked: "", google: false, taken: false, message: "" };

  // --- ADDED: the email conditions, in the order they become relevant.
  // "Not already registered" is only claimed once the server has really
  // said so: an unanswered rule must read as "not done yet", never as
  // passed.
  const emailAnswered = emailVerdict.status === "ok";
  const emailRules = [
    {
      key: "shape",
      message: "Enter a complete email address, e.g. you@gmail.com.",
      met: emailShapeOk,
    },
    {
      key: "google",
      message:
        "Must be an email Google hosts — a Gmail address, or a domain on Google Workspace.",
      met: emailAnswered && emailVerdict.google,
    },
    {
      key: "free",
      message: "Must not already have an account.",
      met: emailAnswered && emailVerdict.google && !emailVerdict.taken,
    },
  ];

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
      setPasswordTouched(true);
      setPasswordErrors(errors);
      return;
    }
    setPasswordErrors([]);
    // --- END ADDED ---

    // --- ADDED: gate the save on the email rules too.
    // The debounced check above may not have run yet (a pasted address
    // and a fast click), so ask once more here unless we already have a
    // fresh answer for exactly this address.
    setEmailTouched(true);
    const verdict = emailAnswered ? emailVerdict : await runEmailCheck(email);
    if (verdict.status === "ok" && !verdict.google) {
      setError(
        "Please use a Google-hosted email address — the conditions below say which ones count."
      );
      return;
    }
    if (verdict.status === "ok" && verdict.taken) {
      setError("This email is already registered. Sign in instead.");
      return;
    }
    // status "error"/"idle" falls through on purpose: the register route
    // repeats both checks, so a failed courtesy call costs the user a
    // round trip, not their sign-up.

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
        // --- ADDED: the route now answers with a list for a broken
        // rule (a non-Google email, a password that fails the policy).
        // Showing the list is far more use than one run-together line.
        if (Array.isArray(data.errors) && data.errors.length > 0) {
          setError(data.errors.join(" "));
          return;
        }
        // e.g. 409 "This email is already registered"
        throw new Error(data.message || "Could not create your account");
      }

      // ----- Step 2: the session cookie is really valid -----
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      const meData = await meRes.json().catch(() => ({}));
      if (!meRes.ok || !meData.success || !meData.user) {
        throw new Error("We couldn't verify your account. Please try again.");
      }

      setSession(meData.user);
      setShowReward(true);
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
          <AuthField
            label="Email address"
            placeholder="you@gmail.com"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            icon="mail"
            // --- ADDED: open the email conditions on the first click,
            // the same moment the password ones open.
            onFocus={() => setEmailTouched(true)}
          />
          {/* --- ADDED: the email conditions. Dimmed while the server is
              still answering, so a rule that is merely unanswered does
              not look like a rule that failed. --- */}
          {emailTouched && (
            <FieldRules
              rules={emailRules}
              title="Email must:"
              pending={emailVerdict.status === "checking"}
            />
          )}
          {/* We could not reach the check. Said plainly, because the
              sign-up is still allowed to go ahead from here. */}
          {emailTouched && emailVerdict.status === "error" && (
            <p className="pin-note">{emailVerdict.message}</p>
          )}
          {/* --- END ADDED --- */}

          <AuthField
            label="Password"
            placeholder="Create a password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            icon="lock"
            showToggle
            // --- ADDED: this is the "show the conditions as soon as the
            // field is clicked" part. ---
            onFocus={() => setPasswordTouched(true)}
          />
          {/* --- CHANGED: was a red list of only the FAILING rules, and
              only after a refused submit. Now every rule is on screen
              from the first click, ticking green as it is met. The red
              list below is kept for the one case it is still right for:
              the user pressed the button anyway. --- */}
          {passwordTouched && <FieldRules rules={passwordRules} title="Password must:" />}
          {passwordErrors.length > 0 && (
            <ul className="login-error" style={{ margin: "-4px 0 0", paddingLeft: "18px" }}>
              {passwordErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
          {/* --- END CHANGED --- */}

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

      {showReward && <CheckInReward onCollect={() => router.push("/")} />}
    </main>
  );
}
