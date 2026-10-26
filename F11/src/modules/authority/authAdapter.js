import {
  authLogin, authRegister, authForgot, authChangePassword, authChangeEmail, authDeleteAccount, authUpdateProfile,
  clearSession, loadUser, saveUser, normalizeMobile,
} from "../../shared/api.js";

const ROLE = "authority";

const remember = (user) => {
  saveUser(ROLE, user);
  try {
    localStorage.setItem("civicAuthorityName", user.name);
    if (user.employeeId) localStorage.setItem("civicAuthorityId", user.employeeId);
  } catch { /* ignore */ }
};

/** Account logic for the Authority portal, plugged into the shared AuthPage. */
export const authorityAdapter = {
  async login({ identifier, password }) {
    const res = await authLogin(ROLE, { identifier, password });
    if (!res.ok) return { ok: false, error: res.error };
    remember(res.user);
    return { ok: true };
  },

  async signup({ name, employeeId, email, mobile, area, inviteCode, password }) {
    const res = await authRegister(ROLE, {
      name: name.trim(),
      employeeId: employeeId.trim(),
      email: email.trim(),
      phone: `+91${normalizeMobile(mobile)}`,
      area,
      inviteCode: inviteCode.trim(),
      password,
    });
    if (!res.ok) return { ok: false, error: res.error };
    remember(res.user);
    return { ok: true };
  },

  async forgot({ employeeId, email }) {
    const res = await authForgot(ROLE, { employeeId, email });
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true, message: res.data.message };
  },
};

/** The signed-in officer's cached profile (empty object when signed out). */
export const getAuthority = () => loadUser(ROLE) || {};

/** Display name for the signed-in officer. */
export function authorityName() {
  return getAuthority().name?.trim() || "Municipal Officer";
}

export function authorityLogout() {
  clearSession(ROLE);
  try {
    localStorage.removeItem("civicAuthorityName");
    localStorage.removeItem("civicAuthorityId");
  } catch { /* ignore */ }
}

/** Saves the officer's name / phone. `phone` is the bare 10-digit number. */
export async function authorityUpdateProfile({ name, email, phone }) {
  // The email is not sent here: changing it needs the password and a confirmation link (authorityChangeEmail).
  const res = await authUpdateProfile(ROLE, { name, phone: `+91${normalizeMobile(phone)}` });
  if (!res.ok) return { ok: false, message: res.error };
  remember(res.user);
  return { ok: true };
}

export async function authorityChangeEmail({ newEmail, currentPassword }) {
  const res = await authChangeEmail(ROLE, { newEmail, currentPassword });
  return res.ok ? { ok: true } : { ok: false, message: res.error };
}

export async function authorityChangePassword({ currentPassword, newPassword }) {
  const res = await authChangePassword(ROLE, { currentPassword, newPassword });
  return res.ok ? { ok: true } : { ok: false, message: res.error };
}

export async function authorityDeleteAccount({ password }) {
  const res = await authDeleteAccount(ROLE, { password });
  if (!res.ok) return { ok: false, message: res.error };
  authorityLogout();
  return { ok: true };
}
