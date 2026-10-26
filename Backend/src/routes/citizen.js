import { Router } from 'express';
import { asyncHandler, ok } from '../utils/http.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { complaintSchema, idSchema, reopenSchema, feedbackSchema } from '../utils/validation.js';
import { dashboardForCitizen, listCitizenComplaints, getComplaint, createComplaint, reopenComplaint, rateComplaint } from '../services/complaints.js';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '../services/notifications.js';
import { photoUpload, discardOnError } from '../middleware/upload.js';
import rateLimit from 'express-rate-limit';

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'Too many uploads. Please wait a few minutes and try again.' }
});
const router = Router();
router.use(requireAuth, allowRoles('citizen'));
router.get('/dashboard', asyncHandler(async (req, res) => ok(res, await dashboardForCitizen(req.user.id))));
router.get('/complaints', asyncHandler(async (req, res) => ok(res, await listCitizenComplaints(req.user.id, {
  status: req.query.status, category: req.query.category, q: req.query.q
}))));
router.post('/complaints', uploadLimiter, photoUpload('photo'), discardOnError(async (req, res) => {
  const input = complaintSchema.parse(req.body);
  const photo = req.file ? { url: `/uploads/${req.file.filename}`, hash: req.file.hash } : null;
  ok(res, await createComplaint(req.user.id, input, photo), 201);
}));
router.get('/complaints/:id', asyncHandler(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const c = await getComplaint(id);
  if (!c || c.citizenId !== req.user.id)
    return res.status(404).json({ ok: false, error: 'Complaint not found.' });
  ok(res, c);
}));
router.post('/complaints/:id/reopen', asyncHandler(async (req, res) => ok(res, await reopenComplaint(req.user.id, idSchema.parse(req.params.id), reopenSchema.parse(req.body)))));
router.post('/complaints/:id/feedback', asyncHandler(async (req, res) => ok(res, await rateComplaint(req.user.id, idSchema.parse(req.params.id), feedbackSchema.parse(req.body)))));
router.get('/notifications', asyncHandler(async (req, res) => ok(res, await listNotifications(req.user.id))));
router.patch('/notifications/:id/read', asyncHandler(async (req, res) => ok(res, await markNotificationRead(req.user.id, idSchema.parse(req.params.id)))));
router.post('/notifications/read-all', asyncHandler(async (req, res) => ok(res, await markAllNotificationsRead(req.user.id))));

export default router;
