import { levelFor, LEVEL_LABEL } from "./severity.js";
import "./severity.css";

/** The AI's 0-100 severity estimate as an animated meter. `compact` is the one-line version for cards and lists. */
export default function SeverityMeter({ score, level, compact = false, label = "AI severity" }) {
  if (score == null) return null;
  const lvl = level || levelFor(score);
  return (
    <div
      className={`cc-sev cc-sev--${lvl}${compact ? " cc-sev--compact" : ""}`}
      style={{ "--pct": `${score}%` }}
      role="img"
      aria-label={`${label}: ${score} percent, ${LEVEL_LABEL[lvl]}`}
    >
      <div className="cc-sev__top">
        <span className="cc-sev__label">{label}</span>
        <strong className="cc-sev__num">{score}%</strong>
        {!compact && <span className="cc-sev__level">{LEVEL_LABEL[lvl]}</span>}
      </div>
      <div className="cc-sev__track"><span className="cc-sev__fill" /></div>
    </div>
  );
}
