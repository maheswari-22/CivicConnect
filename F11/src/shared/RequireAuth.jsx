import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { authMe, clearSession, getToken, saveUser } from "./api.js";

/**
 * Route guard for a portal. Without a token the visitor goes back to that
 * portal's sign-in page; with one, the session is checked against the server
 * once so an expired or revoked login can't open the dashboard.
 */
export default function RequireAuth({ role, children }) {
  const [state, setState] = useState(getToken(role) ? "checking" : "denied");

  useEffect(() => {
    if (!getToken(role)) return undefined;
    let active = true;
    authMe(role).then((res) => {
      if (!active) return;
      if (res.ok && res.data.user.role === role) {
        saveUser(role, res.data.user);
        setState("ok");
      } else if (res.status === 0) {
        setState("ok"); // server unreachable: keep the cached session, API calls will show errors
      } else {
        clearSession(role);
        setState("denied");
      }
    });
    return () => { active = false; };
  }, [role]);

  if (state === "denied") return <Navigate to="/" replace />;
  if (state === "checking") return null;
  return children;
}
