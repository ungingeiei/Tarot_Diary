/**
 * ---------------------------------------------------------------------
 * lib/mailer.js — SENDS THE PASSWORD RESET EMAIL
 * ---------------------------------------------------------------------
 * Used by app/api/auth/forgot-password/route.js.
 *
 * TWO MODES:
 *   1. DEV MODE  — if SMTP_HOST is not set in .env.local, no email is
 *      sent. The reset link is printed in the terminal running
 *      `npm run dev`. Copy it into the browser to test the flow.
 *   2. REAL MODE — if SMTP is configured, the email is sent through
 *      nodemailer. Install it first:   npm install nodemailer
 *
 * .env.local variables (REAL MODE):
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=465
 *   SMTP_USER=your-address@gmail.com
 *   SMTP_PASSWORD=your-app-password
 *   MAIL_FROM="Tarot Diary <your-address@gmail.com>"
 * ---------------------------------------------------------------------
 */

// `code` = the 6-digit code typed on the reset-password page (the link still works too).
export async function sendPasswordResetEmail(to, resetUrl, code) {
  // ----- DEV MODE: just print the link -----
  if (!process.env.SMTP_HOST) {
    console.log(`[mailer] SMTP not configured. Reset code for ${to}: ${code}\nReset link:\n${resetUrl}`);
    return;
  }

  // ----- REAL MODE: send with nodemailer -----
  // Imported here (not at the top of the file) so the app still builds
  // and runs in dev mode even if nodemailer is not installed.
  const { default: nodemailer } = await import("nodemailer");

  const port = Number(process.env.SMTP_PORT) || 465;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // true for 465, false for other ports (587 uses STARTTLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: "Reset your Tarot Diary password",
    // Plain-text version (for mail apps that do not show HTML).
    text:
      `We received a request to reset your Tarot Diary password.\n\n` +
      `Your reset code: ${code}\n` +
      `Type it on the reset password page you just opened (valid for 30 minutes).\n\n` +
      `Or open this link to choose a new password:\n${resetUrl}\n\n` +
      `If you did not ask for this, you can ignore this email — your password will not change.`,
    // HTML version.
    html:
      `<p>We received a request to reset your Tarot Diary password.</p>` +
      `<p>Your reset code: <strong style="font-size:22px;letter-spacing:4px">${code}</strong><br>` +
      `Type it on the reset password page you just opened (valid for 30 minutes).</p>` +
      `<p>Or <a href="${resetUrl}">open this link to choose a new password</a>.</p>` +
      `<p>If you did not ask for this, you can ignore this email — your password will not change.</p>`,
  });
}
