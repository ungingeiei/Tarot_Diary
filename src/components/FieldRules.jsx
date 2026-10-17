/**
 * ---------------------------------------------------------------------
 * components/FieldRules.jsx — the live condition list under a field
 * ---------------------------------------------------------------------
 * One list, used by every field that has rules to meet:
 *   - the password box on /register and /reset-password
 *     (lib/validators/password.js)
 *   - the email box on /register
 *     (POST /api/auth/check-email -> lib/validators/email.js)
 *
 * WHY: the rules used to appear only AFTER the user pressed the button
 * and the form refused them — so the first a user heard of "needs a
 * special character" was a wall of red where their password used to be.
 * Shown from the moment the field is focused, each line ticks over from
 * grey to green as it is satisfied, and nothing is a surprise.
 *
 * Props:
 *   rules   - [{ key, message, met }]  met = satisfied right now
 *   title   - the small caption above the list, e.g. "Password must:"
 *   pending - true while an answer is still being waited on (the email
 *             check is a network call), which greys the list and stops
 *             an unanswered rule from reading as a failure
 *
 * Deliberately NOT .login-error: these are conditions, not errors. Red
 * stays for "the form refused you" so it keeps meaning something.
 *
 * aria-live="polite" so a screen reader hears a rule tick off as the
 * user types, rather than the list changing silently.
 * ---------------------------------------------------------------------
 */

export function FieldRules({ rules, title, pending = false }) {
  if (!rules || rules.length === 0) return null;

  return (
    <div className={pending ? "field-rules pending" : "field-rules"} aria-live="polite">
      {title && <p className="field-rules-title">{title}</p>}
      <ul>
        {rules.map((rule) => (
          <li key={rule.key} className={rule.met ? "met" : undefined}>
            {/* The mark is decoration — the class already carries the
                state and the text says what the rule is, so a screen
                reader should skip it instead of reading "check". */}
            <span className="rule-mark" aria-hidden="true">{rule.met ? "✓" : "○"}</span>
            <span>{rule.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
