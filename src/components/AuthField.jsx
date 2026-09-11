"use client";

import { useState } from "react";

function MailIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="m4 7 8 6 8-6"/></svg>;
}

function UserIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.1-5.5 7-5.5s6.2 1.9 7 5.5"/></svg>;
}

function LockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="1.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>;
}

function EyeIcon({ visible }) {
  return visible ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.2-5 9.5-5 9.5 5 9.5 5-3.2 5-9.5 5-9.5-5-9.5-5Z"/><circle cx="12" cy="12" r="2.5"/></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 6.9A9.5 9.5 0 0 1 12 7c6.3 0 9.5 5 9.5 5a16 16 0 0 1-3.1 3.4M6.2 6.7C3.9 8.1 2.5 12 2.5 12s3.2 5 9.5 5c1 0 1.9-.2 2.7-.5"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>;
}

export function AuthField({ label, placeholder, type = "text", autoComplete, value, onChange, icon, showToggle }) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="field-wrap">
      <label className={focused ? "field-label focused" : "field-label"}>{label}</label>
      <div className={focused ? "input-shell focused" : "input-shell"}>
        <span className="input-icon">
          {icon === "mail" ? <MailIcon /> : icon === "user" ? <UserIcon /> : <LockIcon />}
        </span>
        <input
          type={isPassword && showToggle && visible ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        {isPassword && showToggle && (
          <button className="eye-button" type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? "Hide password" : "Show password"}>
            <EyeIcon visible={visible} />
          </button>
        )}
      </div>
    </div>
  );
}
