/* ==========================================================================
   CivicConnect API client — one place that talks to the Express backend.

   - Base URL comes from VITE_API_URL (default http://localhost:4000).
   - Each portal keeps its own JWT, so the three portals never share a login.
   - Every call resolves to { ok, data, error } and never throws.
   ========================================================================== */

export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");

const TOKEN_KEY = (role) => `civicconnect.token.${role}`;

export const getToken = (role) => {
  try { return localStorage.getItem(TOKEN_KEY(role)); } catch { return null; }
};
export const setToken = (role, token) => {
  try { token ? localStorage.setItem(TOKEN_KEY(role), token) : localStorage.removeItem(TOKEN_KEY(role)); } catch { /* ignore */ }
  // Lets listeners (the authority's alert store) react to a sign-in or sign-out in this tab at once.
  try { window.dispatchEvent(new Event("civicconnect:auth")); } catch { /* not in a browser */ }
};

/** Turns a backend "/uploads/x.jpg" path into a full URL the browser can load. */
export const assetUrl = (path) => (!path ? null : /^(https?:|data:|blob:)/.test(path) ? path : `${API_URL}${path}`);

/** Normalises a mobile number to its bare 10 digits (drops +91, spaces, dashes). */
export const normalizeMobile = (v) => String(v || "").replace(/[\s-]/g, "").replace(/^\+?91/, "");

/** Login identifiers: mobile numbers are normalised, emails / usernames are left alone. */
export const normalizeIdentifier = (v) => {
  const t = String(v || "").trim();
  return t.includes("@") || /[a-zA-Z]/.test(t) ? t : normalizeMobile(t);
};

export async function request(role, method, path, { body, form, query } = {}) {
  const qs = query ? "?" + new URLSearchParams(Object.entries(query).filter(([, v]) => v != null && v !== "")).toString() : "";
  const headers = {};
  const token = getToken(role);
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }

  try {
    const res = await fetch(`${API_URL}${path}${qs}`, { method, headers, body: payload });
    const json = await res.json().catch(() => ({}));
    if (res.status === 401 && token && !path.startsWith("/api/auth/")) setToken(role, null);
    if (!res.ok || json.ok === false) {
      return { ok: false, status: res.status, error: friendlyError(json, res.status) };
    }
    return { ok: true, status: res.status, data: json.data };
  } catch {
    return { ok: false, status: 0, error: "Can't reach the server. Check that the backend is running." };
  }
}

function friendlyError(json, status) {
  if (status === 413 && !json?.error) return "That photo is too large to upload. Please choose a smaller one.";
  if (Array.isArray(json?.details) && json.details.length) {
    return json.details.map((d) => d.message).filter(Boolean).join(", ") || "Please check the details and try again.";
  }
  const e = json?.error;
  if (Array.isArray(e)) return e.map((x) => x.message || x).join(", ");
  if (e && typeof e === "object") return e.message || "Something went wrong.";
  if (typeof e === "string") return e;
  return json?.message || (status === 401 ? "Please sign in again." : "Something went wrong. Please try again.");
}

export const api = (role) => ({
  get: (p, query) => request(role, "GET", p, { query }),
  post: (p, body) => request(role, "POST", p, { body }),
  patch: (p, body) => request(role, "PATCH", p, { body }),
  del: (p, body) => request(role, "DELETE", p, { body }),
  upload: (p, form) => request(role, "POST", p, { form }),
});

/* ----------------------------------------------------------- auth helpers */

export async function authLogin(role, { identifier, password }) {
  const res = await request(role, "POST", "/api/auth/login", {
    body: { identifier: normalizeIdentifier(identifier), password, role },
  });
  if (!res.ok) return res;
  if (res.data.user.role !== role) {
    return { ok: false, error: `This account is registered as ${res.data.user.role}. Please use the ${res.data.user.role} portal.` };
  }
  setToken(role, res.data.token);
  return { ok: true, user: res.data.user };
}

export async function authRegister(role, body) {
  const res = await request(role, "POST", `/api/auth/register/${role}`, { body });
  if (!res.ok) return res;
  // Worker accounts must be approved by an authority first: there is no session yet.
  if (res.data?.pendingApproval) return { ok: true, pending: true, message: res.data.message };
  setToken(role, res.data.token);
  return { ok: true, user: res.data.user };
}

export const authMe = (role) => request(role, "GET", "/api/auth/me");
/** Tells the server to stop accepting this token (fire-and-forget; the local token is dropped either way). */
const revokeToken = (role) => {
  const token = getToken(role);
  if (!token) return;
  try {
    fetch(`${API_URL}/api/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, keepalive: true }).catch(() => {});
  } catch { /* ignore */ }
};
export const authLogout = (role) => { revokeToken(role); setToken(role, null); };
export async function authChangePassword(role, body) {
  const res = await request(role, "POST", "/api/auth/change-password", { body });
  // Changing the password signs other devices out; keep this one signed in with the fresh token.
  if (res.ok && res.data?.token) setToken(role, res.data.token);
  return res;
}
export const authDeleteAccount = async (role, body) => {
  const res = await request(role, "DELETE", "/api/auth/account", { body });
  if (res.ok) setToken(role, null);
  return res;
};

/** Saves name / email / phone on the server and refreshes the cached profile. */
export async function authUpdateProfile(role, body) {
  const res = await request(role, "PATCH", "/api/auth/profile", { body });
  if (!res.ok) return res;
  saveUser(role, res.data.user);
  return { ok: true, user: res.data.user };
}

/** Step 1 of changing the e-mail: the server mails a link to the NEW address; nothing changes until it is opened. */
export const authChangeEmail = (role, { newEmail, currentPassword }) =>
  request(role, "POST", "/api/auth/change-email", { body: { newEmail, currentPassword } });

export const authForgot = (role, body) => request(role, "POST", "/api/auth/forgot-password", { body: { role, ...body } });
export const authResetPassword = (role, { token, newPassword }) =>
  request(role, "POST", "/api/auth/reset-password", { body: { role, token, newPassword } });

/* ------------------------------------------------- cached profile (sync UI) */

const USER_KEY = (role) => `civicconnect.user.${role}`;
export const saveUser = (role, user) => {
  try { localStorage.setItem(USER_KEY(role), JSON.stringify(user)); } catch { /* ignore */ }
};
export const loadUser = (role) => {
  try { return JSON.parse(localStorage.getItem(USER_KEY(role))) || null; } catch { return null; }
};
export const clearSession = (role) => {
  revokeToken(role);
  setToken(role, null);
  try { localStorage.removeItem(USER_KEY(role)); } catch { /* ignore */ }
};
