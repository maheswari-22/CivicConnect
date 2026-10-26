import crypto from 'node:crypto';
import { query, withTransaction } from '../db/database.js';
import { AppError } from '../utils/http.js';
import { id, now } from '../utils/id.js';
import { findWorkerById, findUserById } from './users.js';
import { AREAS, withinArea, locateArea } from '../config/areas.js';
import { env } from '../config/env.js';
import { notify, notifyRole } from './notifications.js';
import { discardUpload } from '../middleware/upload.js';
import { signUploadUrl } from '../utils/signedUrl.js';
import { hammingHex, SAME_PHOTO_MAX_BITS } from '../utils/photoHash.js';
import { priorityFromSeverity, severityBand, leadHoursFor, escalationPlan } from '../utils/severity.js';
import { sendMail, emergencyAlertEmail } from '../mail/mailer.js';

export const CATEGORIES = [
  { id: 'road', label: 'Road Damage' },
  { id: 'light', label: 'Street Light' },
  { id: 'garbage', label: 'Garbage' },
  { id: 'water', label: 'Water' },
  { id: 'other', label: 'Other' },
];

export const STATUSES = ['submitted', 'review', 'assigned', 'progress', 'resolved', 'rejected'];

export const PRIORITIES = ['Low', 'Medium', 'High'];
const MAX_LIST_ROWS = 500; // lists are capped so one busy area cannot return an unbounded response
const MAX_PROGRESS_PHOTOS = 4;
const MAX_REOPENS = 2;
const categoryDepartment = {
  road: 'Roads & Infrastructure',
  light: 'Electrical',
  garbage: 'Sanitation',
  water: 'Water Works',
  other: 'Municipal Services',
};

/* ------------------------------------------------------------------ reading */
const rowBase = `
  SELECT c.*, u.name citizen_name, u.email citizen_email, u.mobile citizen_mobile,
         w.name worker_name, w.worker_id worker_code, w.phone worker_phone, w.department worker_department,
         a.name authority_name
  FROM complaints c
  JOIN users u ON u.id = c.citizen_id
  LEFT JOIN users w ON w.id = c.worker_id
  LEFT JOIN users a ON a.id = c.assigned_by`;

async function photosFor(complaintIds) {
  if (!complaintIds.length)
    return new Map();
  const { rows } = await query(`SELECT id, complaint_id, type, url, caption, created_at AS "createdAt"
     FROM complaint_photos WHERE complaint_id = ANY($1::text[]) ORDER BY created_at ASC`, [complaintIds]);
  const byComplaint = new Map();
  for (const { complaint_id, ...photo } of rows) {
    if (!byComplaint.has(complaint_id))
      byComplaint.set(complaint_id, []);
    byComplaint.get(complaint_id).push(photo);
  }
  return byComplaint;
}

async function mapComplaints(rows) {
  const byComplaint = await photosFor(rows.map((r) => r.id));
  return rows.map((c) => mapComplaint(c, byComplaint.get(c.id) || []));
}

const signedPhoto = (p) => (p ? { ...p, url: signUploadUrl(p.url) } : p);

function mapComplaint(c, allPhotos) {
  // After a reopen, only the photos from the new round are shown; the earlier ones stay in the database as history.
  const photos = c.reopened_at ? allPhotos.filter((p) => new Date(p.createdAt) >= new Date(c.reopened_at)) : allPhotos;
  return {
    id: c.id,
    citizenId: c.citizen_id,
    category: c.category,
    description: c.description,
    location: c.location,
    area: c.area,
    place: c.place || null,
    aiVerdict: c.ai_verdict || 'unchecked',
    aiLabel: c.ai_label || null,
    // true when the photo check could not confirm the picture: the authority should look at the photo before sending a worker
    needsReview: (c.ai_verdict || 'unchecked') !== 'match',
    // The photo AI's 0-100 severity estimate, the priority it suggests, and the citizen's emergency flag.
    aiSeverity: c.ai_severity ?? null,
    severityBand: severityBand(c.ai_severity),
    suggestedPriority: priorityFromSeverity(c.ai_severity, c.is_emergency),
    isEmergency: Boolean(c.is_emergency),
    emergencyReason: c.emergency_reason || null,
    emergencyDismissed: Boolean(c.emergency_dismissed),
    emergencyDismissReason: c.emergency_dismiss_reason || null,
    escalationLevel: c.escalation_level || 0,
    coords: c.lat == null || c.lng == null ? null : { lat: c.lat, lng: c.lng },
    photo: signUploadUrl(c.photo_url),
    status: c.status,
    priority: c.priority,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    assignedOn: c.assigned_at,
    expectedBy: c.expected_by,
    completedOn: c.completed_at,
    note: c.note,
    rejectionReason: c.rejection_reason,
    reopenReason: c.reopen_reason,
    reopenCount: c.reopen_count,
    reopenedAt: c.reopened_at,
    rating: c.rating,
    feedback: c.feedback,
    feedbackAt: c.feedback_at,
    citizen: c.citizen_name ? {
      name: c.citizen_name, email: c.citizen_email, mobile: c.citizen_mobile
    } : null,
    worker: c.worker_id
      ? {
        id: c.worker_id, workerId: c.worker_code, name: c.worker_name, phone: c.worker_phone, department: c.worker_department
      } : null,
    assignedBy: c.authority_name || null,
    workPhotos: {
      progress: photos.filter((p) => p.type === 'progress').map(signedPhoto),
      completion: signedPhoto(photos.filter((p) => p.type === 'completion').at(-1)) || null,
    },
  };
}

/** A worker needs the job (what, where, photos), not the citizen's contact details or account id: those stay with the authority. */
export const redactForWorker = (c) => (c ? { ...c, citizenId: undefined, citizen: c.citizen ? { name: c.citizen.name } : null } : c);

export async function getComplaint(complaintId) {
  const { rows } = await query(`${rowBase} WHERE c.id=$1`, [complaintId]);
  return rows[0] ? (await mapComplaints(rows))[0] : null;
}

export async function requireComplaint(complaintId) {
  const c = await getComplaint(complaintId);
  if (!c)
    throw new AppError(404, 'Complaint not found.');
  return c;
}

/** Builds a WHERE clause for complaint lists, so filtering and search run inside PostgreSQL (not in JavaScript). */
function listQuery(baseConditions, baseParams, filters, searchColumns = []) {
  const conditions = [...baseConditions];
  const params = [...baseParams];
  const text = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
  const addEquals = (column, value) => {
    const v = text(value);
    if (!v)
      return;
    params.push(v);
    conditions.push(`${column}=$${params.length}`);
  };
  addEquals('c.status', filters.status);
  addEquals('c.priority', filters.priority);
  addEquals('c.category', filters.category);
  const search = text(filters.q);
  if (search && searchColumns.length) {
    params.push(`%${search.replace(/[\\%_]/g, '\\$&')}%`); // escape LIKE wildcards typed by the user
    conditions.push(`(${searchColumns.map((column) => `${column} ILIKE $${params.length}`).join(' OR ')})`);
  }
  return { where: conditions.join(' AND '), params };
}

export async function listCitizenComplaints(citizenId, { status, category, q } = {}) {
  const { where, params } = listQuery(['c.citizen_id=$1'], [citizenId], {
    status, category, q
  }, ['c.id', 'c.description', 'c.location']);
  const { rows } = await query(`${rowBase} WHERE ${where} ORDER BY c.created_at DESC LIMIT ${MAX_LIST_ROWS}`, params);
  return mapComplaints(rows);
}

export async function listAuthorityComplaints({ area, status, priority, category, q } = {}) {
  const { where, params } = listQuery(['c.area=$1'], [area ?? null], {
    status, priority, category, q
  }, ['c.id', 'c.description', 'c.location', 'u.name']);
  const { rows } = await query(`${rowBase} WHERE ${where} ORDER BY (c.is_emergency AND c.status NOT IN ('resolved','rejected')) DESC, c.created_at DESC LIMIT ${MAX_LIST_ROWS}`, params);
  return mapComplaints(rows);
}

export async function listWorkerTasks(workerUserId, { status } = {}) {
  const { where, params } = listQuery(['c.worker_id=$1'], [workerUserId], { status });
  const { rows } = await query(`${rowBase} WHERE ${where}
     ORDER BY (c.is_emergency AND c.status IN ('assigned','progress')) DESC,
              CASE c.status WHEN 'progress' THEN 1 WHEN 'assigned' THEN 2 WHEN 'resolved' THEN 3 ELSE 4 END, c.created_at DESC
     LIMIT ${MAX_LIST_ROWS}`, params);
  return mapComplaints(rows);
}

/* ------------------------------------------------------------------ citizen */
export async function createComplaint(citizenId, input, photo = null) {
  // 1. A photo is mandatory, and the on-device AI check must not have found a different subject.
  if (!photo?.url)
    throw new AppError(400, 'Add a photo of the problem. Reports without a photo are not accepted.');
  if (input.aiVerdict === 'mismatch')
    throw new AppError(422, 'The photo does not appear to show the problem you selected. Take a clear photo of the actual issue, or choose the matching category.');
  if (env.strictPhotoCheck && input.aiVerdict !== 'match')
    throw new AppError(422, 'We could not confirm that the photo shows the selected problem. Take a clearer, closer photo of the issue and try again.');
  const aiVerdict = input.aiVerdict === 'match' ? 'match' : input.aiVerdict === 'uncertain' ? 'uncertain' : 'unchecked';
  const aiSeverity = input.aiSeverity ?? null;
  let isEmergency = input.isEmergency === true;
  let emergencyReason = isEmergency ? (input.emergencyReason || null) : null;
  // An emergency starts as High so it sorts to the top at once; otherwise the authority sets the priority after reading the AI estimate.
  let startPriority = isEmergency ? 'High' : 'Medium';

  const citizen = await findUserById(citizenId);
  const area = input.area || citizen?.area;
  if (!AREAS.includes(area))
    throw new AppError(400, 'Select the area where the issue is located.');
  if (input.lat != null && input.lng != null) {
    // A pin outside the whole service region is never valid; a pin far from the chosen office only when the strict check is on.
    if (!locateArea(input.lat, input.lng))
      throw new AppError(400, 'The pinned location is outside the regions CivicConnect serves.');
    if (env.geofenceComplaints && !withinArea(area, input.lat, input.lng))
      throw new AppError(400, `The pinned location is not in ${area}. Move the pin or choose the correct area.`);
  }
  // 2. Stops spam: a daily cap per citizen, and no second open report of the same thing in the same place.
  const { rows: recent } = await query("SELECT COUNT(*)::int AS n FROM complaints WHERE citizen_id=$1 AND created_at > NOW() - INTERVAL '24 hours'", [citizenId]);
  if (recent[0].n >= env.maxComplaintsPerDay)
    throw new AppError(429, `You have reached the limit of ${env.maxComplaintsPerDay} new complaints per day. Please try again tomorrow.`);
  // Emergency flag misuse: a daily cap, and the flag stops being applied once several of this citizen's flags were found unjustified.
  let emergencyNote = '';
  if (isEmergency) {
    const { rows: em } = await query(
      `SELECT COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::int AS today,
              COUNT(*) FILTER (WHERE emergency_dismissed AND created_at > NOW() - INTERVAL '30 days')::int AS dismissed
       FROM complaints WHERE citizen_id=$1 AND (is_emergency OR emergency_dismissed)`, [citizenId]);
    if (em[0].today >= env.maxEmergenciesPerDay)
      throw new AppError(429, `You have already flagged ${em[0].today} emergencies today. Please submit this as a normal complaint, and call 112 if someone is in immediate danger.`);
    if (em[0].dismissed >= env.maxDismissedEmergencies) {
      isEmergency = false;
      emergencyReason = null;
      startPriority = 'Medium';
      emergencyNote = ' Your emergency flag was not applied because earlier flags were reviewed as not urgent. If someone is in immediate danger, call 112.';
    }
  }
  const { rows: same } = await query(
    "SELECT id FROM complaints WHERE citizen_id=$1 AND category=$2 AND area=$3 AND lower(location)=lower($4) AND status NOT IN ('resolved','rejected') AND created_at > NOW() - INTERVAL '14 days' LIMIT 1",
    [citizenId, input.category, area, input.location.trim()],
  );
  if (same.length)
    throw new AppError(409, `You already reported this: complaint ${same[0].id} is still open for the same issue and place.`);
  // 3. The same picture cannot be used twice (by anyone), which stops re-uploads of old or downloaded photos.
  if (photo.hash) {
    const { rows: used } = await query("SELECT id, photo_hash FROM complaints WHERE photo_hash IS NOT NULL AND created_at > NOW() - INTERVAL '180 days' ORDER BY created_at DESC LIMIT 5000");
    const clash = used.find((r) => hammingHex(r.photo_hash, photo.hash) <= SAME_PHOTO_MAX_BITS);
    if (clash)
      throw new AppError(409, 'This photo has already been used for another complaint. Please take a new photo of the problem as it is now.');
  }

  const complaintId = `CC-${new Date().getFullYear()}-${crypto.randomInt(100000, 1000000)}`;
  const timestamp = now();
  const { rows: officers } = await query("SELECT COUNT(*)::int AS n FROM users WHERE role='authority' AND active=TRUE AND area=$1", [area]);
  const hasOfficer = officers[0].n > 0;
  await withTransaction(async (client) => {
    await client.query(`INSERT INTO complaints (id,citizen_id,category,description,location,lat,lng,photo_url,status,priority,created_at,updated_at,area,place,photo_hash,ai_label,ai_verdict,ai_severity,is_emergency,emergency_reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'submitted',$15,$9,$9,$10,$11,$12,$13,$14,$16,$17,$18)`, [complaintId, citizenId, input.category, input.description, input.location, input.lat ?? null, input.lng ?? null, photo.url, timestamp, area, input.place || null, photo.hash || null, input.aiLabel || null, aiVerdict, startPriority, aiSeverity, isEmergency, emergencyReason]);
    await client.query('INSERT INTO notifications (id,user_id,complaint_id,title,body,created_at) VALUES ($1,$2,$3,$4,$5,$6)', [
      id('ntf_'),
      citizenId,
      complaintId,
      'Complaint submitted',
      hasOfficer
        ? `Your complaint ${complaintId} has been logged and sent to the ${area} authority.${isEmergency ? ' It is marked as an EMERGENCY and shown at the top of their list.' : ''}${emergencyNote}`
        : `Your complaint ${complaintId} has been logged. No officer is registered for ${area} yet, so it will be picked up as soon as one joins.`,
      timestamp,
    ]);
  });
  await notifyRole('authority', {
    area,
    complaintId,
    title: isEmergency ? 'EMERGENCY complaint received' : 'New complaint received',
    body: `${complaintId} (${input.category}) was reported at ${input.place ? `${input.place}, ` : ''}${input.location}, ${area}.${isEmergency ? ` The citizen marked it as an emergency${emergencyReason ? `: ${emergencyReason}` : ''}.` : ''}${aiSeverity != null ? ` AI photo severity: ${aiSeverity}%.` : ''}${aiVerdict === 'match' ? '' : ' The photo could not be verified automatically: please check it.'}`,
  });
  return getComplaint(complaintId);
}

/** A citizen can reopen a resolved complaint when the fix did not hold (at most twice). */
export async function reopenComplaint(citizenId, complaintId, { reason }) {
  const c = await requireComplaint(complaintId);
  if (c.citizenId !== citizenId)
    throw new AppError(404, 'Complaint not found.');
  if (c.status !== 'resolved')
    throw new AppError(409, 'Only resolved complaints can be reopened.');
  if (c.reopenCount >= MAX_REOPENS)
    throw new AppError(409, 'This complaint has already been reopened twice. Please file a new complaint instead.');
  const timestamp = now();
  const { rowCount } = await query(`UPDATE complaints
     SET status='review', priority='High', worker_id=NULL, completed_at=NULL,
         reopen_count=reopen_count+1, reopened_at=$1, reopen_reason=$2,
         rating=NULL, feedback=NULL, feedback_at=NULL, rejection_reason=NULL, updated_at=$1
     WHERE id=$3 AND status='resolved'`, [timestamp, reason, complaintId]);
  if (!rowCount)
    throw new AppError(409, 'Only resolved complaints can be reopened.');
  await notifyRole('authority', {
    area: c.area,
    complaintId,
    title: 'Complaint reopened',
    body: `${complaintId} was reopened by the citizen: "${reason}". It needs a worker again.`,
  });
  if (c.worker) {
    await notify({
      userId: c.worker.id, complaintId, title: 'Completed task reopened', body: `${complaintId} was reopened by the citizen.`
    });
  }
  await notify({
    userId: citizenId, complaintId, title: 'Complaint reopened', body: `${complaintId} is back with the ${c.area} authority.`
  });
  return getComplaint(complaintId);
}

/** A citizen rates the fix once per resolution. */
export async function rateComplaint(citizenId, complaintId, { rating, comment }) {
  const c = await requireComplaint(complaintId);
  if (c.citizenId !== citizenId)
    throw new AppError(404, 'Complaint not found.');
  if (c.status !== 'resolved')
    throw new AppError(409, 'You can rate a complaint once it has been resolved.');
  if (c.rating)
    throw new AppError(409, 'You have already rated this complaint.');
  const timestamp = now();
  await query('UPDATE complaints SET rating=$1, feedback=$2, feedback_at=$3, updated_at=$3 WHERE id=$4', [rating, comment || null, timestamp, complaintId]);
  await notifyRole('authority', {
    area: c.area,
    complaintId,
    title: `Citizen rated ${rating}/5`,
    body: `${complaintId}${c.worker ? ` (${c.worker.name})` : ''}: ${comment || 'no comment left'}.`,
  });
  return getComplaint(complaintId);
}

/* ---------------------------------------------------------------- authority */
export async function rankWorkers(complaintId) {
  const c = await requireComplaint(complaintId);
  const { rows: workers } = await query("SELECT * FROM users WHERE role='worker' AND active=TRUE AND area=$1 ORDER BY name", [c.area]);
  const { rows: counts } = await query("SELECT worker_id, COUNT(*)::int AS count FROM complaints WHERE worker_id IS NOT NULL AND status NOT IN ('resolved','rejected') GROUP BY worker_id");
  const activeByWorker = Object.fromEntries(counts.map((r) => [r.worker_id, r.count]));
  const department = categoryDepartment[c.category];
  return workers
    .map((w) => ({
      id: w.id,
      workerId: w.worker_id,
      name: w.name,
      department: w.department,
      ward: w.area,
      phone: w.phone,
      activeTasks: activeByWorker[w.id] || 0,
      departmentMatch: w.department === department || w.department === 'Municipal Services',
      distance: null,
    }))
    .filter((w) => w.departmentMatch)
    .sort((a, b) => a.activeTasks - b.activeTasks || a.name.localeCompare(b.name));
}

export async function assignWorker(authorityId, complaintId, { workerId, priority = 'Medium', note = '' }) {
  const complaint = await requireComplaint(complaintId);
  const authority = await findUserById(authorityId);
  if (!authority || authority.area !== complaint.area)
    throw new AppError(404, 'Complaint not found.');
  if (!['submitted', 'review', 'assigned'].includes(complaint.status))
    throw new AppError(409, 'Only open complaints can be assigned or reassigned.');
  const worker = await findWorkerById(workerId);
  if (!worker)
    throw new AppError(404, 'Worker not found.');
  if (worker.area !== complaint.area) {
    throw new AppError(409, `This worker is based in ${worker.area || 'another area'}. Choose a worker from ${complaint.area}.`);
  }
  // An emergency is always High and due the same day, whatever the form said.
  const finalPriority = complaint.isEmergency ? 'High' : priority;
  const assignedAt = new Date();
  const expected = new Date(assignedAt.getTime() + leadHoursFor(finalPriority, complaint.isEmergency) * 3600000);
  const timestamp = now();
  await withTransaction(async (client) => {
    // Lock the row and re-check its status, so a worker who just started the task cannot be silently overwritten.
    const { rows } = await client.query('SELECT status FROM complaints WHERE id=$1 FOR UPDATE', [complaintId]);
    if (!rows[0] || !['submitted', 'review', 'assigned'].includes(rows[0].status))
      throw new AppError(409, 'Only open complaints can be assigned or reassigned.');
    await client.query(`UPDATE complaints
       SET worker_id=$1, assigned_by=$2, assigned_at=$3, expected_by=$4, priority=$5, note=$6, status='assigned', updated_at=$7
       WHERE id=$8`, [worker.id, authorityId, assignedAt, expected, finalPriority, note || null, timestamp, complaintId]);
    await client.query('INSERT INTO notifications (id,user_id,complaint_id,title,body,created_at) VALUES ($1,$2,$3,$4,$5,$6),($7,$8,$3,$9,$10,$6)', [
      id('ntf_'), complaint.citizenId, complaintId, 'A worker has been assigned', `${complaintId} has been assigned to ${worker.name}.`, timestamp,
      id('ntf_'), worker.id, complaint.isEmergency ? 'EMERGENCY task assigned' : 'New task assigned', complaint.isEmergency ? `EMERGENCY: ${complaintId} must be started now and finished today. ${complaint.description}` : `You have been assigned ${complaintId}: ${complaint.description}`,
    ]);
  });
  return getComplaint(complaintId);
}

/** An authority declines a complaint that is invalid or a duplicate, and tells the citizen why. */
export async function rejectComplaint(authorityId, complaintId, { reason }) {
  const complaint = await requireComplaint(complaintId);
  const authority = await findUserById(authorityId);
  if (!authority || authority.area !== complaint.area)
    throw new AppError(404, 'Complaint not found.');
  if (!['submitted', 'review'].includes(complaint.status))
    throw new AppError(409, 'Only complaints that have not been assigned yet can be rejected.');
  const timestamp = now();
  const { rowCount } = await query(`UPDATE complaints SET status='rejected', rejection_reason=$1, assigned_by=$2, updated_at=$3
     WHERE id=$4 AND status IN ('submitted','review')`, [reason, authorityId, timestamp, complaintId]);
  if (!rowCount)
    throw new AppError(409, 'Only complaints that have not been assigned yet can be rejected.');
  await notify({
    userId: complaint.citizenId, complaintId, title: 'Your complaint could not be taken forward', body: `${complaintId}: ${reason}`
  });
  return getComplaint(complaintId);
}

/** An officer decides that the citizen's emergency flag was not justified. The complaint stays open as a normal one, the clock is
    restarted, the priority goes back to what the AI suggests, and the citizen (and the worker, if one is assigned) is told why.
    The dismissed flag is remembered: several in a month switch the flag off for that citizen (see createComplaint). */
export async function dismissEmergency(authorityId, complaintId, { reason }) {
  const complaint = await requireComplaint(complaintId);
  const authority = await findUserById(authorityId);
  if (!authority || authority.area !== complaint.area)
    throw new AppError(404, 'Complaint not found.');
  if (!complaint.isEmergency)
    throw new AppError(409, 'This complaint is not marked as an emergency.');
  if (['resolved', 'rejected'].includes(complaint.status))
    throw new AppError(409, 'This complaint is already closed.');
  const priority = priorityFromSeverity(complaint.aiSeverity, false);
  const timestamp = now();
  const { rowCount } = await query(
    `UPDATE complaints SET is_emergency=FALSE, emergency_dismissed=TRUE, emergency_dismiss_reason=$1, emergency_dismissed_at=$2,
            priority=$3, escalation_level=0, unassigned_alerted_at=NULL, worker_alerted_at=NULL, updated_at=$2,
            expected_by = CASE WHEN worker_id IS NULL THEN expected_by ELSE assigned_at + ($4::float * INTERVAL '1 hour') END
     WHERE id=$5 AND is_emergency=TRUE AND status NOT IN ('resolved','rejected')`,
    [reason, timestamp, priority, leadHoursFor(priority, false), complaintId],
  );
  if (!rowCount) throw new AppError(409, 'This complaint changed in the meantime. Please reload.');
  await notify({
    userId: complaint.citizenId, complaintId, title: 'Your emergency flag was reviewed',
    body: `${complaintId} is still being handled, as a normal complaint. The officer's note: ${reason} If someone is in immediate danger, call 112.`,
  });
  if (complaint.worker?.id) {
    await notify({
      userId: complaint.worker.id, complaintId, title: 'Task is no longer an emergency',
      body: `${complaintId} was reviewed by the authority and is now a normal-priority task.`,
    });
  }
  return getComplaint(complaintId);
}

/* ------------------------------------------------------------------- worker */
function assertOwnTask(c, workerId) {
  if (c.worker?.id !== workerId)
    throw new AppError(403, 'This task is not assigned to you.');
}

export async function startTask(workerId, complaintId) {
  const c = await requireComplaint(complaintId);
  assertOwnTask(c, workerId);
  if (c.status === 'progress')
    return c;
  if (c.status !== 'assigned')
    throw new AppError(409, 'Task cannot be started from its current status.');
  await query("UPDATE complaints SET status='progress', updated_at=$1 WHERE id=$2", [now(), complaintId]);
  await notify({
    userId: c.citizenId, complaintId, title: 'Work has started on your complaint', body: `A worker is now working on ${complaintId}.`
  });
  await notifyRole('authority', {
    area: c.area, complaintId, title: 'Work started', body: `${c.worker?.name || 'A worker'} started ${complaintId}.`
  });
  return getComplaint(complaintId);
}

/** Adds a progress photo (max 4 per round) or replaces the completion photo. Locks the complaint row so two uploads cannot both slip past the limit. */
export async function addPhoto(workerId, complaintId, type, file, caption = '') {
  const c = await requireComplaint(complaintId);
  assertOwnTask(c, workerId);
  if (c.status !== 'progress')
    throw new AppError(409, 'Start the task before uploading work photos.');
  const replaced = await withTransaction(async (client) => {
    const { rows } = await client.query('SELECT status, reopened_at FROM complaints WHERE id=$1 FOR UPDATE', [complaintId]);
    if (rows[0]?.status !== 'progress')
      throw new AppError(409, 'Start the task before uploading work photos.');
    const roundStart = rows[0].reopened_at; // photos from before a reopen are history, not part of this round
    let removedUrls = [];
    if (type === 'progress') {
      const { rows: counted } = await client.query("SELECT COUNT(*)::int AS count FROM complaint_photos WHERE complaint_id=$1 AND type='progress' AND created_at >= COALESCE($2::timestamptz,'-infinity'::timestamptz)", [complaintId, roundStart]);
      if (counted[0].count >= MAX_PROGRESS_PHOTOS)
        throw new AppError(409, `A maximum of ${MAX_PROGRESS_PHOTOS} progress photos is allowed.`);
    }
    else if (type === 'completion') {
      const removed = await client.query("DELETE FROM complaint_photos WHERE complaint_id=$1 AND type='completion' AND created_at >= COALESCE($2::timestamptz,'-infinity'::timestamptz) RETURNING url", [complaintId, roundStart]);
      removedUrls = removed.rows.map((r) => r.url);
    }
    await client.query('INSERT INTO complaint_photos (id,complaint_id,worker_id,type,url,caption,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)', [
      id('photo_'), complaintId, workerId, type, file.url, caption || null, now(),
    ]);
    await client.query('UPDATE complaints SET updated_at=$1 WHERE id=$2', [now(), complaintId]);
    return removedUrls;
  });
  await Promise.all(replaced.map(discardUpload));
  if (type === 'progress') {
    // Tell the citizen and the area's authorities right away, so progress is visible before the task is finished.
    await notify({ userId: c.citizenId, complaintId, title: 'New progress photo', body: `The worker added a progress photo to ${complaintId}.` });
    await notifyRole('authority', { area: c.area, complaintId, title: 'New progress photo', body: `${c.worker?.name || 'A worker'} added a progress photo to ${complaintId}.` });
  }
  return getComplaint(complaintId);
}

export async function removePhoto(workerId, complaintId, photoId) {
  const c = await requireComplaint(complaintId);
  assertOwnTask(c, workerId);
  const r = await query("DELETE FROM complaint_photos WHERE id=$1 AND complaint_id=$2 AND worker_id=$3 AND type='progress' RETURNING url", [photoId, complaintId, workerId]);
  if (!r.rowCount)
    throw new AppError(404, 'Progress photo not found.');
  await Promise.all(r.rows.map((x) => discardUpload(x.url)));
  return getComplaint(complaintId);
}

export async function completeTask(workerId, complaintId) {
  const c = await requireComplaint(complaintId);
  assertOwnTask(c, workerId);
  if (c.status !== 'progress')
    throw new AppError(409, 'Task must be in progress before completion.');
  const { rows } = await query("SELECT id FROM complaint_photos WHERE complaint_id=$1 AND type='completion' AND created_at >= COALESCE($2::timestamptz,'-infinity'::timestamptz) LIMIT 1", [complaintId, c.reopenedAt]);
  if (!rows[0])
    throw new AppError(409, 'A completion photo is required before closing the task.');
  const timestamp = now();
  await query("UPDATE complaints SET status='resolved', completed_at=$1, updated_at=$1 WHERE id=$2", [timestamp, complaintId]);
  const who = c.worker?.name || 'the field worker';
  await notify({
    userId: c.citizenId, complaintId, title: 'Your reported issue has been resolved', body: `${complaintId} has been completed by ${who}. Tell us how it went — you can rate the fix, or reopen it if the problem is still there.`
  });
  await notifyRole('authority', {
    area: c.area, complaintId, title: 'Task completed', body: `${complaintId} was completed by ${who}.`
  });
  return getComplaint(complaintId);
}

/* ---------------------------------------------------------------- dashboards */
export async function dashboardForCitizen(citizenId) {
  const rows = await listCitizenComplaints(citizenId);
  return {
    total: rows.length,
    active: rows.filter((c) => !['resolved', 'rejected'].includes(c.status)).length,
    resolved: rows.filter((c) => c.status === 'resolved').length,
    inProgress: rows.filter((c) => c.status === 'progress').length,
    recent: rows.slice(0, 3),
  };
}

export async function dashboardForAuthority(area) {
  const rows = await listAuthorityComplaints({ area });
  return {
    total: rows.length,
    new: rows.filter((c) => c.status === 'submitted' || c.status === 'review').length,
    pending: rows.filter((c) => c.status === 'assigned').length,
    inProgress: rows.filter((c) => c.status === 'progress').length,
    completed: rows.filter((c) => c.status === 'resolved').length,
    unassigned: rows.filter((c) => !c.worker && ['submitted', 'review'].includes(c.status)).length,
    recent: rows.slice(0, 6),
  };
}

/* --------------------------------------------------------- overdue reminders */
const hoursLabel = (hours) => {
  const h = Math.max(1, Math.round(hours));
  return h >= 48 ? `${Math.floor(h / 24)} days` : `${h} hour${h === 1 ? '' : 's'}`;
};

/** Complaints that still have no worker are chased on a clock that depends on how serious they are:
      emergency  -> after `emergencyHours` (default 1 h)      severe (AI >= 70%) -> after `severeHours` (default 2 h)
      the rest   -> after `hours` (default 4 h)
    and again every same interval while they stay unassigned. Every chase raises `escalation_level`, and the wording gets
    sharper each time (the authority's screen turns that into a flashing alert). A reopened complaint counts from the
    moment it was reopened. Returns how many were chased. */
export async function remindUnassigned({
  hours = env.unassignedAlertHours, emergencyHours = env.emergencyAlertHours, severeHours = env.severeAlertHours,
} = {}) {
  const { rows } = await query(
    `SELECT * FROM (
       SELECT id, area, category, location, is_emergency, emergency_reason, ai_severity, escalation_level,
              COALESCE(reopened_at, created_at) AS since, unassigned_alerted_at,
              CASE WHEN is_emergency THEN $2::float WHEN ai_severity >= 70 THEN LEAST($3::float, $1::float) ELSE $1::float END AS limit_hours
       FROM complaints
       WHERE worker_id IS NULL AND status IN ('submitted','review')
     ) t
     WHERE since < NOW() - (limit_hours * INTERVAL '1 hour')
       AND (unassigned_alerted_at IS NULL OR unassigned_alerted_at < NOW() - (limit_hours * INTERVAL '1 hour'))
     ORDER BY is_emergency DESC, ai_severity DESC NULLS LAST, since ASC LIMIT 200`,
    [hours, emergencyHours, severeHours],
  );
  for (const c of rows) {
    const waitedHours = (Date.now() - new Date(c.since).getTime()) / 3600000;
    const level = (c.escalation_level || 0) + 1;
    const where = `${c.id} (${c.category}) at ${c.location}`;
    const severity = c.ai_severity != null ? ` AI severity ${c.ai_severity}%.` : '';
    let title;
    let body;
    if (c.is_emergency) {
      title = level > 1 ? `EMERGENCY STILL UNASSIGNED (reminder ${level})` : 'EMERGENCY needs a worker NOW';
      body = `${where} was marked an EMERGENCY by the citizen and has had no worker for ${hoursLabel(waitedHours)}.${severity} Assign a worker immediately.`;
    } else if (c.ai_severity != null && c.ai_severity >= 70) {
      title = `Severe issue still unassigned${level > 1 ? ` (reminder ${level})` : ''}`;
      body = `${where} looks severe in the photo and has had no worker for ${hoursLabel(waitedHours)}.${severity} Please assign one.`;
    } else {
      title = level > 1 ? `Complaint still needs a worker (reminder ${level})` : 'Complaint still needs a worker';
      body = `${where} has had no worker assigned for ${hoursLabel(waitedHours)}. Please assign one.`;
    }
    const plan = escalationPlan(level, c.is_emergency);
    if (plan.stage !== 'new') title = `${plan.stage === 'critical' ? 'CRITICAL' : 'ESCALATED'}: ${title}`;
    if (plan.inApp) await notifyRole('authority', { area: c.area, complaintId: c.id, title, body });
    if (plan.email) {
      const { rows: officers } = await query("SELECT name, email FROM users WHERE role='authority' AND active=TRUE AND area=$1 AND email IS NOT NULL", [c.area]);
      const label = Object.fromEntries(CATEGORIES.map((x) => [x.id, x.label]));
      for (const o of officers) {
        void sendMail({
          to: o.email,
          ...emergencyAlertEmail({
            name: o.name, complaintId: c.id, title: label[c.category] || 'Civic Issue', location: c.location, waited: hoursLabel(waitedHours),
            level, severity: c.ai_severity, reason: c.emergency_reason, link: `${env.appUrl}/authority/complaints/${c.id}`,
          }),
        });
      }
    }
    await query('UPDATE complaints SET unassigned_alerted_at=$1, escalation_level=$2 WHERE id=$3', [now(), level, c.id]);
  }
  return rows.length;
}

/** Tasks that were assigned but not finished in time. Emergencies are chased after `emergencyWorkerHours` without a start;
    any task past its due time is chased every 4 hours. The worker AND the area's authorities are told. */
export async function remindOverdueWork({ emergencyWorkerHours = env.emergencyWorkerHours } = {}) {
  const { rows } = await query(
    `SELECT id, area, category, location, worker_id, is_emergency, status, expected_by, assigned_at
     FROM complaints
     WHERE worker_id IS NOT NULL AND status IN ('assigned','progress')
       AND (
         (is_emergency AND status = 'assigned' AND assigned_at < NOW() - ($1::float * INTERVAL '1 hour'))
         OR (expected_by IS NOT NULL AND expected_by < NOW())
       )
       AND (worker_alerted_at IS NULL OR worker_alerted_at < NOW() - (CASE WHEN is_emergency THEN $1::float ELSE 4 END * INTERVAL '1 hour'))
     ORDER BY is_emergency DESC, expected_by ASC NULLS LAST LIMIT 200`,
    [emergencyWorkerHours],
  );
  for (const c of rows) {
    const late = c.expected_by && new Date(c.expected_by).getTime() < Date.now();
    const where = `${c.id} (${c.category}) at ${c.location}`;
    const workerTitle = c.is_emergency ? 'EMERGENCY task is waiting for you' : 'Task is overdue';
    const workerBody = c.is_emergency
      ? `${where} is an EMERGENCY${c.status === 'assigned' ? ' and has not been started' : ''}. Finish it as soon as possible.`
      : `${where} has passed its due time. Please finish it or tell the authority why it is delayed.`;
    await notify({ userId: c.worker_id, complaintId: c.id, title: workerTitle, body: workerBody });
    await notifyRole('authority', {
      area: c.area,
      complaintId: c.id,
      title: c.is_emergency ? 'EMERGENCY work is overdue' : 'Assigned task is overdue',
      body: `${where} ${late ? 'is past its due time' : 'has not been started'} (${c.status === 'assigned' ? 'worker has not started' : 'work in progress'}).`,
    });
    await query('UPDATE complaints SET worker_alerted_at=$1 WHERE id=$2', [now(), c.id]);
  }
  return rows.length;
}

/* ------------------------------------------------------------ attention list */
/** What the authority of `area` must act on right now (shown as the red alert bar, the pop-up and the sidebar badge):
      - every open emergency that still has no worker
      - complaints with no worker that have waited past their limit (severe: 2 h, others: 4 h)
      - assigned work that is overdue (emergencies not started within the worker window, or past the due time)
    Computed with the same limits the reminders use, so the screen and the notifications always agree. */
export async function attentionForAuthority(area) {
  const { rows } = await query(
    `SELECT c.id, c.category, c.location, c.place, c.status, c.is_emergency, c.emergency_reason, c.ai_severity, c.escalation_level,
            c.expected_by, c.assigned_at, COALESCE(c.reopened_at, c.created_at) AS since, w.name AS worker_name
     FROM complaints c LEFT JOIN users w ON w.id = c.worker_id
     WHERE c.area = $1 AND (
       (c.worker_id IS NULL AND c.status IN ('submitted','review') AND (
          c.is_emergency
          OR COALESCE(c.reopened_at, c.created_at) < NOW() - (CASE WHEN c.ai_severity >= 70 THEN LEAST($3::float, $2::float) ELSE $2::float END * INTERVAL '1 hour')))
       OR (c.worker_id IS NOT NULL AND c.status IN ('assigned','progress') AND (
          (c.expected_by IS NOT NULL AND c.expected_by < NOW())
          OR (c.is_emergency AND c.status = 'assigned' AND c.assigned_at < NOW() - ($4::float * INTERVAL '1 hour'))))
     )
     ORDER BY c.is_emergency DESC, c.ai_severity DESC NULLS LAST, since ASC LIMIT 20`,
    [area ?? null, env.unassignedAlertHours, env.severeAlertHours, env.emergencyWorkerHours],
  );
  const label = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));
  const items = rows.map((c) => ({
    id: c.id,
    title: label[c.category] || 'Civic Issue',
    location: c.location,
    place: c.place || null,
    kind: c.worker_name ? 'work' : c.is_emergency ? 'emergency' : 'overdue',
    isEmergency: Boolean(c.is_emergency),
    emergencyReason: c.emergency_reason || null,
    severity: c.ai_severity ?? null,
    level: c.escalation_level || 0,
    workerName: c.worker_name || null,
    waitedHours: Math.max(0, (Date.now() - new Date(c.since).getTime()) / 3600000),
  }));
  return { count: items.length, emergencies: items.filter((i) => i.isEmergency).length, items };
}
