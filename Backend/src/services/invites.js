import crypto from 'node:crypto';
import { query } from '../db/database.js';
import { env } from '../config/env.js';
import { id } from '../utils/id.js';
import { AppError } from '../utils/http.js';

/* Authority invites.
   A DATABASE invite (made with `npm run authority:invite`) is the safe way: it is for ONE area, works ONCE, and expires.
   The old shared code from AUTHORITY_INVITE_CODE still works for local development, but the server refuses to start
   in production with the public demo code, and production is expected to leave it empty. */

const hashCode = (code) => crypto.createHash('sha256').update(String(code).trim()).digest('hex');
const sameSecret = (a, b) => {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
};

/** Creates a code like CIVIC-7K3Q-9XMD-2PFA. The plain code is returned once; only its hash is stored. */
export async function createInvite({ area, days = 7, note = null }) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const group = () => Array.from({ length: 4 }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
  const code = `CIVIC-${group()}-${group()}-${group()}`;
  const expiresAt = new Date(Date.now() + days * 86400000);
  await query('INSERT INTO authority_invites (id,code_hash,area,note,expires_at) VALUES ($1,$2,$3,$4,$5)', [id('inv_'), hashCode(code), area, note, expiresAt]);
  return { code, area, expiresAt };
}

/**
 * Checks the code typed on the sign-up form.
 * Returns { area, consume(userId) }: `area` is set for a database invite (the account MUST get that area).
 */
export async function checkInvite(code, requestedArea) {
  const typed = String(code || '').trim();
  const { rows } = typed
    ? await query('SELECT * FROM authority_invites WHERE code_hash=$1', [hashCode(typed)])
    : { rows: [] };
  const invite = rows[0];
  if (invite) {
    if (invite.used_at) throw new AppError(403, 'That invite code has already been used. Ask your administrator for a new one.');
    if (new Date(invite.expires_at) < new Date()) throw new AppError(403, 'That invite code has expired. Ask your administrator for a new one.');
    if (invite.area !== requestedArea) throw new AppError(403, `That invite code is only valid for ${invite.area}.`);
    return {
      area: invite.area,
      consume: async (userId) => {
        const { rowCount } = await query('UPDATE authority_invites SET used_at=NOW(), used_by=$1 WHERE id=$2 AND used_at IS NULL', [userId, invite.id]);
        return rowCount > 0;
      },
    };
  }
  // Legacy shared code (development).
  if (env.authorityInviteCode && typed && sameSecret(typed, env.authorityInviteCode))
    return { area: null, consume: async () => true };
  if (!env.authorityInviteCode && !typed)
    throw new AppError(403, 'Authority accounts are created by an administrator. Self sign-up needs an invite code.');
  throw new AppError(403, 'That invite code is not valid. Ask your administrator for the current code.');
}
