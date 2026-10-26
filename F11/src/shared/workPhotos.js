/* ==========================================================================
   Worker task updates — status and photos for the tasks assigned to the
   signed-in worker, kept in a small in-memory store that is filled from the
   API (see worker/data/tasks.js) and written through the API.

   An "update" has the same shape the Worker pages have always used:
     {
       status: "In Progress" | "Completed",
       startedOn, completedOn: "YYYY-MM-DD",
       progressPhotos: [{ id, src, caption, at: "YYYY-MM-DD" }],
       completionPhoto: { src, at } | null
     }
   Tasks are keyed by complaint id. Every write is async and resolves to
   { ok, update, error?, full? }.
   ========================================================================== */

import { api, assetUrl } from "./api.js";

export const MAX_PROGRESS_PHOTOS = 4;

const http = api("worker");
const updates = new Map();

/* ------------------------------------------------------------------ utils */

export function isoToday() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

const day = (iso) => (iso ? String(iso).slice(0, 10) : isoToday());

/* ------------------------------------------------------- API <-> store sync */

/** Turns a backend complaint (a task for this worker) into an "update". */
export function updateFromApi(c) {
  if (c.status === "assigned") return null;
  const progressPhotos = (c.workPhotos?.progress || []).map((p) => ({
    id: p.id,
    src: assetUrl(p.url),
    caption: p.caption || "Work in progress",
    at: day(p.createdAt),
  }));
  const done = c.workPhotos?.completion;
  return {
    status: c.status === "resolved" ? "Completed" : "In Progress",
    startedOn: day(c.assignedOn || c.updatedAt),
    completedOn: c.status === "resolved" ? day(c.completedOn || c.updatedAt) : null,
    progressPhotos,
    completionPhoto: done ? { src: assetUrl(done.url), at: day(done.createdAt) } : null,
  };
}

export function replaceUpdates(complaints) {
  updates.clear();
  complaints.forEach((c) => {
    const u = updateFromApi(c);
    if (u) updates.set(c.id, u);
  });
}

function applyComplaint(c) {
  const update = updateFromApi(c);
  if (update) updates.set(c.id, update);
  else updates.delete(c.id);
  return update;
}

/* ------------------------------------------------------------------ reads */

export function getTaskUpdate(taskId) {
  return updates.get(taskId) || null;
}

/* ----------------------------------------------------------------- writes */

async function write(taskId, call) {
  const res = await call();
  if (!res.ok) {
    return {
      ok: false,
      update: getTaskUpdate(taskId),
      full: /maximum of \d+ progress/i.test(res.error || ""),
      error: res.error,
    };
  }
  return { ok: true, update: applyComplaint(res.data) };
}

export const startTask = (taskId) =>
  write(taskId, () => http.post(`/api/worker/tasks/${encodeURIComponent(taskId)}/start`));

export async function addProgressPhoto(taskId, { photo, caption }) {
  if ((getTaskUpdate(taskId)?.progressPhotos.length || 0) >= MAX_PROGRESS_PHOTOS) {
    return { ok: false, update: getTaskUpdate(taskId), full: true };
  }
  const form = new FormData();
  form.append("photo", photo, photo.name || "progress.jpg");
  form.append("caption", (caption || "").trim().slice(0, 80) || "Work in progress");
  return write(taskId, () => http.upload(`/api/worker/tasks/${encodeURIComponent(taskId)}/progress-photo`, form));
}

export const removeProgressPhoto = (taskId, photoId) =>
  write(taskId, () =>
    http.del(`/api/worker/tasks/${encodeURIComponent(taskId)}/progress-photo/${encodeURIComponent(photoId)}`)
  );

export async function setCompletionPhoto(taskId, photo) {
  const form = new FormData();
  form.append("photo", photo, photo.name || "completion.jpg");
  return write(taskId, () => http.upload(`/api/worker/tasks/${encodeURIComponent(taskId)}/completion-photo`, form));
}

export const completeTask = (taskId) =>
  write(taskId, () => http.post(`/api/worker/tasks/${encodeURIComponent(taskId)}/complete`));
