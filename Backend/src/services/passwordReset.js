import crypto from 'node:crypto';
import { query, withTransaction } from '../db/database.js';
import { env } from '../config/env.js';
import { id, now } from '../utils/id.js';
import { hashPassword } from '../utils/auth.js';
import { AppError } from '../utils/http.js';
import { sendMail, passwordResetEmail, passwordChangedEmail } from '../mail/mailer.js';

const PORTAL = {
  citizen: 'Citizen', authority: 'Authority', worker: 'Worker'
};

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/** Finds the active account of this role that matches what the person typed on the "forgot password" form. */
export async function findAccountForReset(role, { identifier, employeeId, email }) {
  const clean = (v) => String(v || '').trim().toLowerCase();
  let rows;
  if (role === 'authority') {
    // Employee ID and registered email must both match.
    if (!clean(employeeId) || !clean(email))
      return null;
    ({ rows } = await query("SELECT * FROM users WHERE role='authority' AND active=TRUE AND lower(employee_id)=$1 AND lower(coalesce(email,''))=$2 LIMIT 1", [clean(employeeId), clean(email)]));
  }
  else if (role === 'worker') {
    const v = clean(identifier);
    if (!v)
      return null;
    ({ rows } = await query("SELECT * FROM users WHERE role='worker' AND active=TRUE AND (lower(coalesce(username,''))=$1 OR lower(coalesce(email,''))=$1) LIMIT 1", [v]));
  }
  else {
    const v = clean(identifier);
    if (!v)
      return null;
    const digits = /[a-z@]/i.test(v) ? '' : v.replace(/\D/g, '').slice(-10);
    ({ rows } = await query("SELECT * FROM users WHERE role='citizen' AND active=TRUE AND (lower(coalesce(email,''))=$1 OR ($2<>'' AND right(regexp_replace(coalesce(mobile,''),'\\D','','g'),10)=$2)) LIMIT 1", [v, digits]));
  }
  return rows[0] || null;
}

/** Creates a one-time reset link and emails it. Always resolves quietly: the caller must not reveal whether the account exists. */
export async function requestPasswordReset(role, input) {
  const user = await findAccountForReset(role, input);
  if (!user)
    return;
  if (!user.email) {
    console.warn(`[reset] ${user.id} has no email address on file, so no reset link was sent.`);
    return;
  }
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + env.resetTokenMinutes * 60000);
  await withTransaction(async (client) => {
    await client.query('UPDATE password_resets SET used_at=$1 WHERE user_id=$2 AND used_at IS NULL', [now(), user.id]); // older links stop working
    await client.query('INSERT INTO password_resets (id,user_id,token_hash,expires_at,created_at) VALUES ($1,$2,$3,$4,$5)', [id('rst_'), user.id, hashToken(token), expiresAt, now()]);
  });
  const link = `${env.appUrl}/${role}/?reset=${token}`;
  // Not awaited: the response time then does not reveal whether the account exists.
  void sendMail({
    to: user.email, ...passwordResetEmail({
      name: user.name, portal: PORTAL[role], link, minutes: env.resetTokenMinutes
    })
  });
}

/** Sets a new password from a reset link token. Throws AppError(400) when the link is wrong, used or expired. */
export async function resetPasswordWithToken(role, token, newPassword) {
  const bad = () => new AppError(400, 'This reset link is invalid or has expired. Please request a new one.');
  if (!/^[a-f0-9]{64}$/.test(token || ''))
    throw bad();
  const hash = await hashPassword(newPassword);
  const userId = await withTransaction(async (client) => {
    const { rows } = await client.query(`SELECT r.id, r.user_id, u.role, u.active FROM password_resets r JOIN users u ON u.id=r.user_id
       WHERE r.token_hash=$1 AND r.used_at IS NULL AND r.expires_at>$2 FOR UPDATE OF r`, [hashToken(token), now()]);
    const row = rows[0];
    if (!row || !row.active || row.role !== role)
      throw bad(); // a citizen link cannot reset a worker account, etc.
    await client.query('UPDATE users SET password_hash=$1, token_version=token_version+1, updated_at=$2 WHERE id=$3', [hash, now(), row.user_id]);
    await client.query('UPDATE password_resets SET used_at=$1 WHERE user_id=$2 AND used_at IS NULL', [now(), row.user_id]);
    return row.user_id;
  });
  // Tell the owner it happened (so a stranger resetting their password cannot do it unnoticed).
  const { rows: owner } = await query('SELECT name, email FROM users WHERE id=$1', [userId]);
  if (owner[0]?.email) {
    void sendMail({
      to: owner[0].email,
      ...passwordChangedEmail({
        name: owner[0].name, portal: PORTAL[role], link: `${env.appUrl}/${role}/`,
        when: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }) + ' (IST)',
      }),
    });
  }
}
