import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/http.js';

/* Per-ACCOUNT protection against password guessing.
   The per-address limiter in routes/auth.js stops one computer; this stops many computers (a botnet, or one person
   rotating addresses) all guessing the password of the SAME account.
   - Counts wrong passwords per typed identifier (email / username / employee ID / mobile) inside a 15-minute window.
   - After `LOGIN_MAX_FAILURES` (default 10) the sign-in for that identifier pauses for `LOGIN_LOCK_MINUTES` (default 15).
   - It counts identifiers that do not exist too, so the lock never reveals whether an account exists.
   - A correct sign-in clears the counter. "Forgot password" is never blocked, so the real owner can always recover.
   Kept in memory: it resets when the API restarts and is per server process (fine for one server; use a shared store for several). */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ENTRIES = 20_000;
const entries = new Map(); // key -> { fails, first, lockedUntil }

/** Same normalisation the sign-in query uses, so "98765 43210" and "+919876543210" count as one account. */
const keyFor = (identifier) => {
  const typed = String(identifier || '').trim().toLowerCase();
  const digits = /[a-z@]/i.test(typed) ? '' : typed.replace(/\D/g, '').slice(-10);
  return crypto.createHash('sha256').update(digits ? `m:${digits}` : `i:${typed}`).digest('hex').slice(0, 32);
};

const prune = () => {
  const t = Date.now();
  for (const [key, e] of entries) if ((e.lockedUntil && e.lockedUntil <= t) || (!e.lockedUntil && t - e.first > WINDOW_MS)) entries.delete(key);
};
setInterval(prune, 10 * 60 * 1000).unref();

export const resetLoginThrottle = () => entries.clear();

/** Throws 429 while the account is paused. Call before checking the password. */
export function assertLoginAllowed(identifier) {
  const key = keyFor(identifier);
  const e = entries.get(key);
  if (!e?.lockedUntil) return;
  const left = e.lockedUntil - Date.now();
  if (left <= 0) { entries.delete(key); return; }
  throw new AppError(429, `Too many wrong passwords for this account. Please wait ${Math.max(1, Math.ceil(left / 60000))} minute(s), or use "Forgot password".`);
}

/** Call after a wrong password. */
export function recordLoginFailure(identifier) {
  const key = keyFor(identifier);
  const t = Date.now();
  let e = entries.get(key);
  if (!e || (!e.lockedUntil && t - e.first > WINDOW_MS)) e = { fails: 0, first: t, lockedUntil: 0 };
  e.fails += 1;
  if (e.fails >= env.loginMaxFailures) e.lockedUntil = t + env.loginLockMinutes * 60 * 1000;
  entries.delete(key); // re-insert so the oldest entry is always the first one
  entries.set(key, e);
  if (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value);
}

/** Call after a correct password. */
export function clearLoginFailures(identifier) {
  entries.delete(keyFor(identifier));
}
