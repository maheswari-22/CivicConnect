import { Router } from 'express';
import { asyncHandler, ok } from '../utils/http.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { idSchema, photoCaptionSchema } from '../utils/validation.js';
import { listWorkerTasks, getComplaint, startTask, addPhoto, removePhoto, completeTask, redactForWorker } from '../services/complaints.js';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '../services/notifications.js';
import { photoUpload, discardOnError } from '../middleware/upload.js';
import rateLimit from 'express-rate-limit';

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'Too many uploads. Please wait a few minutes and try again.' }
});
const router = Router();
router.use(requireAuth, allowRoles('worker'));
router.get('/dashboard', asyncHandler(async (req, res) => {
  const tasks = await listWorkerTasks(req.user.id);
  ok(res, {
    total: tasks.length, pending: tasks.filter(t => t.status === 'assigned').length, inProgress: tasks.filter(t => t.status === 'progress').length, completed: tasks.filter(t => t.status === 'resolved').length, recent: tasks.slice(0, 5).map(redactForWorker)
  });
}));
router.get('/tasks', asyncHandler(async (req, res) => ok(res, (await listWorkerTasks(req.user.id, { status: req.query.status })).map(redactForWorker))));
router.get('/tasks/:id', asyncHandler(async (req, res) => {
  const c = await getComplaint(idSchema.parse(req.params.id));
  if (!c || c.worker?.id !== req.user.id)
    return res.status(404).json({ ok: false, error: 'Task not found.' });
  ok(res, redactForWorker(c));
}));
router.post('/tasks/:id/start', asyncHandler(async (req, res) => ok(res, redactForWorker(await startTask(req.user.id, idSchema.parse(req.params.id))))));
router.post('/tasks/:id/progress-photo', uploadLimiter, photoUpload('photo'), discardOnError(async (req, res) => {
  if (!req.file)
    return res.status(400).json({ ok: false, error: 'An image file is required.' });
  const { caption } = photoCaptionSchema.parse(req.body);
  ok(res, redactForWorker(await addPhoto(req.user.id, idSchema.parse(req.params.id), 'progress', { url: `/uploads/${req.file.filename}` }, caption)));
}));
router.delete('/tasks/:id/progress-photo/:photoId', asyncHandler(async (req, res) => ok(res, redactForWorker(await removePhoto(req.user.id, idSchema.parse(req.params.id), idSchema.parse(req.params.photoId))))));
router.post('/tasks/:id/completion-photo', uploadLimiter, photoUpload('photo'), discardOnError(async (req, res) => {
  if (!req.file)
    return res.status(400).json({ ok: false, error: 'An image file is required.' });
  ok(res, redactForWorker(await addPhoto(req.user.id, idSchema.parse(req.params.id), 'completion', { url: `/uploads/${req.file.filename}` }, 'Work completed')));
}));
router.post('/tasks/:id/complete', asyncHandler(async (req, res) => ok(res, redactForWorker(await completeTask(req.user.id, idSchema.parse(req.params.id))))));
router.get('/notifications', asyncHandler(async (req, res) => ok(res, await listNotifications(req.user.id))));
router.patch('/notifications/:id/read', asyncHandler(async (req, res) => ok(res, await markNotificationRead(req.user.id, idSchema.parse(req.params.id)))));
router.post('/notifications/read-all', asyncHandler(async (req, res) => ok(res, await markAllNotificationsRead(req.user.id))));

export default router;
