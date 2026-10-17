/**
 * ---------------------------------------------------------------------
 * lib/mailer.js — sends the password-reset PIN
 * ---------------------------------------------------------------------
 * The reset flow asks for a 6-digit PIN that only the mailbox owner can
 * read (see lib/passwordReset.js). This file is how that PIN leaves the
 * server, and it is the ONLY file that knows how mail is sent — the rest
 * of the app calls sendResetPin() and nothing else.
 *
 * --- CHANGED: THREE WAYS TO SEND, CHOSEN BY ONE SETTING --------------
 * The app is heading for AWS, where mail goes out through SES instead of
 * an SMTP server. Rather than rewrite this file at deploy time, all
 * three ways live here and MAIL_TRANSPORT picks one:
 *
 *   console  the PIN is printed in the `npm run dev` terminal.
 *            Development only. No account, no password, no network.
 *   smtp     any SMTP server, via nodemailer: Gmail, SES's own SMTP
 *            endpoint, Brevo, Mailgun… Needs SMTP_* below.
 *   ses      Amazon SES through the AWS SDK. No password anywhere: on
 *            AWS the task's IAM role signs the call. Needs SES_* below.
 *
 * Leaving MAIL_TRANSPORT unset auto-detects, so nobody has to set it to
 * keep working: SMTP settings present -> "smtp", otherwise "console".
 * It never auto-detects "ses", because silently mailing real people the
 * moment an AWS variable appears in the environment is not a surprise
 * anyone wants.
 *
 * .env settings, by transport:
 *   smtp : SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, MAIL_FROM
 *   ses  : SES_REGION, MAIL_FROM, and OPTIONALLY SES_ACCESS_KEY_ID /
 *          SES_SECRET_ACCESS_KEY / SES_SESSION_TOKEN
 *
 * --- WHY SES_* AND NOT AWS_* -----------------------------------------
 * THIS IS A TRAP, AND THE REASON THESE NAMES LOOK REDUNDANT.
 * AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY in .env are NOT AWS keys —
 * they belong to Neon's object store, which only speaks the S3 API
 * (see lib/storage.js; the key starts with "nak_", a real AWS key starts
 * with "AKIA"). The AWS SDK reads those names automatically, so an SES
 * client built the normal way would pick up Neon's credentials and fail
 * with InvalidClientTokenId — an error that points nowhere near the
 * cause. Keeping SES on its own names makes the two impossible to mix up.
 *
 * When SES_ACCESS_KEY_ID is NOT set, the SDK's normal credential chain
 * is used instead, which on AWS means the task's IAM role. That is the
 * intended production setup: no long-lived secret exists to leak.
 * (On AWS Academy Learner Lab the lab credentials are temporary and
 * include a session token, which is why SES_SESSION_TOKEN exists.)
 *
 * Nothing here ever throws at the caller: a mail server that is down
 * must not turn into a 500 on /api/auth/forgot-password. The failure is
 * returned as delivery: "failed" and the route decides what to say.
 * ---------------------------------------------------------------------
 */

import nodemailer from "nodemailer";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

// ----- SMTP settings -----
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || "";
// Google shows an App password as "abcd efgh ijkl mnop". People paste it
// exactly like that, and Gmail rejects it with the spaces in, so they are
// taken out here rather than being a mistake nobody can see.
const SMTP_PASSWORD = (process.env.SMTP_PASSWORD || "").replace(/\s+/g, "");

// ----- SES settings (see the warning above about AWS_* ) -----
const SES_REGION = process.env.SES_REGION || "";
const SES_ACCESS_KEY_ID = process.env.SES_ACCESS_KEY_ID || "";
const SES_SECRET_ACCESS_KEY = process.env.SES_SECRET_ACCESS_KEY || "";
const SES_SESSION_TOKEN = process.env.SES_SESSION_TOKEN || "";
// Optional: an SES configuration set, which is what turns on bounce and
// complaint tracking. Worth setting in production — SES suspends an
// account whose bounce rate passes 5%, and without a configuration set
// there is no record of which addresses bounced.
const SES_CONFIGURATION_SET = process.env.SES_CONFIGURATION_SET || "";

const MAIL_FROM = process.env.MAIL_FROM || SMTP_USER || "no-reply@tarot-diary.local";

/** Is there enough to send over SMTP? */
function smtpReady() {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASSWORD);
}

/**
 * Which transport is in use, as a string: "console" | "smtp" | "ses".
 *
 * An explicit MAIL_TRANSPORT always wins, EXCEPT that an incomplete
 * setup falls back to "console" rather than failing every reset. On a
 * deployed site that fallback is itself the bug — which is why the
 * console transport prints a loud warning and the reset page says out
 * loud that no email was sent.
 */
export function mailTransport() {
  const wanted = (process.env.MAIL_TRANSPORT || "").trim().toLowerCase();

  if (wanted === "ses") return SES_REGION ? "ses" : "console";
  if (wanted === "smtp") return smtpReady() ? "smtp" : "console";
  if (wanted === "console") return "console";

  // Not set: keep whatever already works. Never auto-select "ses".
  return smtpReady() ? "smtp" : "console";
}

/** True when a real email will actually be sent. */
export function isMailConfigured() {
  return mailTransport() !== "console";
}

// One client/transporter per process — building one per email would open
// a new connection every time. Created on first use, because at import
// time the environment may not be loaded yet.
let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      // 465 is implicit TLS; 587 starts plain and upgrades with STARTTLS.
      secure: SMTP_PORT === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASSWORD } : undefined,
    });
  }
  return transporter;
}

let sesClient = null;
function getSesClient() {
  if (!sesClient) {
    sesClient = new SESv2Client({
      region: SES_REGION,
      // Explicit keys only when they were given. Leaving `credentials`
      // undefined is what makes the SDK use the task's IAM role, which
      // is the whole point of the SES transport.
      ...(SES_ACCESS_KEY_ID
        ? {
            credentials: {
              accessKeyId: SES_ACCESS_KEY_ID,
              secretAccessKey: SES_SECRET_ACCESS_KEY,
              // Temporary lab/STS credentials are useless without this.
              ...(SES_SESSION_TOKEN ? { sessionToken: SES_SESSION_TOKEN } : {}),
            },
          }
        : {}),
    });
  }
  return sesClient;
}

/** The message itself, written once and used by every transport. */
function buildMessage({ pin, minutes }) {
  return {
    subject: `Your Tarot Diary password reset PIN: ${pin}`,
    text: [
      "Someone asked to reset the password for this Tarot Diary account.",
      "",
      `Your PIN is: ${pin}`,
      "",
      `It expires in ${minutes} minutes and can be used once.`,
      "If this wasn't you, you can ignore this email — your password has not",
      "been changed, and nobody can change it without this PIN.",
    ].join("\n"),
  };
}

/**
 * Mail one reset PIN.
 *
 * @param {object} options
 * @param {string} options.to         the account's email address
 * @param {string} options.pin        the 6 digits (plain — this is the only
 *                                    place they exist outside the user's
 *                                    inbox; the database keeps a hash)
 * @param {number} options.minutes    how long the PIN stays valid
 * @returns {Promise<{ delivery: "email" | "console" | "failed" }>}
 */
export async function sendResetPin({ to, pin, minutes }) {
  const transport = mailTransport();
  const { subject, text } = buildMessage({ pin, minutes });

  // ----- Development fallback: nothing is configured -----
  if (transport === "console") {
    // Say WHICH setting is missing. "No email was sent" on its own sends
    // people hunting through a config file they have already filled in.
    const wanted = (process.env.MAIL_TRANSPORT || "").trim().toLowerCase();
    const missing =
      wanted === "ses"
        ? "MAIL_TRANSPORT=ses but SES_REGION is not set"
        : !SMTP_HOST
          ? "SMTP_HOST is not set"
          : !SMTP_USER
            ? "SMTP_USER is not set"
            : !SMTP_PASSWORD
              ? "SMTP_PASSWORD is empty — paste a Google App password into .env"
              : "no mail transport is configured";
    console.warn(
      [
        "",
        "  ┌──────────────────────────────────────────────────────────────┐",
        "  │  NO EMAIL WAS SENT.                                          │",
        `  │  ${missing.padEnd(58)}│`,
        "  │  Development only — never run a real site like this.         │",
        "  └──────────────────────────────────────────────────────────────┘",
        `  Password reset PIN for ${to}: ${pin}  (valid ${minutes} minutes)`,
        "",
      ].join("\n")
    );
    return { delivery: "console" };
  }

  try {
    if (transport === "ses") {
      await getSesClient().send(
        new SendEmailCommand({
          FromEmailAddress: MAIL_FROM,
          Destination: { ToAddresses: [to] },
          ...(SES_CONFIGURATION_SET ? { ConfigurationSetName: SES_CONFIGURATION_SET } : {}),
          Content: {
            Simple: {
              Subject: { Data: subject, Charset: "UTF-8" },
              Body: { Text: { Data: text, Charset: "UTF-8" } },
            },
          },
        })
      );
    } else {
      await getTransporter().sendMail({ from: MAIL_FROM, to, subject, text });
    }
    return { delivery: "email" };
  } catch (error) {
    // Logged, not thrown: the caller answers "couldn't send, try again"
    // rather than a 500, and the PIN itself is never logged here.
    // The transport is named because the two fail for completely
    // different reasons — a wrong App password vs. an unverified SES
    // identity or an account still in the SES sandbox.
    console.error(`Could not send the password reset PIN (${transport}):`, error);
    return { delivery: "failed" };
  }
}
