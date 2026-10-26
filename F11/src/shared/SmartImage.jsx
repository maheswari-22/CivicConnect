import { useCallback, useEffect, useRef, useState } from "react";
import "./smartImage.css";

const RETRY_DELAYS = [800, 2500, 6000]; // ms before each automatic retry

/** Adds a harmless cache-busting query so a half-loaded or failed response is not reused. */
const withRetry = (src, n) =>
  !n || !src || /^(data:|blob:)/.test(src) ? src : `${src}${src.includes("?") ? "&" : "?"}r=${n}`;

/**
 * A drop-in <img> for photos that come from the server. Same element, same props, so layouts stay
 * exactly as they are, but it
 *   - shows a soft shimmer until the picture arrives, then fades it in,
 *   - decodes off the main thread,
 *   - retries by itself (and again when the phone comes back online) if a load fails,
 *   - shows a tidy "photo unavailable" tile instead of a broken-image icon when it finally cannot load.
 */
export default function SmartImage({ src, alt = "", className = "", loading = "lazy", onLoad, onError, ...rest }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState("loading"); // loading | loaded | failed
  const timer = useRef(null);
  const attemptRef = useRef(0);

  useEffect(() => {
    attemptRef.current = 0;
    setAttempt(0);
    setState("loading");
    return () => clearTimeout(timer.current);
  }, [src]);

  const retry = useCallback(() => {
    clearTimeout(timer.current);
    attemptRef.current += 1;
    setAttempt(attemptRef.current);
    setState("loading");
  }, []);

  useEffect(() => {
    if (state !== "failed") return undefined;
    const onOnline = () => { attemptRef.current = 0; retry(); };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [state, retry]);

  const handleError = (e) => {
    const delay = RETRY_DELAYS[attemptRef.current];
    if (delay === undefined) {
      setState("failed");
      onError?.(e);
      return;
    }
    timer.current = setTimeout(retry, delay);
  };

  if (!src) return null;

  return (
    <img
      {...rest}
      src={withRetry(src, attempt)}
      alt={alt}
      loading={loading}
      decoding="async"
      className={`${className} cc-img cc-img--${state}`.trim()}
      onLoad={(e) => { setState("loaded"); onLoad?.(e); }}
      onError={handleError}
      data-failed={state === "failed" ? "true" : undefined}
    />
  );
}
