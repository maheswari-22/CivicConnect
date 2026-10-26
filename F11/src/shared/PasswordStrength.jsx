import { Check, Circle } from "lucide-react";
import { PASSWORD_RULES, passwordScore } from "./validate";

const LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"];

/** Strength meter + live checklist shown under a "new password" field. */
export default function PasswordStrength({ password }) {
  if (!password) return null;
  const score = passwordScore(password);
  return (
    <div className="cc-strength" aria-live="polite">
      <div className="cc-strength__bar" data-score={score}>
        <span /><span /><span /><span />
        <em>{LABELS[score]}</em>
      </div>
      <ul className="cc-strength__rules">
        {PASSWORD_RULES.map((r) => {
          const ok = r.test(password);
          return (
            <li key={r.id} className={ok ? "is-ok" : ""}>
              {ok ? <Check size={13} aria-hidden="true" /> : <Circle size={13} aria-hidden="true" />}
              {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
