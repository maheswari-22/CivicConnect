const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MOBILE_RE = /^[6-9]\d{9}$/;

export const isValidEmail = (v) => EMAIL_RE.test(String(v).trim());

/** 10-digit Indian mobile number, optional +91 prefix, spaces or dashes. */
export const isValidMobile = (v) =>
  MOBILE_RE.test(
    String(v).trim().replace(/^\+?91[\s-]?/, "").replace(/[\s-]/g, "")
  );

/** Returns an error message for one field, or "" when it is valid. */
export function validateField(field, value) {
  const v = String(value ?? "").trim();
  if (!v) return field.type === "select" ? `Select ${field.label.toLowerCase()}` : `Enter ${field.label.toLowerCase()}`;
  if (field.kind === "email" && !isValidEmail(v)) return "Enter a valid email address";
  if (field.kind === "mobile" && !isValidMobile(v)) return "Enter a valid 10-digit mobile number";
  if (field.kind === "identifier") {
    if (v.includes("@") ? !isValidEmail(v) : !isValidMobile(v)) return "Enter a valid mobile number or email";
  }
  if (field.kind === "name" && (v.length < 2 || v.length > 60 || !/^[\p{L}][\p{L}\p{M}\s.'-]*$/u.test(v))) return "Enter a valid name (letters only, 2-60 characters)";
  if (field.kind === "username") return usernameError(v);
  if (field.kind === "employeeId" && !/^[A-Za-z0-9][A-Za-z0-9/_-]{2,19}$/.test(v)) return "Employee ID: 3-20 letters, numbers, - _ /";
  return "";
}

/* ------------------------------------------------------------------ username
   4-20 characters, starts with a letter, then letters / digits / "." "_" "-".
   Mirrors Backend/src/utils/validation.js. */
export const USERNAME_MIN = 4;
export const USERNAME_MAX = 20;
const USERNAME_RE = /^[A-Za-z][A-Za-z0-9._-]*$/;

export function usernameError(value) {
  const v = String(value ?? "").trim();
  if (!v) return "Enter a username";
  if (v.length < USERNAME_MIN) return `Username must be at least ${USERNAME_MIN} characters`;
  if (v.length > USERNAME_MAX) return `Username can be at most ${USERNAME_MAX} characters`;
  if (!USERNAME_RE.test(v)) return "Start with a letter; use only letters, numbers, . _ -";
  if (/[._-]{2}/.test(v) || /[._-]$/.test(v)) return "No repeated or trailing . _ - characters";
  return "";
}

/* ------------------------------------------------------------------ password
   High-security rule, mirrored on the server:
   10-64 characters, upper + lower case, a number, a symbol, no spaces,
   not a common password and not built from the user's own details. */
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 64;

const COMMON = [
  "password", "passw0rd", "qwerty", "letmein", "welcome", "admin", "iloveyou", "abc123",
  "123456", "111111", "000000", "monkey", "dragon", "civicconnect", "worker", "citizen", "authority",
];

export const PASSWORD_RULES = [
  { id: "length", label: `${PASSWORD_MIN}-${PASSWORD_MAX} characters`, test: (p) => p.length >= PASSWORD_MIN && p.length <= PASSWORD_MAX },
  { id: "upper", label: "An uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "A lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "digit", label: "A number", test: (p) => /\d/.test(p) },
  { id: "symbol", label: "A symbol (e.g. @ # $ !)", test: (p) => /[^A-Za-z0-9\s]/.test(p) },
  { id: "space", label: "No spaces", test: (p) => !/\s/.test(p) },
];

/** Personal strings (name, username, email name, mobile) a password must not contain. */
function personalBits(personal = []) {
  const bits = [];
  personal.forEach((raw) => {
    const v = String(raw ?? "").toLowerCase().trim();
    if (!v) return;
    const local = v.includes("@") ? v.split("@")[0] : v;
    [local, ...local.split(/[^a-z0-9]+/)].forEach((b) => b.length >= 4 && bits.push(b));
    const digits = v.replace(/\D/g, "");
    if (digits.length >= 6) bits.push(digits.slice(-6));
  });
  return bits;
}

/** Returns "" when the password is strong enough, otherwise the first problem found. */
export function passwordError(password, personal = []) {
  const p = String(password ?? "");
  if (!p) return "Enter a password";
  const failed = PASSWORD_RULES.find((r) => !r.test(p));
  if (failed) return `Password needs: ${failed.label.toLowerCase()}`;
  const lower = p.toLowerCase();
  if (COMMON.some((c) => lower.includes(c))) return "That password is too easy to guess";
  if (/(.)\1{3,}/.test(p)) return "Avoid repeating the same character many times";
  if (personalBits(personal).some((b) => lower.includes(b))) return "Don't use your name, username, email or mobile in the password";
  return "";
}

/** 0-4 strength score for the meter (only meaningful once the rules pass). */
export function passwordScore(password) {
  const p = String(password ?? "");
  const passed = PASSWORD_RULES.filter((r) => r.test(p)).length;
  let score = Math.round((passed / PASSWORD_RULES.length) * 3);
  if (passed === PASSWORD_RULES.length && p.length >= 14) score = 4;
  return Math.min(4, score);
}
