import { query } from '../db/database.js';
import { now } from '../utils/id.js';
import { notify, notifyRole } from './notifications.js';

/** A worker who leaves (deletes the account) must not strand their open tasks: they go back to the authority as unassigned. */
export async function releaseWorkerTasks(workerUserId) {
  const { rows } = await query(
    `UPDATE complaints SET status='review', worker_id=NULL, assigned_at=NULL, expected_by=NULL, unassigned_alerted_at=NULL, updated_at=$1
     WHERE worker_id=$2 AND status IN ('assigned','progress')
     RETURNING id, area, citizen_id`,
    [now(), workerUserId],
  );
  for (const c of rows) {
    await notifyRole('authority', { area: c.area, complaintId: c.id, title: 'Worker left: complaint needs a new worker', body: `${c.id} lost its worker because the account was closed. Please assign another worker.` });
    await notify({ userId: c.citizen_id, complaintId: c.id, title: 'Your complaint is being reassigned', body: `${c.id} is back with the authority and will get a new worker.` });
  }
  return rows.length;
}
