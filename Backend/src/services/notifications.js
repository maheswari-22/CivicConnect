import { query } from '../db/database.js';
import { id, now } from '../utils/id.js';

export async function notify({ userId, complaintId = null, title, body }) {
  await query('INSERT INTO notifications (id,user_id,complaint_id,title,body,created_at) VALUES ($1,$2,$3,$4,$5,$6)', [id('ntf_'), userId, complaintId, title, body, now()]);
}

/** `area` limits the notification to users of that area (e.g. the authorities of a complaint's area). */
export async function notifyRole(role, { complaintId = null, title, body, area = null }) {
  await query(
    `INSERT INTO notifications (id,user_id,complaint_id,title,body,created_at)
     SELECT 'ntf_'||gen_random_uuid()::text, id, $1, $2, $3, $4
     FROM users WHERE role=$5 AND active=TRUE AND ($6::text IS NULL OR area=$6::text)`,
    [complaintId, title, body, now(), role, area],
  );
}

export async function listNotifications(userId) {
  const { rows } = await query(
    'SELECT id, complaint_id AS "complaintId", title, body, read_at AS "readAt", created_at AS "createdAt" FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',
    [userId],
  );
  return rows.map((n) => ({ ...n, read: Boolean(n.readAt) }));
}

export async function markNotificationRead(userId, notificationId) {
  await query('UPDATE notifications SET read_at=$1 WHERE id=$2 AND user_id=$3', [now(), notificationId, userId]);
  return listNotifications(userId);
}

export async function markAllNotificationsRead(userId) {
  await query('UPDATE notifications SET read_at=$1 WHERE user_id=$2 AND read_at IS NULL', [now(), userId]);
  return listNotifications(userId);
}
