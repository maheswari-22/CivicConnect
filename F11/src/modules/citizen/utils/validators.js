const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MOBILE_RE = /^[6-9]\d{9}$/;

export function isValidEmail(value) {
  return EMAIL_RE.test(value.trim());
}

/** Accepts a 10-digit Indian mobile number, with optional +91, spaces or dashes. */
export function isValidMobile(value) {
  const digitsOnly = value.trim().replace(/^\+?91[\s-]?/, '').replace(/[\s-]/g, '');
  return MOBILE_RE.test(digitsOnly);
}

/** Used on Login, where a single field accepts either a mobile number or an email. */
export function isValidIdentifier(value) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return trimmed.includes('@') ? isValidEmail(trimmed) : isValidMobile(trimmed);
}
