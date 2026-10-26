// Integration tests: talk to a RUNNING API (and its database) over HTTP.
//   1. npm run db:up && npm run db:init     (from the project root)
//   2. npm run dev:api                      (in another terminal)
//   3. npm --prefix Backend test
// If the API is not reachable, these tests are skipped instead of failing.
// Use API_URL=http://host:port to point at a different server.
import 'dotenv/config'; // picks up AUTHORITY_INVITE_CODE from Backend/.env (setup:env now makes it random)
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const API = (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '');
let up = false;

/** A valid 64x64 PNG made of random 8x8 blocks. Every call looks different, so the "same photo twice" check does not trip. */
function randomPng() {
  const size = 64;
  const raw = Buffer.alloc((size + 1) * size);
  const blocks = Array.from({ length: 64 }, () => crypto.randomInt(0, 256));
  for (let y = 0; y < size; y++) {
    raw[y * (size + 1)] = 0;
    for (let x = 0; x < size; x++) raw[y * (size + 1) + 1 + x] = blocks[(y >> 3) * 8 + (x >> 3)];
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

async function call(method, path, { token, body, form, photo = true } = {}) {
  let payload;
  if (form) {
    payload = new FormData();
    for (const [k, v] of Object.entries({ aiVerdict: 'match', ...form })) payload.append(k, String(v));
    if (photo) payload.append('photo', new Blob([randomPng()], { type: 'image/png' }), 'issue.png');
  }
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: form ? payload : body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* empty body */ }
  return { status: res.status, json };
}

const login = async (identifier, password) => {
  const r = await call('POST', '/api/auth/login', { body: { identifier, password } });
  assert.equal(r.status, 200, `login failed for ${identifier}`);
  return r.json.data.token;
};

before(async () => {
  try { up = (await fetch(`${API}/api/health`)).ok; } catch { up = false; }
  if (!up) console.log(`# API not reachable at ${API}: integration tests are skipped.`);
});

const it = (name, fn) => test(name, async (t) => { if (!up) return t.skip('API not running'); await fn(t); });

it('health check and area list respond', async () => {
  assert.equal((await call('GET', '/api/health')).json.data.status, 'healthy');
  const areas = (await call('GET', '/api/areas')).json.data.areas;
  assert.ok(areas.includes('Visakhapatnam'));
});

it('protected routes reject requests without a token', async () => {
  assert.equal((await call('GET', '/api/auth/me')).status, 401);
  assert.equal((await call('GET', '/api/citizen/complaints')).status, 401);
  assert.equal((await call('GET', '/api/authority/complaints')).status, 401);
});

it('sign-up rejects a short password', async () => {
  const r = await call('POST', '/api/auth/register/citizen', { body: { name: 'Test User', email: `short${Date.now()}@example.com`, password: 'short' } });
  assert.equal(r.status, 400);
});

it('a wrong password is rejected', async () => {
  const r = await call('POST', '/api/auth/login', { body: { identifier: 'citizen@civicconnect.com', password: 'not-the-password' } });
  assert.equal(r.status, 401);
});

it('new citizen can sign up, sign in and read their profile', async () => {
  const email = `tester${Date.now()}@example.com`;
  const reg = await call('POST', '/api/auth/register/citizen', { body: { name: 'Test Citizen', email, password: 'Trusty#Bridge42' } });
  assert.equal(reg.status, 201);
  assert.ok(reg.json.data.token);
  const token = await login(email, 'Trusty#Bridge42');
  const me = await call('GET', '/api/auth/me', { token });
  assert.equal(me.status, 200);
  assert.equal(me.json.data.user.email, email);
});

it('roles are enforced: a citizen cannot use authority or worker routes', async () => {
  const token = await login('citizen@civicconnect.com', 'citizen@1234');
  assert.equal((await call('GET', '/api/authority/complaints', { token })).status, 403);
  assert.equal((await call('GET', '/api/worker/tasks', { token })).status, 403);
});

it('complaint flow: citizen files one, only the same-area authority can see it', async () => {
  const citizen = await login('citizen@civicconnect.com', 'citizen@1234');
  const description = `Integration test pothole ${Date.now()}`;
  const created = await call('POST', '/api/citizen/complaints', { token: citizen, form: { category: 'road', description, location: `Test Road ${Date.now()}`, area: 'Visakhapatnam' } });
  assert.equal(created.status, 201);
  const id = created.json.data.id;

  // The citizen sees it, including through the search filter.
  const mine = await call('GET', `/api/citizen/complaints?q=${encodeURIComponent(description)}`, { token: citizen });
  assert.ok(mine.json.data.some((c) => c.id === id));

  // Authority of the same area (AUTH-001, Visakhapatnam) can open it.
  const sameArea = await login('AUTH-001', 'authority@1234');
  assert.equal((await call('GET', `/api/authority/complaints/${id}`, { token: sameArea })).status, 200);

  // Authority of another area (AUTH-002, Amaravathi) gets 404, and it is not in their list.
  const otherArea = await login('AUTH-002', 'authority@1234');
  assert.equal((await call('GET', `/api/authority/complaints/${id}`, { token: otherArea })).status, 404);
  const theirList = await call('GET', '/api/authority/complaints', { token: otherArea });
  assert.equal(theirList.json.data.some((c) => c.id === id), false);
});

it('emergency complaint: flagged High, shown with the AI severity, kept High on assignment and listed as needing attention', async () => {
  const citizen = await login('citizen@civicconnect.com', 'citizen@1234');
  const created = await call('POST', '/api/citizen/complaints', {
    token: citizen,
    form: { category: 'road', description: `Open manhole on the main road ${unique()}`, location: `Emergency Road ${unique()}`, area: 'Visakhapatnam', aiSeverity: 83, isEmergency: 'true', emergencyReason: 'Open manhole, a child could fall in' },
  });
  assert.equal(created.status, 201);
  const c = created.json.data;
  assert.equal(c.isEmergency, true);
  assert.equal(c.aiSeverity, 83);
  assert.equal(c.severityBand, 'critical');
  assert.equal(c.priority, 'High');
  assert.equal(c.suggestedPriority, 'High');

  const authority = await login('AUTH-001', 'authority@1234');
  const attention = await call('GET', '/api/authority/attention', { token: authority });
  assert.equal(attention.status, 200);
  const item = attention.json.data.items.find((i) => i.id === c.id);
  assert.ok(item, 'an open emergency is always on the attention list');
  assert.equal(item.kind, 'emergency');

  // The officer tries to lower the priority: an emergency stays High and is due the same day.
  const workers = (await call('GET', `/api/authority/complaints/${c.id}/workers`, { token: authority })).json.data;
  assert.ok(workers.length > 0, 'the demo data has a roads worker in Visakhapatnam');
  const assigned = await call('POST', `/api/authority/complaints/${c.id}/assign`, { token: authority, body: { workerId: workers[0].id, priority: 'Low' } });
  assert.equal(assigned.status, 200);
  assert.equal(assigned.json.data.priority, 'High');
  assert.ok(new Date(assigned.json.data.expectedBy) - Date.now() < 7 * 3600000, 'due within hours, not days');
});

it('an officer can dismiss a false emergency: it becomes a normal complaint, the citizen is told, and the priority is editable again', async () => {
  const citizen = await login('citizen@civicconnect.com', 'citizen@1234');
  const created = await call('POST', '/api/citizen/complaints', {
    token: citizen,
    form: { category: 'garbage', description: `Not really urgent ${unique()}`, location: `Dismiss Road ${unique()}`, area: 'Visakhapatnam', aiSeverity: 30, isEmergency: 'true', emergencyReason: 'smells bad' },
  });
  if (created.status === 429) return; // the demo citizen already used today's emergency allowance on earlier runs
  assert.equal(created.status, 201);
  const c = created.json.data;
  const authority = await login('AUTH-001', 'authority@1234');
  const short = await call('POST', `/api/authority/complaints/${c.id}/emergency/dismiss`, { token: authority, body: { reason: 'no' } });
  assert.equal(short.status, 400, 'a real reason is required');
  const ok = await call('POST', `/api/authority/complaints/${c.id}/emergency/dismiss`, { token: authority, body: { reason: 'Rubbish, but no danger to anyone' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.data.isEmergency, false);
  assert.equal(ok.json.data.emergencyDismissed, true);
  assert.equal(ok.json.data.priority, 'Low', 'back to what the AI suggests for 30%');
  const again = await call('POST', `/api/authority/complaints/${c.id}/emergency/dismiss`, { token: authority, body: { reason: 'second attempt here' } });
  assert.equal(again.status, 409);
  const alerts = (await call('GET', '/api/authority/attention', { token: authority })).json.data.items;
  assert.ok(!alerts.some((i) => i.id === c.id && i.kind === 'emergency'));
});

it('a severity outside 0-100 is refused', async () => {
  const citizen = await login('citizen@civicconnect.com', 'citizen@1234');
  const r = await call('POST', '/api/citizen/complaints', { token: citizen, form: { category: 'road', description: `Bad severity test ${unique()}`, location: `Severity Road ${unique()}`, area: 'Visakhapatnam', aiSeverity: 250 } });
  assert.equal(r.status, 400);
});

it('list filters work and search treats % and _ literally', async () => {
  const citizen = await login('citizen@civicconnect.com', 'citizen@1234');
  const resolved = await call('GET', '/api/citizen/complaints?status=resolved', { token: citizen });
  assert.equal(resolved.status, 200);
  assert.ok(resolved.json.data.every((c) => c.status === 'resolved'));
  const wildcard = await call('GET', `/api/citizen/complaints?q=${encodeURIComponent('%')}`, { token: citizen });
  assert.equal(wildcard.status, 200);
  assert.ok(wildcard.json.data.every((c) => `${c.id} ${c.description} ${c.location}`.includes('%')), 'a lone % must not match everything');
});

/* ---------------------------------------------------------------- security */

const INVITE = process.env.AUTHORITY_INVITE_CODE || '';
const unique = () => `${Date.now()}${Math.floor(Math.random() * 1e4)}`;
const authorityBody = (extra = {}) => ({ name: 'New Officer', employeeId: `T-${unique()}`, email: `off${unique()}@example.com`, phone: '+919800000000', area: 'Visakhapatnam', password: 'Trusty#Bridge42', ...extra });

it('authority sign-up needs the invite code', async () => {
  assert.equal((await call('POST', '/api/auth/register/authority', { body: authorityBody() })).status, 403, 'no code');
  assert.equal((await call('POST', '/api/auth/register/authority', { body: authorityBody({ inviteCode: 'wrong-code' }) })).status, 403, 'wrong code');
  if (!INVITE) return; // no shared dev code configured (the safe default): only invite codes from `npm run authority:invite` work
  const ok = await call('POST', '/api/auth/register/authority', { body: authorityBody({ inviteCode: INVITE }) });
  assert.equal(ok.status, 201, 'right code');
});

it("a citizen cannot open another citizen's complaint", async () => {
  const demo = await login('citizen@civicconnect.com', 'citizen@1234');
  const created = await call('POST', '/api/citizen/complaints', { token: demo, form: { category: 'garbage', description: `Privacy test complaint ${unique()}`, location: `Test Lane ${unique()}`, area: 'Visakhapatnam' } });
  const other = await call('POST', '/api/auth/register/citizen', { body: { name: 'Other Citizen', email: `other${unique()}@example.com`, password: 'Trusty#Bridge42' } });
  const peek = await call('GET', `/api/citizen/complaints/${created.json.data.id}`, { token: other.json.data.token });
  assert.equal(peek.status, 404);
  assert.equal((await call('POST', `/api/citizen/complaints/${created.json.data.id}/reopen`, { token: other.json.data.token, body: { reason: 'not mine to reopen' } })).status, 404);
});

it('changing the password signs the old session out', async () => {
  const email = `rev${unique()}@example.com`;
  const reg = await call('POST', '/api/auth/register/citizen', { body: { name: 'Session Test', email, password: 'Trusty#Bridge42' } });
  const oldToken = reg.json.data.token;
  const changed = await call('POST', '/api/auth/change-password', { token: oldToken, body: { currentPassword: 'Trusty#Bridge42', newPassword: 'Sturdy#Gate2026' } });
  assert.equal(changed.status, 200);
  assert.equal((await call('GET', '/api/auth/me', { token: oldToken })).status, 401, 'old token must stop working');
  assert.equal((await call('GET', '/api/auth/me', { token: changed.json.data.token })).status, 200, 'the fresh token works');
});

/* ------------------------------------------------- reject / complete / reopen */

// A real 1x1 PNG: uploads are now decoded and re-encoded, so a file with only a PNG header is (correctly) refused.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
async function uploadPhoto(path, token, caption) {
  const form = new FormData();
  form.append('photo', new Blob([PNG], { type: 'image/png' }), 'x.png');
  if (caption) form.append('caption', caption);
  const res = await fetch(`${API}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  return { status: res.status, json: await res.json().catch(() => null) };
}
const newComplaint = async (citizen, label) =>
  (await call('POST', '/api/citizen/complaints', { token: citizen, form: { category: 'road', description: `${label} ${unique()}`, location: `Lifecycle Road ${unique()}`, area: 'Visakhapatnam' } })).json.data.id;

it('reject: needs a reason, only the same area, and the citizen sees why', async () => {
  const citizen = await login('citizen@civicconnect.com', 'citizen@1234');
  const authority = await login('AUTH-001', 'authority@1234');
  const otherArea = await login('AUTH-002', 'authority@1234');
  const id = await newComplaint(citizen, 'Duplicate report');

  assert.equal((await call('POST', `/api/authority/complaints/${id}/reject`, { token: authority, body: {} })).status, 400, 'reason required');
  assert.equal((await call('POST', `/api/authority/complaints/${id}/reject`, { token: otherArea, body: { reason: 'Not our area really' } })).status, 404);
  const rejected = await call('POST', `/api/authority/complaints/${id}/reject`, { token: authority, body: { reason: 'Duplicate of an existing report' } });
  assert.equal(rejected.status, 200);
  assert.equal(rejected.json.data.status, 'rejected');

  const seen = await call('GET', `/api/citizen/complaints/${id}`, { token: citizen });
  assert.equal(seen.json.data.rejectionReason, 'Duplicate of an existing report');
  assert.equal((await call('POST', `/api/authority/complaints/${id}/reject`, { token: authority, body: { reason: 'Rejecting twice should fail' } })).status, 409);
});

it('full lifecycle: assign, work, resolve, rate once, reopen, and the new round starts clean', async () => {
  const citizen = await login('citizen@civicconnect.com', 'citizen@1234');
  const authority = await login('AUTH-001', 'authority@1234');
  const worker = await login('wk-104', 'worker@1234');
  const id = await newComplaint(citizen, 'Lifecycle pothole');

  // Can't rate or reopen before it is resolved.
  assert.equal((await call('POST', `/api/citizen/complaints/${id}/feedback`, { token: citizen, body: { rating: 5 } })).status, 409);
  assert.equal((await call('POST', `/api/citizen/complaints/${id}/reopen`, { token: citizen, body: { reason: 'Too early to reopen' } })).status, 409);

  assert.equal((await call('POST', `/api/authority/complaints/${id}/assign`, { token: authority, body: { workerId: 'WK-104', priority: 'High' } })).status, 200);
  assert.equal((await call('POST', `/api/worker/tasks/${id}/start`, { token: worker })).status, 200);
  assert.equal((await call('POST', `/api/worker/tasks/${id}/complete`, { token: worker })).status, 409, 'completion photo is required');
  assert.equal((await uploadPhoto(`/api/worker/tasks/${id}/completion-photo`, worker)).status, 200);
  const done = await call('POST', `/api/worker/tasks/${id}/complete`, { token: worker });
  assert.equal(done.json.data.status, 'resolved');

  // Rating: validated, and only once.
  assert.equal((await call('POST', `/api/citizen/complaints/${id}/feedback`, { token: citizen, body: { rating: 9 } })).status, 400);
  const rated = await call('POST', `/api/citizen/complaints/${id}/feedback`, { token: citizen, body: { rating: 2, comment: 'Patch already cracking' } });
  assert.equal(rated.json.data.rating, 2);
  assert.equal((await call('POST', `/api/citizen/complaints/${id}/feedback`, { token: citizen, body: { rating: 5 } })).status, 409, 'already rated');

  // Reopen: back to review, worker cleared, old completion photo not shown, a second completion needs a NEW photo.
  const reopened = await call('POST', `/api/citizen/complaints/${id}/reopen`, { token: citizen, body: { reason: 'The pothole is back after one day' } });
  assert.equal(reopened.status, 200);
  assert.equal(reopened.json.data.status, 'review');
  assert.equal(reopened.json.data.worker, null);
  assert.equal(reopened.json.data.workPhotos.completion, null);
  assert.equal(reopened.json.data.rating, null);

  await call('POST', `/api/authority/complaints/${id}/assign`, { token: authority, body: { workerId: 'WK-104' } });
  await call('POST', `/api/worker/tasks/${id}/start`, { token: worker });
  assert.equal((await call('POST', `/api/worker/tasks/${id}/complete`, { token: worker })).status, 409, 'the old photo must not count for the new round');
});

/* ------------------------------------------------------- photos and logout */

it('photos need a signed link, and logging out ends the session', async () => {
  const citizen = await login('citizen@civicconnect.com', 'citizen@1234');
  const authority = await login('AUTH-001', 'authority@1234');
  const worker = await login('wk-105', 'worker@1234');
  const id = await newComplaint(citizen, 'Photo privacy');
  await call('POST', `/api/authority/complaints/${id}/assign`, { token: authority, body: { workerId: 'WK-105' } });
  await call('POST', `/api/worker/tasks/${id}/start`, { token: worker });
  await uploadPhoto(`/api/worker/tasks/${id}/completion-photo`, worker);

  const url = (await call('GET', `/api/citizen/complaints/${id}`, { token: citizen })).json.data.workPhotos.completion.url;
  assert.match(url, /^\/uploads\/.+\?exp=\d+&sig=[a-f0-9]+$/, 'the API returns a signed link');
  assert.equal((await fetch(`${API}${url}`)).status, 200, 'the signed link works without logging in');
  assert.equal((await fetch(`${API}${url.split('?')[0]}`)).status, 403, 'the bare path is refused');
  assert.equal((await fetch(`${API}${url.replace(/sig=./, 'sig=0')}`)).status, 403, 'a tampered signature is refused');

  // Logout revokes just this token.
  const again = await login('citizen@civicconnect.com', 'citizen@1234');
  assert.equal((await call('POST', '/api/auth/logout', { token: again })).status, 200);
  assert.equal((await call('GET', '/api/auth/me', { token: again })).status, 401, 'the logged-out token is dead');
  assert.equal((await call('GET', '/api/auth/me', { token: citizen })).status, 200, 'other sessions are untouched');
});

/* ------------------------------------------------------- hardening (v7) */

const workerBody = (extra = {}) => ({ name: 'New Worker', username: `w${unique()}`.slice(0, 20), email: `wk${unique()}@example.com`, phone: '+919800000001', area: 'Visakhapatnam', password: 'Trusty#Bridge42', ...extra });

it('worker sign-up needs approval from an authority of the SAME area', async () => {
  const body = workerBody();
  const reg = await call('POST', '/api/auth/register/worker', { body });
  assert.equal(reg.status, 202);
  assert.equal(reg.json.data.pendingApproval, true);
  assert.equal(reg.json.data.token, undefined, 'no session before approval');

  const early = await call('POST', '/api/auth/login', { body: { identifier: body.username, password: body.password } });
  assert.equal(early.status, 403, 'cannot sign in while pending');

  const authority = await login('AUTH-001', 'authority@1234'); // Visakhapatnam
  const otherArea = await login('AUTH-002', 'authority@1234'); // Amaravathi
  const pending = (await call('GET', '/api/authority/workers/pending', { token: authority })).json.data.workers;
  const mine = pending.find((w) => w.username === body.username.toLowerCase() || w.username === body.username);
  assert.ok(mine, 'the request shows up for the area authority');
  assert.equal((await call('GET', '/api/authority/workers/pending', { token: otherArea })).json.data.workers.some((w) => w.id === mine.id), false, 'not for another area');
  assert.equal((await call('POST', `/api/authority/workers/${mine.id}/approve`, { token: otherArea })).status, 404, 'another area cannot approve');

  // Not assignable while pending.
  const citizen = await login('citizen@civicconnect.com', 'citizen@1234');
  const cid = await newComplaint(citizen, 'Pending worker assignment');
  assert.equal((await call('POST', `/api/authority/complaints/${cid}/assign`, { token: authority, body: { workerId: mine.workerId } })).status, 404);

  assert.equal((await call('POST', `/api/authority/workers/${mine.id}/approve`, { token: authority })).status, 200);
  assert.equal((await call('POST', '/api/auth/login', { body: { identifier: body.username, password: body.password } })).status, 200, 'can sign in after approval');
});

it('a declined worker request cannot sign in and frees the username', async () => {
  const body = workerBody();
  await call('POST', '/api/auth/register/worker', { body });
  const authority = await login('AUTH-001', 'authority@1234');
  const pending = (await call('GET', '/api/authority/workers/pending', { token: authority })).json.data.workers;
  const mine = pending.find((w) => w.email === body.email);
  assert.equal((await call('POST', `/api/authority/workers/${mine.id}/reject`, { token: authority })).status, 200);
  assert.equal((await call('POST', '/api/auth/login', { body: { identifier: body.username, password: body.password } })).status, 401);
  assert.equal((await call('POST', '/api/auth/register/worker', { body })).status, 202, 'the same details can be used again');
});

it('e-mail cannot be changed through the profile, and needs the password', async () => {
  const email = `mail${unique()}@example.com`;
  const reg = await call('POST', '/api/auth/register/citizen', { body: { name: 'Mail Test', email, password: 'Trusty#Bridge42' } });
  const token = reg.json.data.token;
  assert.equal((await call('PATCH', '/api/auth/profile', { token, body: { email: `evil${unique()}@example.com` } })).status, 400, 'direct change refused');
  const same = await call('PATCH', '/api/auth/profile', { token, body: { name: 'Mail Test Renamed', email } });
  assert.equal(same.status, 200, 'sending the unchanged e-mail along with other fields is fine');

  const newEmail = `new${unique()}@example.com`;
  assert.equal((await call('POST', '/api/auth/change-email', { token, body: { newEmail, currentPassword: 'wrong-password' } })).status, 400);
  assert.equal((await call('POST', '/api/auth/change-email', { token, body: { newEmail, currentPassword: 'Trusty#Bridge42' } })).status, 200);
  assert.equal((await call('GET', '/api/auth/me', { token })).json.data.user.email, email, 'nothing changes until the link is opened');

  const bad = await fetch(`${API}/api/auth/confirm-email?token=${'0'.repeat(64)}`);
  assert.equal(bad.status, 400, 'a made-up link is refused');
});

it('authority sign-up now requires an e-mail address', async () => {
  const { email, ...noEmail } = authorityBody({ inviteCode: INVITE });
  assert.equal((await call('POST', '/api/auth/register/authority', { body: noEmail })).status, 400);
});

it('the same complaint cannot be filed twice while the first is open', async () => {
  const citizen = await login('citizen@civicconnect.com', 'citizen@1234');
  const body = { category: 'water', description: `Leaking pipe near the market ${unique()}`, location: `Dup Street ${unique()}`, area: 'Visakhapatnam' };
  assert.equal((await call('POST', '/api/citizen/complaints', { token: citizen, body })).status, 201);
  assert.equal((await call('POST', '/api/citizen/complaints', { token: citizen, body })).status, 409);
});

it('photos are re-encoded: real images are accepted, fake ones are refused', async () => {
  const worker = await login('wk-106', 'worker@1234');
  const authority = await login('AUTH-001', 'authority@1234');
  const citizen = await login('citizen@civicconnect.com', 'citizen@1234');
  const id = await newComplaint(citizen, 'Photo decode');
  await call('POST', `/api/authority/complaints/${id}/assign`, { token: authority, body: { workerId: 'WK-106' } });
  await call('POST', `/api/worker/tasks/${id}/start`, { token: worker });
  const form = new FormData();
  form.append('photo', new Blob([PNG.subarray(0, 8)], { type: 'image/png' }), 'broken.png'); // correct header, nothing after it
  const res = await fetch(`${API}/api/worker/tasks/${id}/progress-photo`, { method: 'POST', headers: { Authorization: `Bearer ${worker}` }, body: form });
  assert.equal(res.status, 415);
  assert.equal((await uploadPhoto(`/api/worker/tasks/${id}/progress-photo`, worker)).status, 200);
});

it('forgot-password answers the same for known and unknown accounts', async () => {
  const known = await call('POST', '/api/auth/forgot-password', { body: { role: 'citizen', identifier: 'citizen@civicconnect.com' } });
  const unknown = await call('POST', '/api/auth/forgot-password', { body: { role: 'citizen', identifier: `nobody${unique()}@example.com` } });
  assert.equal(known.status, 200);
  assert.equal(unknown.status, 200);
  assert.equal(known.json.data.message, unknown.json.data.message);
});

it('the address lookup needs a signed-in user and validates its input', async () => {
  assert.equal((await call('GET', '/api/geo/reverse?lat=16.3&lng=80.4')).status, 401);
  const citizen = await login('citizen@civicconnect.com', 'citizen@1234');
  assert.equal((await call('GET', '/api/geo/reverse?lat=999&lng=80.4', { token: citizen })).status, 400);
  assert.equal((await call('GET', '/api/geo/reverse?lat=abc&lng=80.4', { token: citizen })).status, 400);
});

it('complaints need a photo, and a photo the AI check rejected is refused', async () => {
  const citizen = await login('citizen@civicconnect.com', 'citizen@1234');
  const base = { category: 'road', description: `Photo rule test ${Date.now()}`, location: `Photo Road ${Date.now()}`, area: 'Visakhapatnam' };
  const noPhoto = await call('POST', '/api/citizen/complaints', { token: citizen, form: base, photo: false });
  assert.equal(noPhoto.status, 400, 'a report without a photo is refused');
  const wrong = await call('POST', '/api/citizen/complaints', { token: citizen, form: { ...base, aiVerdict: 'mismatch' } });
  assert.equal(wrong.status, 422, 'a photo that does not show the chosen problem is refused');
  const half = await call('POST', '/api/citizen/complaints', { token: citizen, form: { ...base, lat: 17.7 } });
  assert.equal(half.status, 400, 'latitude without longitude is refused');
  const outside = await call('POST', '/api/citizen/complaints', { token: citizen, form: { ...base, lat: 28.6, lng: 77.2 } });
  assert.equal(outside.status, 400, 'a pin outside the service region is refused');
});

it('the dashboard reports how many complaints still have no worker', async () => {
  const authority = await login('AUTH-001', 'authority@1234');
  const dash = await call('GET', '/api/authority/dashboard', { token: authority });
  assert.equal(dash.status, 200);
  assert.equal(typeof dash.json.data.unassigned, 'number');
});

it('the Ongole demo citizen, authority and worker can sign in and see only Ongole data', async () => {
  // Needs `npm run seed`. The citizen can sign in with the email or the 10-digit mobile number.
  const citizen = await login('citizen.ongole@civicconnect.com', 'citizen@1234');
  await login('9876543211', 'citizen@1234');
  const authority = await login('AUTH-003', 'authority@1234');
  const worker = await login('wk-301', 'worker@1234');

  const mine = (await call('GET', '/api/citizen/complaints', { token: citizen })).json.data;
  assert.ok(mine.length >= 6, 'the Ongole citizen has demo complaints');
  assert.ok(mine.every((c) => c.area === 'Ongole'));

  const list = (await call('GET', '/api/authority/complaints', { token: authority })).json.data;
  assert.ok(list.length >= 6 && list.every((c) => c.area === 'Ongole'), 'the Ongole authority sees only Ongole complaints');
  const workers = (await call('GET', '/api/authority/workers', { token: authority })).json.data;
  assert.ok(workers.length >= 8 && workers.every((w) => w.area === 'Ongole' || w.ward === 'Ongole'), 'only Ongole workers are listed');

  const tasks = (await call('GET', '/api/worker/tasks', { token: worker })).json.data;
  assert.ok(tasks.some((t) => t.id === 'CC-2026-1291'), 'WK-301 has the Trunk Road task');

  // Another area's authority cannot open an Ongole complaint.
  const vizag = await login('AUTH-001', 'authority@1234');
  assert.equal((await call('GET', '/api/authority/complaints/CC-2026-1291', { token: vizag })).status, 404);
});

it('API answers are never cacheable, and workers do not receive the citizen\'s contact details', async () => {
  const res = await fetch(`${API}/api/areas`);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const citizen = await login('citizen@civicconnect.com', 'citizen@1234');
  const authority = await login('AUTH-001', 'authority@1234');
  const worker = await login('wk-104', 'worker@1234');
  const id = await newComplaint(citizen, 'Worker privacy check on this complaint');
  const workers = (await call('GET', `/api/authority/complaints/${id}/workers`, { token: authority })).json.data;
  const wk = workers.find((w) => w.workerId === 'WK-104');
  if (!wk) return; // the demo road worker is not available
  const assigned = await call('POST', `/api/authority/complaints/${id}/assign`, { token: authority, body: { workerId: wk.workerId, priority: 'Low' } });
  if (assigned.status !== 200) return;
  const seen = await call('GET', `/api/worker/tasks/${id}`, { token: worker });
  assert.equal(seen.status, 200);
  assert.equal(seen.json.data.citizen?.email, undefined);
  assert.equal(seen.json.data.citizen?.mobile, undefined);
  assert.equal(seen.json.data.citizenId, undefined);
  const forAuthority = await call('GET', `/api/authority/complaints/${id}`, { token: authority });
  assert.ok(forAuthority.json.data.citizen.email, 'the authority still sees the contact details');
});
