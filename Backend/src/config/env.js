import 'dotenv/config';
import crypto from 'node:crypto';
/* Secrets that must never protect a real server: the demo default, the .env.example placeholder, and obvious words.
   Outside production a weak or missing JWT_SECRET is replaced by a random one for this run (see below), so a public default
   can never be used to forge a login on a server somebody forgot to configure. */
const KNOWN_WEAK_SECRETS = ['development-only-change-me', 'change-this-to-a-long-random-secret', 'paste-the-output', 'secret', 'changeme', 'password'];
const providedSecret = (process.env.JWT_SECRET || '').trim();
const secretIsWeak = providedSecret.length < 32 || KNOWN_WEAK_SECRETS.some((w) => providedSecret.toLowerCase().includes(w));
const jwtSecret = secretIsWeak && process.env.NODE_ENV !== 'production' ? crypto.randomBytes(48).toString('hex') : providedSecret;
if (secretIsWeak && process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test')
  console.warn('[security] JWT_SECRET is missing, too short or a placeholder: using a random secret for this run, so everyone is signed out whenever the API restarts. Run `npm run setup:env` (or `npm run gen:secret`) to set a permanent one.');
const asInt = (value, fallback) => { const n = Number.parseInt(value, 10); return Number.isFinite(n) ? n : fallback; };
export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: asInt(process.env.PORT, 4000),
  jwtSecret,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/civicconnect',
  dbPoolMax: asInt(process.env.DB_POOL_MAX, 10),
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  appUrl: (process.env.APP_URL || (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',')[0]).trim().replace(/\/$/, ''),
  resetTokenMinutes: asInt(process.env.RESET_TOKEN_MINUTES, 30),
  smtp: Object.freeze({
    host: (process.env.SMTP_HOST || '').trim(),
    port: asInt(process.env.SMTP_PORT, 587),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    user: process.env.SMTP_USER || '',
    // Google shows app passwords as four groups of four letters; spaces are not part of the password.
    pass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''),
    from: process.env.MAIL_FROM || 'CivicConnect <no-reply@civicconnect.local>',
  }),
  maxUploadMb: asInt(process.env.MAX_UPLOAD_MB, 25),
  // Authority accounts can see citizens' contact details, so sign-up needs this code.
  // Empty in production = authority self-registration is switched off.
  authorityInviteCode: process.env.AUTHORITY_INVITE_CODE || '',
  // Public address of THIS API. Links in verification emails point here.
  apiUrl: (process.env.API_URL || `http://localhost:${asInt(process.env.PORT, 4000)}`).trim().replace(/\/$/, ''),
  // How many reverse proxies sit in front of the API. 0 (default) = none, so X-Forwarded-For is ignored and cannot be
  // used to dodge the rate limits. Set to 1 only when exactly one proxy (nginx, a load balancer) really is in front.
  trustProxy: asInt(process.env.TRUST_PROXY, 0),
  // New complaints per citizen per rolling 24 hours, and the folder-size cap for uploaded photos.
  maxComplaintsPerDay: asInt(process.env.MAX_COMPLAINTS_PER_DAY, 10),
  // When true, a complaint whose GPS pin is far outside the chosen area is refused. Off by default so testing from anywhere works.
  geofenceComplaints: String(process.env.GEOFENCE_COMPLAINTS || '').toLowerCase() === 'true',
  // Reverse geocoding (coordinates -> street address). Any Nominatim-compatible endpoint works.
  geocoderUrl: (process.env.GEOCODER_URL || 'https://nominatim.openstreetmap.org/reverse').trim(),
  // Place search (village / town name -> coordinates). Defaults to the /search endpoint next to GEOCODER_URL.
  geocoderSearchUrl: (process.env.GEOCODER_SEARCH_URL || '').trim(),
  // An unassigned complaint older than this many hours triggers a reminder to the area's authorities (repeated at the same interval).
  unassignedAlertHours: asInt(process.env.UNASSIGNED_ALERT_HOURS, 4),
  reminderCheckMinutes: asInt(process.env.REMINDER_CHECK_MINUTES, 15),
  // Emergency complaints, and complaints the AI rates as severe, are chased much sooner than ordinary ones.
  emergencyAlertHours: Number.parseFloat(process.env.EMERGENCY_ALERT_HOURS) || 1,
  severeAlertHours: Number.parseFloat(process.env.SEVERE_ALERT_HOURS) || 2,
  // Hours an emergency task may sit unstarted with the worker before the worker (and the authority) are reminded.
  // Anti-misuse: emergencies one citizen may flag per rolling 24 h, and how many dismissed flags (last 30 days) switch the flag off for them.
  maxEmergenciesPerDay: asInt(process.env.MAX_EMERGENCIES_PER_DAY, 3),
  maxDismissedEmergencies: asInt(process.env.MAX_DISMISSED_EMERGENCIES, 3),
  // Officers handle citizens' personal data, so their sessions are shorter than a citizen's or worker's.
  jwtExpiresAuthority: process.env.JWT_EXPIRES_AUTHORITY || '8h',
  jwtExpiresDefault: process.env.JWT_EXPIRES || '7d',
  // Optional contact address sent to the geocoder (its usage policy asks for one), and the most lookups allowed to queue up.
  geocoderEmail: (process.env.GEOCODER_EMAIL || '').trim(),
  emergencyWorkerHours: Number.parseFloat(process.env.EMERGENCY_WORKER_HOURS) || 2,
  // true = a photo the AI check could not confirm is also refused (use with your own trained model). Default: it is accepted but flagged for the authority.
  strictPhotoCheck: String(process.env.PHOTO_CHECK_STRICT || '').toLowerCase() === 'true',
  maxUploadDirMb: asInt(process.env.MAX_UPLOAD_DIR_MB, 2048),
  // Password guessing against ONE account (from many addresses at once): after this many wrong passwords the account's sign-in is paused.
  loginMaxFailures: Math.max(3, asInt(process.env.LOGIN_MAX_FAILURES, 10)),
  loginLockMinutes: Math.max(1, asInt(process.env.LOGIN_LOCK_MINUTES, 15)),
  // Development convenience: while SMTP is not configured, tell the person (in the forgot-password message)
  // to look in the API terminal. Ignored in production.
  devMailHint: String(process.env.DEV_MAIL_HINT || '').toLowerCase() === 'true',
});

/* ---- Refuse to start in production with settings that are known to be unsafe. ------------------------------------ */
const KNOWN_DEV_INVITE_CODES = ['CIVIC-AUTH-2026'];
const isLocalAddress = (url) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(url);
if (env.nodeEnv === 'production') {
  const problems = [];
  if (secretIsWeak)
    problems.push('JWT_SECRET must be a random string of at least 32 characters, not a placeholder (run: npm run gen:secret).');
  if (KNOWN_DEV_INVITE_CODES.includes(env.authorityInviteCode))
    problems.push('AUTHORITY_INVITE_CODE is still the public demo code. Leave it empty and use `npm run authority:invite` instead.');
  if (/\/\/postgres:postgres@/.test(env.databaseUrl))
    problems.push('DATABASE_URL still uses the default postgres:postgres login. Create a strong database password.');
  if (!env.smtp.host)
    problems.push('SMTP_HOST is empty, so password-reset emails cannot be sent.');
  if (env.corsOrigin.split(',').some((o) => o.trim() === '*'))
    problems.push('CORS_ORIGIN must list your real site address(es), not *.');
  for (const [name, value] of [['APP_URL', env.appUrl], ['API_URL', env.apiUrl]])
    if (!/^https:\/\//i.test(value) && !isLocalAddress(value))
      problems.push(`${name} must start with https:// (the links in emails carry one-time tokens).`);
  if (problems.length) throw new Error(`Unsafe production configuration:\n - ${problems.join('\n - ')}`);
}
