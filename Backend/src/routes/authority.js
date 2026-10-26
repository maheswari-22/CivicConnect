import { Router } from 'express';
import { asyncHandler, ok, AppError } from '../utils/http.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { idSchema, assignSchema, rejectSchema, dismissEmergencySchema } from '../utils/validation.js';
import { dashboardForAuthority, attentionForAuthority, dismissEmergency, listAuthorityComplaints, getComplaint, assignWorker, rankWorkers, rejectComplaint } from '../services/complaints.js';
import { listWorkers, listPendingWorkers, approveWorker, rejectWorker } from '../services/users.js';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '../services/notifications.js';

const router = Router();
router.use(requireAuth, allowRoles('authority'));

// An authority only works with complaints from their own area (req.user.area).
const myComplaint = async (req, idValue) => {
  const c = await getComplaint(idValue);
  if (!c || c.area !== req.user.area)
    throw new AppError(404, 'Complaint not found.');
  return c;
};
router.get('/dashboard', asyncHandler(async (req, res) => ok(res, await dashboardForAuthority(req.user.area))));
router.get('/attention', asyncHandler(async (req, res) => ok(res, await attentionForAuthority(req.user.area))));
router.get('/complaints', asyncHandler(async (req, res) => ok(res, await listAuthorityComplaints({
  area: req.user.area, status: req.query.status, priority: req.query.priority, category: req.query.category, q: req.query.q
}))));
router.get('/complaints/:id', asyncHandler(async (req, res) => ok(res, await myComplaint(req, idSchema.parse(req.params.id)))));
router.get('/complaints/:id/workers', asyncHandler(async (req, res) => {
  const c = await myComplaint(req, idSchema.parse(req.params.id));
  ok(res, await rankWorkers(c.id));
}));
router.post('/complaints/:id/assign', asyncHandler(async (req, res) => ok(res, await assignWorker(req.user.id, idSchema.parse(req.params.id), assignSchema.parse(req.body)))));
router.post('/complaints/:id/emergency/dismiss', asyncHandler(async (req, res) => ok(res, await dismissEmergency(req.user.id, idSchema.parse(req.params.id), dismissEmergencySchema.parse(req.body)))));
router.post('/complaints/:id/reject', asyncHandler(async (req, res) => ok(res, await rejectComplaint(req.user.id, idSchema.parse(req.params.id), rejectSchema.parse(req.body)))));
router.get('/workers', asyncHandler(async (req, res) => ok(res, await listWorkers({ area: req.user.area ?? null }))));
router.get('/workers/pending', asyncHandler(async (req, res) => ok(res, { workers: await listPendingWorkers(req.user.area) })));
router.post('/workers/:id/approve', asyncHandler(async (req, res) => ok(res, { worker: await approveWorker(req.user, idSchema.parse(req.params.id)) })));
router.post('/workers/:id/reject', asyncHandler(async (req, res) => { await rejectWorker(req.user, idSchema.parse(req.params.id)); ok(res, { message: 'Worker request declined.' }); }));
router.get('/tracking', asyncHandler(async (req, res) => ok(res, await listAuthorityComplaints({ area: req.user.area, status: req.query.status }))));
router.get('/notifications', asyncHandler(async (req, res) => ok(res, await listNotifications(req.user.id))));
router.patch('/notifications/:id/read', asyncHandler(async (req, res) => ok(res, await markNotificationRead(req.user.id, idSchema.parse(req.params.id)))));
router.post('/notifications/read-all', asyncHandler(async (req, res) => ok(res, await markAllNotificationsRead(req.user.id))));

export default router;
