import crypto from 'node:crypto';
import { query, withTransaction } from '../db/database.js';
import { env } from '../config/env.js';
import { id, now } from '../utils/id.js';
import { verifyPassword } from '../utils/auth.js';
import { AppError } from '../utils/http.js';
import { findUserById } from './users.js';
import { sendMail, verifyEmailEmail, changeEmailEmail, emailChangedNoticeEmail } from '../mail/mailer.js';

/* Two kinds of one-time links, both sent by e-mail and both opened through the API (GET /api/auth/confirm-email):
   - verify: "is this really your address?"  (after sign-up)
   - change: "you asked to use this new address" (after Profile > Change email, which needs the current password)
   Only a SHA-256 hash of the token is stored, so a copy of the database cannot be used to confirm anything. */

const HOURS = 48;
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

async function issue(user, purpose, newEmail) {
  const token = crypto.randomBytes(32).toString('hex');
  await withTransaction(async (client) => {
    await client.query("UPDATE email_tokens SET used_at=$1 WHERE user_id=$2 AND purpose=$3 AND used_at IS NULL", [now(), user.id, purpose]);
    await client.query(
      'INSERT INTO email_tokens (id,user_id,purpose,new_email,token_hash,expires_at,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [id('eml_'), user.id, purpose, newEmail, hashToken(token), new Date(Date.now() + HOURS * 3600 * 1000), now()],
    );
  });
  return `${env.apiUrl}/api/auth/confirm-email?token=${token}`;
}

/** Sends the "confirm your email" link for the address on the account. Never throws. */
export async function sendVerificationEmail(userId) {
  try {
    const user = await findUserById(userId);
    if (!user?.email || user.email_verified) return;
    const link = await issue(user, 'verify', user.email);
    await sendMail({ to: user.email, ...verifyEmailEmail({ name: user.name, link, hours: HOURS }) });
  } catch (error) {
    console.error('[email] could not send the verification email:', error.message);
  }
}

/** Step 1 of changing the e-mail: needs the current password. Nothing changes until the link in the new inbox is opened. */
export async function requestEmailChange(userId, newEmail, currentPassword) {
  const user = await findUserById(userId);
  if (!user || !(await verifyPassword(currentPassword, user.password_hash)))
    throw new AppError(400, 'Current password is incorrect.');
  if (user.email && user.email.toLowerCase() === newEmail.toLowerCase())
    throw new AppError(400, 'That is already your email address.');
  const { rows } = await query('SELECT 1 FROM users WHERE email=$1 AND id<>$2 AND email_verified=TRUE', [newEmail, userId]);
  if (rows.length) throw new AppError(409, 'That email is already used by another account.');
  const link = await issue(user, 'change', newEmail);
  await sendMail({ to: newEmail, ...changeEmailEmail({ name: user.name, link, hours: HOURS }) });
}

/** Opens a link from either e-mail. Returns { ok, message } for the confirmation page. */
export async function confirmEmailToken(token) {
  const bad = { ok: false, message: 'This link is invalid or has expired. Please request a new one from your profile.' };
  if (!/^[a-f0-9]{64}$/.test(token || '')) return bad;
  let notice = null;
  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT t.id, t.user_id, t.purpose, t.new_email, u.active, u.email AS current_email, u.name
       FROM email_tokens t JOIN users u ON u.id=t.user_id
       WHERE t.token_hash=$1 AND t.used_at IS NULL AND t.expires_at>$2 FOR UPDATE OF t`,
      [hashToken(token), now()],
    );
    const row = rows[0];
    if (!row || !row.active) return bad;
    if (row.purpose === 'verify' && row.current_email !== row.new_email) return bad; // the address was changed since
    // Proving you own an address beats an unconfirmed claim on it: release it from any account that never confirmed it.
    await client.query('UPDATE users SET email=NULL WHERE email=$1 AND id<>$2 AND email_verified=FALSE', [row.new_email, row.user_id]);
    const { rows: holder } = await client.query('SELECT 1 FROM users WHERE email=$1 AND id<>$2', [row.new_email, row.user_id]);
    if (holder.length) return { ok: false, message: 'That email is already used by another account.' };
    await client.query('UPDATE users SET email=$1, email_verified=TRUE, updated_at=$2 WHERE id=$3', [row.new_email, now(), row.user_id]);
    await client.query('UPDATE email_tokens SET used_at=$1 WHERE user_id=$2 AND used_at IS NULL', [now(), row.user_id]);
    if (row.purpose === 'change' && row.current_email && row.current_email !== row.new_email)
      notice = { to: row.current_email, name: row.name, newEmail: row.new_email };
    return { ok: true, message: row.purpose === 'change' ? 'Your new email address is confirmed.' : 'Your email address is confirmed.' };
  });
  // Tell the OLD address, so a hijacked account cannot change its email in silence.
  if (notice) void sendMail({ to: notice.to, ...emailChangedNoticeEmail({ name: notice.name, newEmail: notice.newEmail }) });
  return result;
}
