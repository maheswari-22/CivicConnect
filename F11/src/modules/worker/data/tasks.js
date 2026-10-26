/* The worker's assigned tasks, loaded from the API.

   `TASKS` is one shared array (updated in place) used by the Tasks page, the
   Dashboard, History and the notifications, so they always agree. The portal
   loads it through `loadWorkerData` before any page renders. */

import { api, assetUrl } from "../../../shared/api.js";
import { replaceUpdates } from "../../../shared/workPhotos.js";

export const TASKS = [];

const BEFORE_IMAGE = {
  road: "/images/road-before.jpg",
  garbage: "/images/garbage-before.jpg",
  water: "/images/water-before.jpg",
  light: "/brokenstreetlights.jpg",
  other: "/images/road-before.jpg",
};
const CATEGORY_TITLE = {
  road: "Road Damage",
  light: "Street Light",
  garbage: "Garbage Collection",
  water: "Water Leakage",
  other: "Civic Issue",
};
const STATUS_VIEW = {
  assigned: { status: "Pending", statusClass: "pending" },
  progress: { status: "In Progress", statusClass: "progress" },
  resolved: { status: "Completed", statusClass: "completed" },
};

function dueLabel(expectedBy) {
  if (!expectedBy) return "Today";
  const d = new Date(expectedBy);
  const start = (x) => { const t = new Date(x); t.setHours(0, 0, 0, 0); return t.getTime(); };
  const days = Math.round((start(d) - start(new Date())) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function toTask(c) {
  const view = STATUS_VIEW[c.status] || STATUS_VIEW.assigned;
  const priority = c.priority || "Medium";
  return {
    id: c.id,
    title: CATEGORY_TITLE[c.category] || "Civic Issue",
    description: c.description,
    image: assetUrl(c.photo) || BEFORE_IMAGE[c.category] || BEFORE_IMAGE.other,
    location: c.location,
    coords: c.coords ? [c.coords.lat, c.coords.lng] : null,
    priority,
    priorityClass: priority.toLowerCase(),
    ...view,
    time: dueLabel(c.expectedBy),
    completedAt: c.completedOn || null,
    note: c.note || "",
    // emergency flag from the citizen, the photo AI's severity, and the exact due time (the label above only has the day)
    isEmergency: Boolean(c.isEmergency),
    emergencyReason: c.emergencyReason || "",
    aiSeverity: c.aiSeverity ?? null,
    dueAt: c.expectedBy || null,
  };
}

let loaded = false;
let signature = "";

export const hasWorkerData = () => loaded;

/** Fetches this worker's tasks into the shared store. */
export async function loadWorkerData() {
  const res = await api("worker").get("/api/worker/tasks");
  if (!res.ok) return { ok: false, error: res.error };
  const next = res.data.map(toTask);
  const nextSignature = JSON.stringify([res.data.map((c) => [c.id, c.status, c.updatedAt, c.priority, c.isEmergency, c.expectedBy])]);
  TASKS.splice(0, TASKS.length, ...next);
  replaceUpdates(res.data);
  const changed = nextSignature !== signature;
  signature = nextSignature;
  loaded = true;
  return { ok: true, changed };
}

/** Called after a task changes locally so the next load doesn't re-render needlessly. */
export const markWorkerDataStale = () => { signature = ""; };
