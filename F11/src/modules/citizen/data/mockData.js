// ============================================================
// CITIZEN DATA LAYER
// Static lookup tables plus the API calls the Citizen portal makes.
// Every function returns a Promise and throws an Error (with a
// readable message) when the server rejects the request.
// ============================================================

import { api, assetUrl } from '../../../shared/api.js';

const http = api('citizen');

export const CATEGORIES = [
  { id: 'road', label: 'Road Damage', icon: 'road', desc: 'Potholes, cracked pavement, broken dividers' },
  { id: 'light', label: 'Street Light', icon: 'light', desc: 'Outages, flickering, damaged poles' },
  { id: 'garbage', label: 'Garbage', icon: 'garbage', desc: 'Overflowing bins, illegal dumping' },
  { id: 'water', label: 'Water', icon: 'water', desc: 'Leaks, contamination, drainage issues' },
  { id: 'other', label: 'Other', icon: 'other', desc: 'Anything else affecting your community' },
];

export const STATUS_STEPS = [
  { id: 'submitted', label: 'Complaint Submitted', message: 'We\u2019ve received your report and logged it into the system.' },
  { id: 'review', label: 'Under Review', message: 'Our civic team is verifying the details of your report.' },
  { id: 'assigned', label: 'Worker Assigned', message: 'Your complaint has been assigned to a field worker.' },
  { id: 'progress', label: 'Work In Progress', message: 'Our worker is currently working on this issue.' },
  { id: 'resolved', label: 'Resolved', message: 'Great news! Your reported issue has been resolved.' },
];

const STATUS_INDEX = Object.fromEntries(STATUS_STEPS.map((s, i) => [s.id, i]));

// Tasks a field worker steps through once assigned to a complaint.
// Citizens see this as a read-only checklist alongside the overall
// status timeline, so they can follow exactly how far along the
// worker is — not just which broad status the complaint is in.
export const WORKER_TASK_STEPS = [
  'Reached the site',
  'Inspected the issue',
  'Repair work in progress',
  'Cleanup & verification',
];

// Returns worker + task-progress info for a complaint, or null when no
// worker has been assigned yet (status is still submitted/review).
function workerProgressFor(worker, status) {
  if (!worker || !['assigned', 'progress', 'resolved'].includes(status)) return null;
  const completedSteps = status === 'assigned' ? 1 : status === 'progress' ? 3 : WORKER_TASK_STEPS.length;
  return {
    name: worker.name,
    role: worker.department || 'Field Worker',
    phone: worker.phone || '',
    rating: null,
    completedSteps,
    percent: Math.round((completedSteps / WORKER_TASK_STEPS.length) * 100),
  };
}

const day = (iso) => String(iso || new Date().toISOString()).slice(0, 10);

// Backend complaint -> the shape the Citizen pages already render.
function fromApi(c) {
  const progress = (c.workPhotos?.progress || []).map((p) => ({
    id: p.id,
    src: assetUrl(p.url),
    caption: p.caption || 'Work in progress',
    at: day(p.createdAt),
  }));
  const done = c.workPhotos?.completion;
  return {
    id: c.id,
    category: c.category,
    description: c.description,
    location: c.location,
    coords: c.coords,
    photo: assetUrl(c.photo),
    status: c.status,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    aiSeverity: c.aiSeverity ?? null,
    isEmergency: Boolean(c.isEmergency),
    emergencyDismissed: Boolean(c.emergencyDismissed),
    emergencyDismissReason: c.emergencyDismissReason || '',
    rejectionReason: c.rejectionReason || '',
    reopenCount: c.reopenCount || 0,
    rating: c.rating || null,
    feedback: c.feedback || '',
    worker: workerProgressFor(c.worker, c.status),
    workPhotos: progress.length || done ? { progress, completion: done ? { src: assetUrl(done.url), at: day(done.createdAt) } : null } : null,
  };
}

function unwrap(res) {
  if (!res.ok) throw new Error(res.error);
  return res.data;
}

export async function fetchComplaints() {
  return unwrap(await http.get('/api/citizen/complaints')).map(fromApi);
}

export async function fetchComplaintById(id) {
  const res = await http.get(`/api/citizen/complaints/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  return fromApi(unwrap(res));
}

export async function createComplaint(data) {
  const form = new FormData();
  form.append('category', data.category);
  form.append('description', data.description);
  form.append('location', data.location || 'Current location');
  if (data.area) form.append('area', data.area);
  if (data.place) form.append('place', data.place);
  if (data.aiVerdict) form.append('aiVerdict', data.aiVerdict);
  if (data.aiLabel) form.append('aiLabel', data.aiLabel);
  if (data.aiSeverity != null) form.append('aiSeverity', String(Math.round(data.aiSeverity)));
  if (data.isEmergency) {
    form.append('isEmergency', 'true');
    if (data.emergencyReason) form.append('emergencyReason', data.emergencyReason);
  }
  if (data.coords) {
    form.append('lat', String(data.coords.lat));
    form.append('lng', String(data.coords.lng));
  }
  if (data.photoFile) form.append('photo', data.photoFile);
  return fromApi(unwrap(await http.upload('/api/citizen/complaints', form)));
}

// Rate the fix on a resolved complaint (once). `comment` is optional.
export async function rateComplaint(id, rating, comment) {
  return fromApi(unwrap(await http.post(`/api/citizen/complaints/${encodeURIComponent(id)}/feedback`, { rating, comment: comment || undefined })));
}

// Reopen a resolved complaint when the problem is still there.
export async function reopenComplaint(id, reason) {
  return fromApi(unwrap(await http.post(`/api/citizen/complaints/${encodeURIComponent(id)}/reopen`, { reason })));
}

export async function fetchNotifications() {
  return unwrap(await http.get('/api/citizen/notifications'));
}

export async function markNotificationRead(id) {
  return unwrap(await http.patch(`/api/citizen/notifications/${encodeURIComponent(id)}/read`));
}

export async function markAllNotificationsRead() {
  return unwrap(await http.post('/api/citizen/notifications/read-all'));
}

export function statusIndex(statusId) {
  return STATUS_INDEX[statusId] ?? 0;
}

export function categoryById(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

export async function fetchDashboardStats() {
  const d = unwrap(await http.get('/api/citizen/dashboard'));
  return { active: d.active, resolved: d.resolved, inProgress: d.inProgress, total: d.total };
}
