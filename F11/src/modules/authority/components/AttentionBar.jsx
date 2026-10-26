import { useNavigate } from "react-router-dom";
import { TriangleAlert } from "lucide-react";
import { useAttention } from "../data/attention";
import "../../../shared/severity.css";

/** The red strip at the top of the busiest pages: stays until every emergency / overdue item has a worker. */
export default function AttentionBar() {
  const { items } = useAttention();
  const navigate = useNavigate();
  if (!items.length) return null;

  const emergencies = items.filter((i) => i.isEmergency);
  const first = emergencies[0] || items[0];
  const late = items.filter((i) => !i.isEmergency);
  const parts = [];
  if (emergencies.length) parts.push(`${emergencies.length} emergenc${emergencies.length > 1 ? "ies" : "y"}`);
  if (late.length) parts.push(`${late.length} overdue`);

  return (
    <section className={`cc-alert${emergencies.length ? "" : " cc-alert--soft"}`} role="alert" aria-live="assertive">
      <span className="cc-alert__icon" aria-hidden="true"><TriangleAlert size={22} /></span>
      <span className="cc-alert__text">
        <strong>{emergencies.length ? "Action needed now: " : "Needs action: "}{parts.join(" and ")}</strong>
        <span>{first.title} at {first.place ? `${first.place}, ` : ""}{first.location}{items.length > 1 ? ` and ${items.length - 1} more` : ""}.</span>
      </span>
      <button type="button" className="cc-alert__action" onClick={() => navigate(`/complaints/${first.id}`)}>Open {first.isEmergency ? "emergency" : "first"}</button>
    </section>
  );
}
