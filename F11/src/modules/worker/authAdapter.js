import {
  authLogin, authRegister, authForgot, authChangePassword, authChangeEmail, authUpdateProfile, authDeleteAccount,
  clearSession, loadUser, saveUser, normalizeMobile,
} from "../../shared/api.js";

const ROLE = "worker";

export const DEFAULT_WORKER = {
  name: "Municipal Worker",
  username: "",
  email: "",
  phone: "",
  area: "",
  workerId: "",
  department: "Municipal Services",
};

/* Backend user -> the profile shape the Worker pages already use. */
const toWorker = (u) => ({
  name: u.name,
  username: u.username || "",
  email: u.email || "",
  phone: u.phone || "",
  area: u.area || "",
  workerId: u.workerId || "",
  department: u.department || "Municipal Services",
});

const remember = (user) => {
  const w = toWorker(user);
  saveUser(ROLE, user);
  try { localStorage.setItem("workerAccount", JSON.stringify(w)); } catch { /* ignore */ }
};

/** Account logic for the Worker portal, plugged into the shared AuthPage. */
export const workerAdapter = {
  async login({ identifier, password }) {
    const res = await authLogin(ROLE, { identifier, password });
    if (!res.ok) return { ok: false, error: res.error };
    remember(res.user);
    return { ok: true };
  },

  async signup({ name, username, email, phone, area, password }) {
    const res = await authRegister(ROLE, {
      name: name.trim(),
      username: username.trim(),
      email: email.trim(),
      phone: `+91${normalizeMobile(phone)}`,
      area: area.trim(),
      password,
    });
    if (!res.ok) return { ok: false, error: res.error };
    // A new worker has to be approved by the authority of the area before signing in.
    if (res.pending) return { ok: true, pending: true, message: res.message };
    remember(res.user);
    return { ok: true };
  },

  async forgot({ identifier }) {
    const res = await authForgot(ROLE, { identifier });
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true, message: res.data.message };
  },
};

export function getWorker() {
  const u = loadUser(ROLE);
  return u ? toWorker(u) : { ...DEFAULT_WORKER };
}

export function workerLogout() {
  clearSession(ROLE);
  try { localStorage.removeItem("workerAccount"); } catch { /* ignore */ }
}

/** Saves the worker's name / phone. `phone` is the bare 10-digit number. */
export async function workerUpdateProfile({ name, email, phone }) {
  // The email is not sent here: changing it needs the password and a confirmation link (workerChangeEmail).
  const res = await authUpdateProfile(ROLE, { name, phone: `+91${normalizeMobile(phone)}` });
  if (!res.ok) return { ok: false, message: res.error };
  remember(res.user);
  return { ok: true };
}

export async function workerChangeEmail({ newEmail, currentPassword }) {
  const res = await authChangeEmail(ROLE, { newEmail, currentPassword });
  return res.ok ? { ok: true } : { ok: false, message: res.error };
}

export async function workerChangePassword({ currentPassword, newPassword }) {
  const res = await authChangePassword(ROLE, { currentPassword, newPassword });
  return res.ok ? { ok: true } : { ok: false, message: res.error };
}

export async function workerDeleteAccount({ password }) {
  const res = await authDeleteAccount(ROLE, { password });
  if (!res.ok) return { ok: false, message: res.error };
  workerLogout();
  return { ok: true };
}
