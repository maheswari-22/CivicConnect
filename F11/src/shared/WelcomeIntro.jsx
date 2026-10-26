import { useEffect } from "react";
import { ROLES } from "./roles";
import "./welcome.css";

const LOGO = "/civic-logo.png";
const DURATION_MS = 4200;

/**
 * The post-login welcome screen — one design for every portal.
 * Calls `onDone` after the animation (or immediately when clicked).
 */
export default function WelcomeIntro({ role, onDone }) {
  const cfg = ROLES[role];
  const Icon = cfg.Icon;
  const text = `Welcome, ${cfg.title}!`;

  useEffect(() => {
    const timer = setTimeout(onDone, DURATION_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <main className="cc-welcome" onClick={onDone} aria-live="polite">
      <span className="cc-welcome__glow cc-welcome__glow--one" aria-hidden="true" />
      <span className="cc-welcome__glow cc-welcome__glow--two" aria-hidden="true" />

      <div className="cc-welcome__card">
        <span className="cc-welcome__ring">
          <img src={LOGO} alt="CivicConnect" />
        </span>

        <span className="cc-welcome__badge">
          <Icon size={15} aria-hidden="true" />
          {cfg.portal}
        </span>

        <h1 aria-label={text}>
          {text.split("").map((ch, i) => (
            <span
              key={i}
              className="cc-welcome__letter"
              style={{ animationDelay: `${i * 0.06}s` }}
              aria-hidden="true"
            >
              {ch === " " ? "\u00A0" : ch}
            </span>
          ))}
        </h1>

        <p>{cfg.welcome}</p>

        <div className="cc-welcome__line">
          <span />
          CivicConnect {cfg.title} Module
          <span />
        </div>

        <div className="cc-welcome__loader" role="status" aria-label="Loading">
          <span />
          <span />
          <span />
        </div>

        <small>Tap anywhere to continue</small>
      </div>
    </main>
  );
}
