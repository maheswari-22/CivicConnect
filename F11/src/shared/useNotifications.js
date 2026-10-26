import { useCallback, useMemo, useSyncExternalStore } from "react";

/* ==========================================================================
   One notification hook for the Authority and Worker portals.

   Each portal passes a `build` function that turns its live data into a list
   of notifications:
     { key, title, text, icon, tone, date, timeLabel?, to, state? }
   `key` identifies the event (include the status in it, so a task or complaint
   that moves on shows up as unread again).

   The hook adds the read / unread state (saved in localStorage under
   `readKey`) and keeps every place that uses it in step: the sidebar badge,
   the dashboard bell and the Notifications page all update together, and a
   change made in another tab (a worker uploading a photo, say) is picked up
   within a few seconds.
   ========================================================================== */

const CHANGE_EVENT = "cc:notifications";
const POLL_MS = 5000;

const memory = {};

function readSet(readKey) {
  try {
    const raw = localStorage.getItem(readKey);
    if (raw) return new Set(JSON.parse(raw));
  } catch {
    /* corrupt or unavailable storage - use this session's copy */
  }
  return new Set(memory[readKey] || []);
}

function writeSet(readKey, set) {
  memory[readKey] = [...set];
  try {
    localStorage.setItem(readKey, JSON.stringify(memory[readKey]));
  } catch {
    /* storage full or blocked: read state lasts for this session only */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("focus", onChange);
  const timer = setInterval(onChange, POLL_MS);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("focus", onChange);
    clearInterval(timer);
  };
}

/** "Today", "Yesterday", "3 days ago" for a YYYY-MM-DD date. */
export function dayLabel(iso) {
  if (!iso) return "";
  const start = (value) => {
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const days = Math.round((start(new Date()) - start(`${iso}T00:00:00`)) / 86400000);
  if (Number.isNaN(days) || days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export default function useNotifications(readKey, build) {
  // A cheap fingerprint of what the list would show. React re-renders only
  // when it changes, so polling does not cause pointless renders.
  const signature = useSyncExternalStore(subscribe, () => {
    const read = readSet(readKey);
    return build()
      .map((n) => `${n.key}|${n.text}|${read.has(n.key) ? 1 : 0}`)
      .join("\n");
  });

  const items = useMemo(() => {
    const read = readSet(readKey);
    return build().map((n) => ({
      ...n,
      id: n.key,
      time: n.timeLabel || dayLabel(n.date),
      read: read.has(n.key),
    }));
    // `signature` is the trigger: it changes whenever the data or read state does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, readKey, build]);

  const unread = items.filter((n) => !n.read).length;

  const markRead = useCallback(
    (id) => {
      const next = readSet(readKey);
      if (next.has(id)) return;
      next.add(id);
      writeSet(readKey, next);
    },
    [readKey]
  );

  const markAllRead = useCallback(() => {
    const next = readSet(readKey);
    build().forEach((n) => next.add(n.key));
    writeSet(readKey, next);
  }, [readKey, build]);

  return { items, unread, markRead, markAllRead };
}
