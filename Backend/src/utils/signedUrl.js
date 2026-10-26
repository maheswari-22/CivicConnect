import crypto from 'node:crypto';
import path from 'node:path';
import { env } from '../config/env.js';

/* Photos are not public. The API hands out links that carry an expiry time and a signature,
   so only people who were allowed to see a complaint ever get a working link, and it stops working later. */
/* The expiry is rounded to a fixed window, so the same photo gets the SAME link every time the API is
   called within that window. That lets the browser cache the photo instead of downloading it again on
   every refresh. A link stays valid for 12 to 24 hours. */
const WINDOW_SECONDS = 12 * 60 * 60;

// A separate key derived from the secret, so a photo link can never be mistaken for anything signed with the login secret.
const uploadKey = crypto.createHmac('sha256', env.jwtSecret).update('civicconnect/upload-url-key/v1').digest();
const signature = (name, exp) => crypto.createHmac('sha256', uploadKey).update(`upload:${name}:${exp}`).digest('hex');

/** "/uploads/abc.jpg" -> "/uploads/abc.jpg?exp=...&sig=...". Anything else is returned unchanged. */
export function signUploadUrl(url) {
  if (typeof url !== 'string' || !url.startsWith('/uploads/')) return url;
  const name = path.basename(url);
  const exp = (Math.floor(Date.now() / 1000 / WINDOW_SECONDS) + 2) * WINDOW_SECONDS;
  return `/uploads/${name}?exp=${exp}&sig=${signature(name, exp)}`;
}

export function hasValidUploadSignature(name, exp, sig) {
  const expiry = Number(exp);
  if (!Number.isFinite(expiry) || expiry < Date.now() / 1000 || typeof sig !== 'string') return false;
  const expected = Buffer.from(signature(name, expiry));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}
