/* ==========================================================================
   Shared complaint store for the Authority Portal.

   Every page (Dashboard, Complaints, Assign Worker, Pending, Completed,
   Tracking, Profile) reads from here, so assigning a worker on one page is
   reflected everywhere. Data is loaded from the API into this store
   (see loadAuthorityData); pages read it synchronously.

   Status flow:  New -> Pending -> In Progress -> Completed
     New          reported by a citizen, no worker yet
     Pending      worker assigned, has not started
     In Progress  worker has started (uploads progress photos)
     Completed    resolved

   Worker photos live on the complaint:
     progressPhotos: [{ src, caption, at }]   completionPhoto: "url"
   ========================================================================== */

import { api, assetUrl } from "../../../shared/api.js";
import { setWorkers, positionForKey, nearestWard, MAP_SIZE } from "./workers";

export const STATUS_LIST = ["New", "Pending", "In Progress", "Completed"];

/* Authority statuses -> the wording used on the Tracking page */
export const TRACKING_STATUS = {
  New: "Submitted",
  Pending: "Assigned",
  "In Progress": "In Progress",
  Completed: "Completed",
};

/* ------------------------------------------------------------------ dates */

function isoDay(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(iso) {
  if (!iso) return "—";
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export function relativeDay(iso) {
  if (!iso) return "—";
  const today = new Date(`${isoDay(0)}T00:00:00`);
  const date = new Date(`${iso}T00:00:00`);
  const days = Math.round((today - date) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function priorityLabel(priority) {
  return `${priority} priority`;
}

/* --------------------------------------------------------------- API mapping */

const CATEGORY_VIEW = {
  road: { category: "Road", title: "Road Damage", image: "/road-image.jpg" },
  light: { category: "Electricity", title: "Street Light", image: "/brokenstreetlights.jpg" },
  garbage: { category: "Garbage", title: "Garbage Collection Issue", image: "/garbage-image.jpg" },
  water: { category: "Water", title: "Water Supply Problem", image: "/water-image.jpg" },
  other: { category: "Other", title: "Civic Issue", image: "/road-image.jpg" },
};

const STATUS_VIEW = {
  submitted: { status: "New", progress: 10 },
  review: { status: "New", progress: 10 },
  assigned: { status: "Pending", progress: 25 },
  progress: { status: "In Progress", progress: 60 },
  resolved: { status: "Completed", progress: 100 },
};

const day = (iso) => (iso ? String(iso).slice(0, 10) : null);

/* The city map is a simple km grid. Real GPS coordinates are projected onto it
   around a fixed city window; complaints without coordinates get a stable spot. */
const CITY = { lat: [17.34, 17.44], lng: [78.43, 78.53] };
function pointFor(c) {
  if (!c.coords) return positionForKey(c.id);
  const fx = (c.coords.lng - CITY.lng[0]) / (CITY.lng[1] - CITY.lng[0]);
  const fy = (CITY.lat[1] - c.coords.lat) / (CITY.lat[1] - CITY.lat[0]);
  const clamp = (v, max) => Math.min(max - 0.5, Math.max(0.5, v));
  return { x: clamp(fx * MAP_SIZE.width, MAP_SIZE.width), y: clamp(fy * MAP_SIZE.height, MAP_SIZE.height) };
}

function fromApi(c) {
  const cat = CATEGORY_VIEW[c.category] || CATEGORY_VIEW.other;
  const view = STATUS_VIEW[c.status] || STATUS_VIEW.submitted;
  const point = pointFor(c);
  const progress = (c.workPhotos?.progress || []).map((p) => ({
    id: p.id,
    src: assetUrl(p.url),
    caption: p.caption || "Work in progress",
    at: day(p.createdAt),
  }));
  return {
    id: c.id,
    title: cat.title,
    category: cat.category,
    location: c.location,
    ward: c.location,
    wardZone: nearestWard(point),
    point,
    status: view.status,
    priority: c.priority || "Medium",
    image: assetUrl(c.photo) || cat.image,
    description: c.description,
    citizenName: c.citizen?.name || "Citizen",
    citizenContact: c.citizen?.mobile || c.citizen?.email || "—",
    reportedOn: day(c.createdAt),
    // full timestamp (the date above loses the time): used to tell how long a complaint has waited for a worker
    waitingSince: c.reopenedAt || c.createdAt || null,
    place: c.place || "",
    // AI photo severity (0-100), the priority it suggests, and the citizen's emergency flag
    aiSeverity: c.aiSeverity ?? null,
    suggestedPriority: c.suggestedPriority || "Medium",
    isEmergency: Boolean(c.isEmergency),
    emergencyReason: c.emergencyReason || "",
    escalationLevel: c.escalationLevel || 0,
    needsReview: Boolean(c.needsReview),
    progress: view.progress,
    assignedWorkerId: c.worker?.workerId || null,
    assignedWorkerName: c.worker?.name || null,
    assignedOn: day(c.assignedOn),
    expectedBy: day(c.expectedBy),
    completedOn: day(c.completedOn),
    note: c.note || "",
    reopenReason: c.reopenReason || "",
    reopenCount: c.reopenCount || 0,
    rating: c.rating || null,
    feedback: c.feedback || "",
    progressPhotos: progress,
    completionPhoto: c.workPhotos?.completion ? assetUrl(c.workPhotos.completion.url) : null,
  };
}

/* ------------------------------------------------------------------- store */

let complaints = [];
let loaded = false;
let signature = "";

export const hasAuthorityData = () => loaded;

/** Fetches complaints and the worker roster into the store. */
export async function loadAuthorityData() {
  const client = api("authority");
  const [list, workers] = await Promise.all([
    client.get("/api/authority/complaints"),
    client.get("/api/authority/workers"),
  ]);
  if (!list.ok) return { ok: false, error: list.error };
  if (!workers.ok) return { ok: false, error: workers.error };

  const next = list.data.filter((c) => c.status !== "rejected");
  const nextSignature = JSON.stringify([
    next.map((c) => [c.id, c.status, c.updatedAt, c.priority, c.isEmergency, c.escalationLevel, c.workPhotos?.progress?.length || 0, c.workPhotos?.completion?.id || (c.workPhotos?.completion ? 1 : 0)]),
    workers.data.map((w) => w.workerId),
  ]);
  complaints = next.map(fromApi);
  setWorkers(workers.data);
  const changed = nextSignature !== signature;
  signature = nextSignature;
  loaded = true;
  return { ok: true, changed };
}

export function getComplaints() {
  return complaints.map((complaint) => ({ ...complaint }));
}

/* Hours after which a complaint with no worker counts as overdue. The API chases on the same clock
   (UNASSIGNED_ALERT_HOURS, SEVERE_ALERT_HOURS and EMERGENCY_ALERT_HOURS in Backend/.env):
   an emergency after 1 hour, a severe one (AI 70% or more) after 2, everything else after 4. */
export const UNASSIGNED_ALERT_HOURS = 4;
export const SEVERE_ALERT_HOURS = 2;
export const EMERGENCY_ALERT_HOURS = 1;
export const SEVERE_SCORE = 70;

/** How long this complaint may wait for a worker before it counts as overdue. */
export function alertLimitHours(complaint) {
  if (complaint.isEmergency) return EMERGENCY_ALERT_HOURS;
  if (complaint.aiSeverity != null && complaint.aiSeverity >= SEVERE_SCORE) return SEVERE_ALERT_HOURS;
  return UNASSIGNED_ALERT_HOURS;
}

/** Hours this complaint has been waiting for a worker (0 when it already has one or is not new). */
export function hoursWaiting(complaint, nowMs = Date.now()) {
  if (complaint.status !== "New" || !complaint.waitingSince) return 0;
  const since = new Date(complaint.waitingSince).getTime();
  return Number.isNaN(since) ? 0 : Math.max(0, (nowMs - since) / 3600000);
}

/** True when a new complaint has waited past its own limit. */
export const isOverdue = (complaint) => hoursWaiting(complaint) >= alertLimitHours(complaint);

/** "3 hours", "1 day", "4 days" */
export function waitingLabel(hours) {
  if (hours < 1) return "under an hour";
  if (hours < 48) return `${Math.round(hours)} hour${Math.round(hours) === 1 ? "" : "s"}`;
  return `${Math.floor(hours / 24)} days`;
}

/** New complaints that still have no worker: emergencies first, then overdue, then the most severe, then longest-waiting. */
export function getUnassigned() {
  return complaints
    .filter((c) => c.status === "New" && !c.assignedWorkerId)
    .sort((a, b) =>
      Number(b.isEmergency) - Number(a.isEmergency)
      || Number(isOverdue(b)) - Number(isOverdue(a))
      || (b.aiSeverity ?? -1) - (a.aiSeverity ?? -1)
      || String(a.waitingSince).localeCompare(String(b.waitingSince)))
    .map((c) => ({ ...c }));
}

/** What needs the officer's attention right now: every open emergency, and every complaint that has waited too long. */
export function getAttentionItems() {
  return getUnassigned()
    .filter((c) => c.isEmergency || isOverdue(c))
    .map((c) => ({ ...c, kind: c.isEmergency ? "emergency" : "overdue", waited: hoursWaiting(c) }));
}

export function getComplaintById(id) {
  const found = complaints.find((complaint) => complaint.id === id);
  return found ? { ...found } : null;
}

/* Rejects a New complaint (invalid or duplicate) and tells the citizen why.
   It then leaves the authority's list. Throws an Error with the server's message if refused. */
export async function rejectComplaint(id, reason) {
  const res = await api("authority").post(`/api/authority/complaints/${encodeURIComponent(id)}/reject`, { reason });
  if (!res.ok) throw new Error(res.error);
  complaints = complaints.filter((complaint) => complaint.id !== id);
  signature = "";
}

/* The officer decides the citizen's emergency flag was not justified: it becomes a normal complaint, the citizen is told why.
   Throws an Error with the server's message if refused. */
export async function dismissEmergency(id, reason) {
  const res = await api("authority").post(`/api/authority/complaints/${encodeURIComponent(id)}/emergency/dismiss`, { reason });
  if (!res.ok) throw new Error(res.error);
  const updated = fromApi(res.data);
  complaints = complaints.map((complaint) => (complaint.id === id ? updated : complaint));
  signature = "";
  return { ...updated };
}

/* Assigns a worker to a New complaint -> Pending. Throws an Error with the
   server's message if it is refused. */
export async function assignWorker(id, { workerId, priority, note }) {
  const res = await api("authority").post(`/api/authority/complaints/${encodeURIComponent(id)}/assign`, {
    workerId,
    priority,
    note: note || undefined,
  });
  if (!res.ok) throw new Error(res.error);
  const updated = fromApi(res.data);
  complaints = complaints.map((complaint) => (complaint.id === id ? updated : complaint));
  signature = "";
  return { ...updated };
}
