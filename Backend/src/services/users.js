import { query } from '../db/database.js';
import { id, now } from '../utils/id.js';
import { hashPassword, verifyPassword } from '../utils/auth.js';
import { AppError } from '../utils/http.js';
import { env } from '../config/env.js';
import { releaseWorkerTasks } from './handover.js';
import { sendMail, workerApprovedEmail } from '../mail/mailer.js';

const publicUser = (u) =>
  u && {
    id: u.id,
    role: u.role,
    name: u.name,
    email: u.email,
    mobile: u.mobile,
    username: u.username,
    employeeId: u.employee_id,
    phone: u.phone,
    area: u.area,
    workerId: u.worker_id,
    department: u.department,
    emailVerified: Boolean(u.email_verified),
    approved: u.approved !== false,
  };

const emptyToNull = (v) => (v === undefined || v === '' ? null : v);

export async function findUserById(userId) {
  const { rows } = await query('SELECT * FROM users WHERE id=$1', [userId]);
  return rows[0] || null;
}

export async function publicUserById(userId) {
  return publicUser(await findUserById(userId));
}

export async function findWorkerById(workerId) {
  const { rows } = await query("SELECT * FROM users WHERE role='worker' AND worker_id=$1 AND active=TRUE AND approved=TRUE", [workerId]);
  return rows[0] || null;
}

export async function listWorkers({ area } = {}) {
  const { rows } =
    area === undefined
      ? await query("SELECT * FROM users WHERE role='worker' AND active=TRUE AND approved=TRUE ORDER BY name")
      : await query("SELECT * FROM users WHERE role='worker' AND active=TRUE AND approved=TRUE AND area=$1 ORDER BY name", [area]);
  return rows.map(publicUser);
}

export async function registerUser({ role, name, email, mobile, username, employeeId, password, phone, area, trusted = false }) {
  const userId = id('usr_');
  const timestamp = now();
  const hash = await hashPassword(password);

  // Worker codes come from a database sequence, so two sign-ups can never get the same code.
  let workerId = null;
  if (role === 'worker') {
    const { rows } = await query("SELECT nextval('worker_code_seq')::int AS n");
    workerId = `CW-${rows[0].n}`;
  }
  const department = role === 'worker' ? 'Municipal Services' : null;
  // Workers can do nothing until an authority of their area approves them. `trusted` is for accounts an administrator creates.
  const approved = role !== 'worker' || trusted;
  const emailVerified = trusted && Boolean(email);

  try {
    // An e-mail address that nobody confirmed for 48 hours cannot lock out its real owner: the new sign-up takes it over.
    // (Within those 48 hours the holder still has time to confirm it, so a stranger cannot steal it from them.)
    if (email) await query("UPDATE users SET email=NULL WHERE email=$1 AND email_verified=FALSE AND created_at < NOW() - INTERVAL '48 hours'", [email]);
    await query(
      `INSERT INTO users (id,role,name,email,mobile,username,employee_id,password_hash,phone,area,worker_id,department,approved,email_verified,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15)`,
      [userId, role, name, emptyToNull(email), emptyToNull(mobile), emptyToNull(username), emptyToNull(employeeId), hash, emptyToNull(phone), emptyToNull(area), workerId, department, approved, emailVerified, timestamp],
    );
  } catch (e) {
    if (e.code === '23505') throw new AppError(409, 'An account with those details already exists.');
    throw e;
  }
  return findUserById(userId);
}

/**
 * Signs in by email, username, employee ID or mobile number.
 * If the same text matches accounts in different portals, the one in the portal being used wins.
 */
let dummyHash = null;
export async function authenticate(identifier, password, role = null) {
  const normalized = identifier.trim().toLowerCase();
  const digits = /[a-z@]/i.test(identifier) ? '' : identifier.replace(/\D/g, '').slice(-10);
  const { rows } = await query(
    `SELECT * FROM users
     WHERE lower(coalesce(email,''))=$1 OR lower(coalesce(username,''))=$1 OR lower(coalesce(employee_id,''))=$1
        OR ($2<>'' AND right(regexp_replace(coalesce(mobile,''),'\\D','','g'),10)=$2)
     ORDER BY (role = $3::text) DESC NULLS LAST
     LIMIT 5`,
    [normalized, digits, role],
  );
  // No such account: still spend the same time hashing, so response time does not reveal which identifiers exist.
  if (!rows.length) {
    dummyHash ||= await hashPassword('timing-equaliser-not-a-real-password');
    await verifyPassword(password, dummyHash);
  }
  for (const user of rows) {
    if (user.active && (await verifyPassword(password, user.password_hash))) {
      if (user.approved === false)
        throw new AppError(403, 'Your worker account is waiting for approval from the authority of your area. You will be able to sign in once it is approved.');
      return user;
    }
  }
  throw new AppError(401, 'Invalid username, employee ID, mobile/email, or password.');
}

/** Changes the password and signs every other session out. Returns the updated user (new token_version). */
export async function changePassword(userId, currentPassword, newPassword) {
  const user = await findUserById(userId);
  if (!user || !(await verifyPassword(currentPassword, user.password_hash))) throw new AppError(400, 'Current password is incorrect.');
  const { rows } = await query(
    'UPDATE users SET password_hash=$1, token_version=token_version+1, updated_at=$2 WHERE id=$3 RETURNING *',
    [await hashPassword(newPassword), now(), userId],
  );
  return rows[0];
}

export async function updateProfile(userId, values) {
  const current = await findUserById(userId);
  // An authority's / worker's area decides which complaints they see or get assigned, so it is not self-editable.
  if (current?.role === 'authority' || current?.role === 'worker') {
    values = { ...values };
    delete values.area;
  }
  // E-mail is NOT editable here: it needs the current password and a confirmation link (see services/emailTokens.js).
  if (values.email !== undefined && current && String(values.email).toLowerCase() !== String(current.email || '').toLowerCase())
    throw new AppError(400, 'To change your email address, confirm your password and the link we send to the new address.');
  const allowed = ['name', 'phone', 'area'];
  const fields = Object.entries(values).filter(([k, v]) => allowed.includes(k) && v !== undefined);
  if (!fields.length) throw new AppError(400, 'No profile fields supplied.');

  const sets = fields.map(([k], i) => `${k}=$${i + 1}`);
  const params = [...fields.map(([, v]) => v), now(), userId];
  try {
    await query(`UPDATE users SET ${sets.join(', ')}, updated_at=$${params.length - 1} WHERE id=$${params.length}`, params);
  } catch (e) {
    if (e.code === '23505') throw new AppError(409, 'That email is already in use.');
    throw e;
  }
  return findUserById(userId);
}

export async function deactivateUser(userId, password) {
  const user = await findUserById(userId);
  if (!user || !(await verifyPassword(password, user.password_hash))) throw new AppError(400, 'Incorrect password. Please try again.');
  if (user.role === 'worker') await releaseWorkerTasks(user.id); // their open tasks go back to the authority instead of being stranded
  // The identifiers are released, so the same email / mobile / username / employee ID can be used to sign up again.
  await query(
    'UPDATE users SET active=FALSE, email=NULL, mobile=NULL, username=NULL, employee_id=NULL, token_version=token_version+1, updated_at=$1 WHERE id=$2',
    [now(), userId],
  );
}

/* --------------------------------------------------------------- worker approval */
export async function listPendingWorkers(area) {
  const { rows } = await query(
    "SELECT * FROM users WHERE role='worker' AND active=TRUE AND approved=FALSE AND area=$1 ORDER BY created_at",
    [area ?? null],
  );
  return rows.map((u) => ({ ...publicUser(u), requestedAt: u.created_at }));
}

async function pendingWorkerInArea(authorityArea, workerUserId) {
  const { rows } = await query("SELECT * FROM users WHERE id=$1 AND role='worker' AND active=TRUE AND approved=FALSE", [workerUserId]);
  const worker = rows[0];
  if (!worker || !authorityArea || worker.area !== authorityArea) throw new AppError(404, 'Worker request not found.');
  return worker;
}

export async function approveWorker(authority, workerUserId) {
  const worker = await pendingWorkerInArea(authority.area, workerUserId);
  await query('UPDATE users SET approved=TRUE, updated_at=$1 WHERE id=$2', [now(), worker.id]);
  if (worker.email)
    void sendMail({ to: worker.email, ...workerApprovedEmail({ name: worker.name, link: `${env.appUrl}/worker/` }) });
  return publicUserById(worker.id);
}

/** Declines a worker request: the account is deactivated and its details are released. */
export async function rejectWorker(authority, workerUserId) {
  const worker = await pendingWorkerInArea(authority.area, workerUserId);
  await query(
    'UPDATE users SET active=FALSE, email=NULL, mobile=NULL, username=NULL, employee_id=NULL, token_version=token_version+1, updated_at=$1 WHERE id=$2',
    [now(), worker.id],
  );
}
