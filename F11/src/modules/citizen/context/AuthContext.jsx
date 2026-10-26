import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  authLogin, authRegister, authMe, authChangePassword, authChangeEmail, authDeleteAccount, authLogout,
  getToken, saveUser, loadUser, clearSession, normalizeMobile, request,
} from '../../../shared/api.js';

const AuthContext = createContext(null);

/* Backend user -> the shape the Citizen pages use (mobile, email, location). */
const toCitizen = (u) => ({
  id: u.id,
  name: u.name,
  mobile: u.mobile || u.phone || '',
  email: u.email || '',
  location: u.area || '',
  avatar: null,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const cached = getToken('citizen') ? loadUser('citizen') : null;
    return cached ? toCitizen(cached) : null;
  });
  const [isReady, setIsReady] = useState(!getToken('citizen'));

  // Confirm a saved session with the server before trusting it.
  useEffect(() => {
    if (!getToken('citizen')) { setIsReady(true); return undefined; }
    let active = true;
    authMe('citizen').then((res) => {
      if (!active) return;
      if (res.ok && res.data.user.role === 'citizen') {
        saveUser('citizen', res.data.user);
        setUser(toCitizen(res.data.user));
      } else if (res.status !== 0) {
        clearSession('citizen');
        setUser(null);
      }
      setIsReady(true);
    });
    return () => { active = false; };
  }, []);

  const login = useCallback(async ({ identifier, password }) => {
    const res = await authLogin('citizen', { identifier, password });
    if (!res.ok) throw new Error(res.error);
    saveUser('citizen', res.user);
    const next = toCitizen(res.user);
    setUser(next);
    return next;
  }, []);

  const register = useCallback(async ({ name, mobile, email, password }) => {
    const res = await authRegister('citizen', {
      name: name.trim(),
      mobile: `+91${normalizeMobile(mobile)}`,
      email: email.trim(),
      password,
    });
    if (!res.ok) throw new Error(res.error);
    saveUser('citizen', res.user);
    const next = toCitizen(res.user);
    setUser(next);
    return next;
  }, []);

  // Name and location are saved on the server (the email has its own flow: changeEmail); the mobile number is the
  // login id, so it stays read-only here.
  const updateProfile = useCallback(async (patch) => {
    const body = {};
    if (patch.name?.trim()) body.name = patch.name.trim();
    if (patch.location?.trim()) body.area = patch.location.trim();
    if (!Object.keys(body).length) return { ok: true };
    const res = await request('citizen', 'PATCH', '/api/auth/profile', { body });
    if (!res.ok) return { ok: false, message: res.error };
    saveUser('citizen', res.data.user);
    setUser(toCitizen(res.data.user));
    return { ok: true };
  }, []);

  // The email needs the current password and a link sent to the new address; nothing changes until it is opened.
  const changeEmail = useCallback(async ({ newEmail, currentPassword }) => {
    const res = await authChangeEmail('citizen', { newEmail, currentPassword });
    return res.ok ? { ok: true } : { ok: false, message: res.error };
  }, []);

  const changePassword = useCallback(async ({ currentPassword, newPassword }) => {
    const res = await authChangePassword('citizen', { currentPassword, newPassword });
    return res.ok
      ? { ok: true, message: 'Password updated successfully.' }
      : { ok: false, message: res.error };
  }, []);

  const deleteAccount = useCallback(async ({ password }) => {
    const res = await authDeleteAccount('citizen', { password });
    if (!res.ok) return { ok: false, message: res.error };
    clearSession('citizen');
    setUser(null);
    return { ok: true, message: 'Account deleted.' };
  }, []);

  const logout = useCallback(() => {
    authLogout('citizen');
    clearSession('citizen');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isReady, login, register, logout, updateProfile, changeEmail, changePassword, deleteAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
