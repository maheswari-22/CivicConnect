import { useEffect, useState } from "react";
import { Check, X, UserRoundCheck, Mail, Phone, CalendarClock } from "lucide-react";
import Sidebar from "./Sidebar";
import { api } from "../../../shared/api.js";
import "./Workers.css";

const fmt = (iso) => {
  try { return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); } catch { return ""; }
};

/** Workers who signed up for this officer's area and are waiting to be approved. */
function Workers() {
  const [workers, setWorkers] = useState(null); // null = loading
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    let active = true;
    api("authority").get("/api/authority/workers/pending").then((res) => {
      if (!active) return;
      if (res.ok) setWorkers(res.data.workers);
      else { setWorkers([]); setError(res.error); }
    });
    return () => { active = false; };
  }, []);

  const decide = async (worker, action) => {
    if (action === "reject" && !window.confirm(`Decline ${worker.name}'s request? They will not be able to sign in.`)) return;
    setBusyId(worker.id);
    setMessage("");
    const res = await api("authority").post(`/api/authority/workers/${worker.id}/${action}`);
    setBusyId("");
    if (!res.ok) { setError(res.error); return; }
    setError("");
    setMessage(action === "approve" ? `${worker.name} is approved and can now sign in.` : `${worker.name}'s request was declined.`);
    setWorkers((list) => list.filter((w) => w.id !== worker.id));
  };

  return (
    <div className="workers-page">
      <Sidebar />
      <main className="workers-main">
        <section className="workers-header">
          <p>WORKER REQUESTS</p>
          <h1>Approve new workers</h1>
          <span>People who signed up as workers for your area. They can sign in and receive tasks only after you approve them.</span>
        </section>

        {message && <div className="workers-banner workers-banner--ok" role="status">{message}</div>}
        {error && <div className="workers-banner workers-banner--error" role="alert">{error}</div>}

        {workers === null && <p className="workers-empty">Loading…</p>}
        {workers && workers.length === 0 && !error && (
          <div className="workers-empty">
            <UserRoundCheck size={28} aria-hidden="true" />
            <strong>No pending requests</strong>
            <span>New worker sign-ups for your area will appear here.</span>
          </div>
        )}

        <ul className="workers-list">
          {(workers || []).map((w) => (
            <li className="workers-card" key={w.id}>
              <div className="workers-card__who">
                <strong>{w.name}</strong>
                <span>@{w.username} · {w.area}</span>
                <ul>
                  {w.email && <li><Mail size={14} aria-hidden="true" /> {w.email}{w.emailVerified ? "" : " (not confirmed)"}</li>}
                  {w.phone && <li><Phone size={14} aria-hidden="true" /> {w.phone}</li>}
                  <li><CalendarClock size={14} aria-hidden="true" /> Requested {fmt(w.requestedAt)}</li>
                </ul>
              </div>
              <div className="workers-card__actions">
                <button type="button" className="workers-btn workers-btn--ok" disabled={busyId === w.id} onClick={() => decide(w, "approve")}>
                  <Check size={16} aria-hidden="true" /> Approve
                </button>
                <button type="button" className="workers-btn workers-btn--no" disabled={busyId === w.id} onClick={() => decide(w, "reject")}>
                  <X size={16} aria-hidden="true" /> Decline
                </button>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

export default Workers;
