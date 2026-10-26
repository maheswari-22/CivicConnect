import { Router } from 'express';
import { query } from '../db/database.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/http.js';
import { notifyRole } from '../services/notifications.js';
import { checkInvite } from '../services/invites.js';
import { sendVerificationEmail, requestEmailChange, confirmEmailToken } from '../services/emailTokens.js';
import { mailConfigured } from '../mail/mailer.js';
import { forgotPasswordSchema, resetPasswordSchema, deleteAccountSchema, citizenRegisterSchema, workerRegisterSchema, authorityRegisterSchema, loginSchema, changePasswordSchema, profileSchema, changeEmailSchema } from '../utils/validation.js';
import { registerUser, authenticate, publicUserById, changePassword, updateProfile, deactivateUser } from '../services/users.js';
import { signToken } from '../utils/auth.js';
import { asyncHandler, ok } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';
import { requestPasswordReset, resetPasswordWithToken } from '../services/passwordReset.js';
import { assertLoginAllowed, recordLoginFailure, clearLoginFailures } from '../services/loginThrottle.js';

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 8, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'Too many reset attempts. Please wait a few minutes and try again.' }
});

// Stricter than the general /api/auth limit: slows down password guessing and mass sign-ups.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'Too many failed sign-in attempts. Please wait 15 minutes and try again.' }
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'Too many accounts created from this network. Please try again later.' }
});
const router = Router();

router.post('/register/citizen', registerLimiter, asyncHandler(async (req, res) => {
  const input = citizenRegisterSchema.parse(req.body);
  const user = await registerUser({ role: 'citizen', ...input });
  void sendVerificationEmail(user.id);
  ok(res, { user: await publicUserById(user.id), token: signToken(user) }, 201);
}));
router.post('/register/worker', registerLimiter, asyncHandler(async (req, res) => {
  const input = workerRegisterSchema.parse(req.body);
  const user = await registerUser({ role: 'worker', ...input });
  void sendVerificationEmail(user.id);
  // No login yet: an authority of the worker's area has to approve the account first.
  await notifyRole('authority', { area: user.area, title: 'New worker request', body: `${user.name} (${user.username}) asked to join as a worker in ${user.area}. Open Workers to approve or decline.` });
  ok(res, { pendingApproval: true, message: 'Your account was created and is waiting for approval from the authority of your area. You can sign in once it is approved.' }, 202);
}));
router.post('/register/authority', registerLimiter, asyncHandler(async (req, res) => {
  const { inviteCode, ...input } = authorityRegisterSchema.parse(req.body);
  const invite = await checkInvite(inviteCode, input.area);
  const user = await registerUser({ role: 'authority', ...input, area: invite.area || input.area });
  if (!(await invite.consume(user.id))) {
    await query('DELETE FROM users WHERE id=$1', [user.id]); // somebody used the same single-use invite a moment earlier
    throw new AppError(403, 'That invite code has already been used. Ask your administrator for a new one.');
  }
  void sendVerificationEmail(user.id);
  ok(res, { user: await publicUserById(user.id), token: signToken(user) }, 201);
}));
router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const { identifier, password, role } = loginSchema.parse(req.body);
  assertLoginAllowed(identifier); // many addresses guessing the same account are stopped here (the router limiter only sees one address)
  let user;
  try {
    user = await authenticate(identifier, password, role);
  } catch (error) {
    if (error?.status === 401) recordLoginFailure(identifier); // only a wrong password counts, not "waiting for approval"
    throw error;
  }
  clearLoginFailures(identifier);
  ok(res, { user: await publicUserById(user.id), token: signToken(user) });
}));
router.post('/forgot-password', resetLimiter, asyncHandler(async (req, res) => {
  const { role, ...details } = forgotPasswordSchema.parse(req.body);
  // The work happens after the answer is sent, so response time never reveals whether the account exists.
  void requestPasswordReset(role, details).catch((error) => console.error('[reset] failed:', error.message));
  const devHint = env.nodeEnv !== 'production' && env.devMailHint && !mailConfigured();
  ok(res, {
    message: devHint
      ? 'Development mode: email sending is not set up, so no email is sent. If the account matches, the reset link is printed in the backend (API) terminal.'
      : 'If an account matches those details and has an email address, a password reset link has been sent. Check your inbox (and spam folder).',
  });
}));
router.post('/reset-password', resetLimiter, asyncHandler(async (req, res) => {
  const { role, token, newPassword } = resetPasswordSchema.parse(req.body);
  await resetPasswordWithToken(role, token, newPassword);
  ok(res, { message: 'Your password has been changed. You can now sign in.' });
}));
router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  const { jti, exp } = req.tokenPayload;
  if (jti)
    await query('INSERT INTO revoked_tokens (jti,expires_at) VALUES ($1,$2) ON CONFLICT DO NOTHING', [jti, new Date(exp * 1000)]);
  await query('DELETE FROM revoked_tokens WHERE expires_at < NOW()'); // tidy up tokens that have expired anyway
  ok(res, { message: 'Signed out.' });
}));
router.get('/me', requireAuth, asyncHandler(async (req, res) => ok(res, { user: await publicUserById(req.user.id) })));
router.patch('/profile', requireAuth, asyncHandler(async (req, res) => ok(res, { user: await publicUserById((await updateProfile(req.user.id, profileSchema.parse(req.body))).id) })));
router.post('/change-password', requireAuth, asyncHandler(async (req, res) => {
  const x = changePasswordSchema.parse(req.body);
  const updated = await changePassword(req.user.id, x.currentPassword, x.newPassword);
  ok(res, { message: 'Password changed successfully. Other devices have been signed out.', token: signToken(updated) });
}));
router.post('/change-email', requireAuth, asyncHandler(async (req, res) => {
  const { newEmail, currentPassword } = changeEmailSchema.parse(req.body);
  await requestEmailChange(req.user.id, newEmail, currentPassword);
  ok(res, { message: `We sent a confirmation link to ${newEmail}. Your email changes only after you open it.` });
}));
// Opened from the link in an email, in the browser, so it answers with a small web page instead of JSON.
const page = (title, text, good) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font-family:Arial,sans-serif;background:#f5f7fc;color:#1b2240;display:grid;place-items:center;min-height:100vh;margin:0}main{background:#fff;padding:32px;border-radius:14px;max-width:420px;box-shadow:0 8px 30px rgba(3,4,94,.12);text-align:center}h1{color:${good ? '#03045e' : '#b42318'};font-size:22px}a{display:inline-block;margin-top:18px;background:#03045e;color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:bold}</style></head>
<body><main><h1>${title}</h1><p>${text}</p><a href="${env.appUrl}">Open CivicConnect</a></main></body></html>`;
router.get('/confirm-email', asyncHandler(async (req, res) => {
  const result = await confirmEmailToken(typeof req.query.token === 'string' ? req.query.token : '');
  res.status(result.ok ? 200 : 400).type('html').send(page(result.ok ? 'Email confirmed' : 'Link not valid', result.message, result.ok));
}));
router.delete('/account', requireAuth, asyncHandler(async (req, res) => {
  const { password } = deleteAccountSchema.parse(req.body || {});
  await deactivateUser(req.user.id, password);
  ok(res, { message: 'Account deactivated.' });
}));

export default router;
