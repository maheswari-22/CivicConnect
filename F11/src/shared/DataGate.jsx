import { useEffect, useRef, useState } from "react";

/**
 * Loads a portal's data from the API before its pages render.
 *
 * `load` fetches fresh data into the portal's store and resolves to
 *   { ok, changed, error }
 * The first visit waits for it; later visits render from the store straight
 * away, then re-render once if the server data turned out to be different.
 * Pages read the store synchronously, so this keeps them unchanged.
 */
export default function DataGate({ load, hasData, children, refreshMs = 0 }) {
  const [ready, setReady] = useState(() => hasData());
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const wasReady = useRef(ready);

  useEffect(() => {
    let active = true;
    load().then((res) => {
      if (!active) return;
      if (!res.ok) {
        if (!wasReady.current) setError(res.error || "Couldn't load your data.");
        return;
      }
      setError("");
      if (!wasReady.current) {
        wasReady.current = true;
        setReady(true);
      } else if (res.changed) {
        setVersion((v) => v + 1);
      }
    });
    return () => { active = false; };
  }, [load]);

  // Optional live refresh: re-fetch while the tab is visible (and once when it comes back into view),
  // so e.g. new worker photos appear without a manual reload. Only re-renders when the data changed.
  useEffect(() => {
    if (!refreshMs) return undefined;
    let active = true;
    let busy = false;
    let pending = false; // new data is in the store but not drawn yet (the person is typing)
    const isTyping = () => {
      const el = document.activeElement;
      return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
    };
    const refresh = async () => {
      if (busy || document.hidden || !wasReady.current) return;
      busy = true;
      try {
        const res = await load();
        if (!active || !res?.ok) return;
        if (res.changed) pending = true;
        // Never redraw the page under someone who is typing in a form; apply it on the next tick.
        if (pending && !isTyping()) {
          pending = false;
          setVersion((v) => v + 1);
        }
      } finally {
        busy = false;
      }
    };
    const timer = setInterval(refresh, refreshMs);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load, refreshMs]);

  if (!ready) {
    return (
      <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", textAlign: "center", padding: 24, color: "#6F5B55", fontFamily: "inherit" }}>
        {error ? (
          <div>
            <p style={{ marginBottom: 12 }}>{error}</p>
            <button type="button" onClick={() => window.location.reload()} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #E6D8B8", background: "#FFFBF2", color: "#560B18", cursor: "pointer" }}>
              Try again
            </button>
          </div>
        ) : (
          <p>Loading…</p>
        )}
      </div>
    );
  }

  return <div key={version} style={{ display: "contents" }}>{children}</div>;
}
