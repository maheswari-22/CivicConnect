import nodemailer from 'nodemailer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { LOGO_CID } from './templates.js';

const LOGO_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'assets', 'logo.png');

/* Email sending.
   - With SMTP_HOST set, mail goes out through that SMTP server (Gmail, Outlook, Brevo, SendGrid, ...).
   - Without it (normal while developing) nothing is sent: the message is printed in the API terminal,
     so the link can still be copied and tested.  In production that is treated as an error. */

export const mailConfigured = () => Boolean(env.smtp.host);
let transport = null;

const getTransport = () => {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure, // true for port 465 (implicit TLS)
      requireTLS: !env.smtp.secure, // on 587 refuse to send the password unencrypted
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return transport;
};

/** Test hook: replace the transport (anything with sendMail / verify). */
export const setTransport = (t) => {
  transport = t;
};

/** Gmail / Outlook reject or rewrite a From address that is not the account that logs in. Use the login address then. */
export function fromAddress() {
  const { from, user, host } = env.smtp;
  const looksLikePlaceholder = /@civicconnect\.local>?\s*$/i.test(from);
  const providerNeedsLoginAddress = /gmail|googlemail|outlook|office365|hotmail|live\.com|yahoo/i.test(host);
  if (user && /@/.test(user) && (looksLikePlaceholder || providerNeedsLoginAddress) && !from.toLowerCase().includes(user.toLowerCase()))
    return `CivicConnect <${user}>`;
  return from;
}

/** Turns a nodemailer / network error into one plain sentence that says what to change. */
export function explainMailError(error) {
  const code = error?.code || '';
  const msg = String(error?.message || error);
  if (code === 'EAUTH' || /535|534|invalid login|username and password not accepted|application-specific/i.test(msg))
    return 'The SMTP server rejected the login. For Gmail you must use a 16-character App Password (not your normal password) and 2-Step Verification must be on. Check SMTP_USER and SMTP_PASS.';
  if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'ECONNREFUSED', 'EDNS', 'ENOTFOUND'].includes(code) || /timed? ?out|ECONNREFUSED|ENOTFOUND/i.test(msg))
    return `Could not reach ${env.smtp.host}:${env.smtp.port}. Check SMTP_HOST / SMTP_PORT, your internet connection, and that your network or firewall allows outgoing SMTP. Port 587 with SMTP_SECURE=false is the usual choice; use 465 with SMTP_SECURE=true if 587 is blocked.`;
  if (/wrong version number|ssl|tls|certificate/i.test(msg))
    return 'TLS mismatch. Use SMTP_PORT=587 with SMTP_SECURE=false, or SMTP_PORT=465 with SMTP_SECURE=true.';
  if (code === 'EENVELOPE' || /recipient|mailbox|address/i.test(msg))
    return 'The server did not accept the sender or recipient address. Make MAIL_FROM use the same address as SMTP_USER.';
  return msg;
}

/** Checks the SMTP settings by connecting and logging in (no email is sent). */
export async function verifyMail() {
  if (!mailConfigured())
    return { ok: false, reason: 'SMTP_HOST is not set — emails are only printed in the terminal.' };
  try {
    await getTransport().verify();
    return { ok: true };
  }
  catch (error) {
    return { ok: false, reason: explainMailError(error) };
  }
}

const TRANSIENT = new Set(['ETIMEDOUT', 'ECONNECTION', 'ESOCKET', 'ECONNRESET', 'EDNS']);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Sends one email (one automatic retry on a network hiccup). Resolves { sent: boolean, devOnly?: boolean }; never throws. */
export async function sendMail({ to, subject, text, html }) {
  if (!mailConfigured()) {
    if (env.nodeEnv === 'production')
      console.error(`[mail] SMTP is not configured — email to ${to} was NOT sent.`);
    else
      console.log(`\n[mail:dev] SMTP not configured, so this email was not sent. Here is what it would say:\n  To: ${to}\n  Subject: ${subject}\n  ${text.replace(/\n/g, '\n  ')}\n`);
    return { sent: false, devOnly: true };
  }
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const attachments = html && html.includes(`cid:${LOGO_CID}`) ? [{ filename: 'civicconnect-logo.png', path: LOGO_PATH, cid: LOGO_CID }] : [];
      const info = await getTransport().sendMail({
        from: fromAddress(), to, subject, text, html, attachments,
        // Looks like what it is: an automatic, transactional message. Helps mail apps file it correctly and stops auto-replies.
        headers: { 'X-Auto-Response-Suppress': 'All', 'Auto-Submitted': 'auto-generated' },
      });
      console.log(`[mail] sent "${subject}" to ${to} (${info.messageId || 'ok'})`);
      return { sent: true };
    }
    catch (error) {
      if (attempt === 1 && TRANSIENT.has(error?.code)) {
        await wait(1500);
        continue;
      }
      const reason = explainMailError(error);
      console.error(`[mail] FAILED to send "${subject}" to ${to}: ${reason}`);
      return { sent: false, error: reason };
    }
  }
  return { sent: false, error: 'Unknown mail error.' };
}

/** Called once at start-up so a wrong SMTP password shows up immediately, not when the first user needs an email. */
export async function checkMailOnStartup() {
  if (!mailConfigured()) {
    console.warn(env.nodeEnv === 'production'
      ? '[mail] SMTP_HOST is not set: password-reset emails CANNOT be sent.'
      : '[mail] SMTP is not configured (development): emails are printed in this terminal instead of being sent. See EMAIL_SETUP.md to send real emails.');
    return;
  }
  const result = await verifyMail();
  console.log(result.ok ? `[mail] SMTP login OK (${env.smtp.host}). Sending as ${fromAddress()}.` : `[mail] SMTP problem: ${result.reason}`);
}

/* The email designs live in templates.js (pure functions, easy to test and preview). */
export * from './templates.js';
