/**
 * ---------------------------------------------------------------------
 * PASSWORD VALIDATION — rules enforced before a password is saved to
 * the `accounts.pwd` column (see ERD_V1_1.sql).
 * ---------------------------------------------------------------------
 * Rules:
 *   1. No whitespace anywhere in the password (spaces, tabs, etc.).
 *   2. At least 1 uppercase letter   (A-Z)
 *   3. At least 1 lowercase letter   (a-z)
 *   4. At least 1 numeric digit      (0-9)
 *   5. At least 1 special character  (anything that is not a letter,
 *      digit, or whitespace, e.g. ! @ # $ % ^ & * etc.)
 *
 * Usage:
 *   import { validatePassword } from "@/lib/validators/password";
 *   const { valid, errors } = validatePassword(rawPassword);
 *   if (!valid) { // show `errors` to the user, do NOT save }
 *
 *   // --- ADDED: for the live checklist under the password field ---
 *   import { checkPasswordRules } from "@/lib/validators/password";
 *   checkPasswordRules(rawPassword);  // every rule + whether it is met
 *
 * Note: this only checks the password's *shape*. Actual saving to the
 * database should still hash the password (e.g. bcrypt/argon2) — never
 * store it as plain text, even after it passes these rules.
 * ---------------------------------------------------------------------
 */

// Each rule = a test function + the message to show when it fails.
// Kept as a list (rather than one big regex) so every unmet rule can
// be reported at once, instead of stopping at the first failure.
const PASSWORD_RULES = [
  {
    key: "noWhitespace",
    test: (pwd) => !/\s/.test(pwd),
    message: "Password must not contain spaces or whitespace.",
  },
  {
    key: "hasUppercase",
    test: (pwd) => /[A-Z]/.test(pwd),
    message: "Password must contain at least 1 uppercase letter (A-Z).",
  },
  {
    key: "hasLowercase",
    test: (pwd) => /[a-z]/.test(pwd),
    message: "Password must contain at least 1 lowercase letter (a-z).",
  },
  {
    key: "hasNumber",
    test: (pwd) => /[0-9]/.test(pwd),
    message: "Password must contain at least 1 number (0-9).",
  },
  {
    key: "hasSpecialChar",
    // "special character" = not a letter, not a digit, not whitespace
    test: (pwd) => /[^A-Za-z0-9\s]/.test(pwd),
    message: "Password must contain at least 1 special character (e.g. ! @ # $ %).",
  },
];

/**
 * Validate a password against all rules above.
 * @param {string} password
 * @returns {{ valid: boolean, errors: string[] }}
 *   valid  - true only if every rule passes
 *   errors - human-readable message for each rule that failed
 *            (empty array when valid is true)
 */
export function validatePassword(password) {
  if (typeof password !== "string" || password.length === 0) {
    return { valid: false, errors: ["Password is required."] };
  }

  const errors = PASSWORD_RULES.filter((rule) => !rule.test(password)).map(
    (rule) => rule.message
  );

  return { valid: errors.length === 0, errors };
}

/**
 * --- ADDED -------------------------------------------------------------
 * Every rule with its CURRENT state, in a fixed order.
 *
 * validatePassword() only reports the rules that FAIL, which is what the
 * server wants. The register / reset-password pages want the opposite:
 * the whole list from the moment the field is focused — including the
 * rules already satisfied — so the user can watch them tick off instead
 * of guessing why the form keeps refusing.
 *
 * `met` is false for everything while the box is still empty, so the
 * checklist reads as "nothing done yet" rather than as five errors.
 *
 * @param {string} password
 * @returns {{ key: string, message: string, met: boolean }[]}
 * -----------------------------------------------------------------------
 */
export function checkPasswordRules(password) {
  const pwd = typeof password === "string" ? password : "";
  return PASSWORD_RULES.map((rule) => ({
    key: rule.key,
    message: rule.message,
    met: pwd.length > 0 && rule.test(pwd),
  }));
}

/**
 * Convenience boolean-only check, e.g. for disabling a submit button
 * without needing the full error list.
 * @param {string} password
 * @returns {boolean}
 */
export function isPasswordValid(password) {
  return validatePassword(password).valid;
}