import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TriangleAlert, X } from "lucide-react";
import { useAttention, refreshAttention } from "../data/attention";
import { waitingLabel } from "../data/complaints";
import EmergencyBadge from "../../../shared/EmergencyBadge";
import "./AttentionCenter.css";

/* ==========================================================================
   The loud part of the alert system. Mounted once for the whole Authority portal.

   - A pop-up opens when an emergency / overdue item the officer has not been told about yet appears,
     or when the server chases the same item again (its reminder level goes up).
   - A short alarm tone and a vibration go with it (browsers only allow sound after the first tap or key press).
   - While the tab is in the background the tab title flashes "(!) 2 need action".
   - Dismissing the pop-up does not hide the red bar on the pages: that stays until the work is assigned.
   ========================================================================== */

// What this officer has already been told about. Kept per officer, so two officers sharing a computer never hide alerts from each other.
const seenKey = (owner) => `civicconnect.attention.seen.${owner}`;
const readSeen = (owner) => { try { return new Set(JSON.parse(sessionStorage.getItem(seenKey(owner))) || []); } catch { return new Set(); } };
const writeSeen = (owner, set) => { try { sessionStorage.setItem(seenKey(owner), JSON.stringify([...set])); } catch { /* ignore */ } };
const keyOf = (item) => `${item.id}:${item.kind}:${item.level}`;

let audio = null;
let unlocked = false;
if (typeof window !== "undefined") {
  const unlock = () => { unlocked = true; window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

/** Two short rising beeps. Silent when the browser has not allowed audio yet. */
function alarm() {
  try {
    // Browsers refuse to vibrate until the visitor has interacted with the page; asking early only logs an error.
    if (navigator.vibrate && navigator.userActivation?.hasBeenActive !== false) navigator.vibrate([220, 120, 220]);
    if (!unlocked) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio ||= new Ctx();
    if (audio.state === "suspended") audio.resume();
    [0, 0.28].forEach((offset, i) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "square";
      osc.frequency.value = i ? 988 : 784;
      gain.gain.setValueAtTime(0.0001, audio.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.12, audio.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + offset + 0.22);
      osc.connect(gain).connect(audio.destination);
      osc.start(audio.currentTime + offset);
      osc.stop(audio.currentTime + offset + 0.24);
    });
  } catch { /* sound is a bonus, never an error */ }
}

const kindText = (item) => {
  if (item.kind === "emergency") return "EMERGENCY - no worker yet";
  if (item.kind === "work") return item.isEmergency ? `Emergency work late${item.workerName ? ` (${item.workerName})` : ""}` : `Work overdue${item.workerName ? ` (${item.workerName})` : ""}`;
  return `No worker for ${waitingLabel(item.waitedHours)}`;
};

export default function AttentionCenter() {
  const { items, loaded, owner } = useAttention();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [popup, setPopup] = useState([]);
  const dialogRef = useRef(null);
  const returnFocus = useRef(null);
  const signedPage = pathname !== "/" && pathname !== "/welcome";

  // Fresh data on every page change: this is also what picks up a sign-in, a sign-out or a different officer straight away.
  useEffect(() => { refreshAttention(); }, [pathname]);

  // Open the pop-up for anything new (or chased again). The state is set from a timer callback, never during render.
  useEffect(() => {
    if (!loaded || !signedPage || !owner) return undefined;
    const seen = readSeen(owner);
    const fresh = items.filter((i) => !seen.has(keyOf(i)));
    if (!fresh.length) return undefined;
    const id = setTimeout(() => { returnFocus.current = document.activeElement; setPopup(fresh.slice(0, 4)); alarm(); }, 0);
    return () => clearTimeout(id);
  }, [items, loaded, signedPage, owner]);

  // Flash the tab title while the officer is on another tab.
  useEffect(() => {
    if (!items.length || !signedPage) return undefined;
    const original = document.title.replace(/^\(!\) \d+ need action · /, "");
    let on = false;
    const id = setInterval(() => {
      on = !on;
      document.title = on && document.hidden ? `(!) ${items.length} need action · ${original}` : original;
    }, 1100);
    return () => { clearInterval(id); document.title = original; };
  }, [items.length, signedPage]);

  const close = () => {
    const seen = readSeen(owner);
    popup.forEach((i) => seen.add(keyOf(i)));
    writeSeen(owner, seen);
    setPopup([]);
    returnFocus.current?.focus?.();   // give the keyboard back to where it was
  };

  // Keep Tab inside the dialog while it is open.
  const trapTab = (e) => {
    if (e.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll("button, [href], input, [tabindex]:not([tabindex='-1'])");
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  useEffect(() => {
    if (!popup.length) return undefined;
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popup]);

  if (!popup.length || !signedPage) return null;
  const hasEmergency = popup.some((i) => i.isEmergency);
  const open = (item) => { close(); navigate(`/complaints/${item.id}`); };

  return (
    <div className="cc-attn" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="cc-attn__dialog" role="alertdialog" aria-modal="true" aria-labelledby="cc-attn-title" aria-describedby="cc-attn-lead" tabIndex={-1} ref={dialogRef} onKeyDown={trapTab}>
        <button type="button" className="cc-attn__close" onClick={close} aria-label="Dismiss"><X size={18} /></button>
        <div className="cc-attn__icon" aria-hidden="true"><TriangleAlert size={30} /></div>
        <h2 id="cc-attn-title">{hasEmergency ? "Emergency needs action now" : "Complaints need your action"}</h2>
        <p className="cc-attn__lead" id="cc-attn-lead">
          {popup.length === 1 ? "This item is waiting for you." : `${popup.length} items are waiting for you.`} Assign a worker so work can start.
        </p>
        <ul className="cc-attn__list">
          {popup.map((item) => (
            <li key={keyOf(item)}>
              <button type="button" onClick={() => open(item)}>
                <span className="cc-attn__row">
                  <strong>{item.title}</strong>
                  {item.isEmergency && <EmergencyBadge size={12} />}
                </span>
                <small>{item.id} · {item.place ? `${item.place}, ` : ""}{item.location}</small>
                <span className="cc-attn__state">{kindText(item)}{item.severity != null ? ` · AI severity ${item.severity}%` : ""}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="cc-attn__actions">
          <button type="button" className="cc-attn__primary" onClick={() => open(popup[0])}>Open now</button>
          <button type="button" className="cc-attn__ghost" onClick={close}>Remind me later</button>
        </div>
      </div>
    </div>
  );
}
