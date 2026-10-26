// Usage:  npm run mail:test            -> checks the SMTP login only
//         npm run mail:test you@x.com  -> also sends a real test email to that address
import { env } from '../config/env.js';
import { mailConfigured, verifyMail, sendMail, fromAddress, passwordResetEmail } from './mailer.js';

const to = process.argv[2];
console.log(`SMTP host: ${env.smtp.host || '(not set)'}  port: ${env.smtp.port}  secure: ${env.smtp.secure}  user: ${env.smtp.user || '(none)'}  from: ${fromAddress()}`);
if (!mailConfigured()) {
  console.log('\nSMTP is NOT configured: set SMTP_HOST / SMTP_USER / SMTP_PASS in Backend/.env (see .env.example). Until then, reset links are only printed in the API terminal.');
  process.exit(1);
}
const v = await verifyMail();
console.log(v.ok ? '\n✔ Connected and logged in to the SMTP server.' : `\n✘ Could not use the SMTP server: ${v.reason}`);
if (!v.ok)
  process.exit(1);
if (to) {
  // Sends the real password-reset design (with a harmless sample link), so you see exactly what users will get.
  const r = await sendMail({
    to, ...passwordResetEmail({ name: 'there', portal: 'Citizen', link: `${env.appUrl}/citizen/?reset=sample-link-not-valid`, minutes: env.resetTokenMinutes })
  });
  console.log(r.sent ? `✔ Test email sent to ${to}. Check the inbox (and spam folder).` : `✘ Sending failed: ${r.error}`);
  process.exit(r.sent ? 0 : 1);
}
