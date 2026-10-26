import { useNavigate } from "react-router-dom";
import { TriangleAlert } from "lucide-react";
import { TASKS } from "../data/tasks.js";
import { dueState } from "./DueChip.jsx";
import "../../../shared/severity.css";

/** Red strip for the worker: every open emergency, and every task that is past its due time. */
export default function EmergencyTasksBar() {
  const navigate = useNavigate();
  const open = TASKS.filter((t) => t.status !== "Completed");
  const emergencies = open.filter((t) => t.isEmergency);
  const late = open.filter((t) => !t.isEmergency && dueState(t)?.late);
  if (!emergencies.length && !late.length) return null;

  const first = emergencies[0] || late[0];
  const headline = emergencies.length
    ? `${emergencies.length} emergency task${emergencies.length > 1 ? "s" : ""} - finish as soon as possible`
    : `${late.length} task${late.length > 1 ? "s are" : " is"} overdue`;

  return (
    <section className={`cc-alert${emergencies.length ? "" : " cc-alert--soft"}`} role="alert" aria-live="assertive">
      <span className="cc-alert__icon" aria-hidden="true"><TriangleAlert size={22} /></span>
      <span className="cc-alert__text">
        <strong>{headline}</strong>
        <span>{first.title} at {first.location}{first.emergencyReason ? ` - ${first.emergencyReason}` : ""}.</span>
      </span>
      <button type="button" className="cc-alert__action" onClick={() => navigate("/task-details", { state: { task: first } })}>
        {first.status === "In Progress" ? "Continue" : "Start now"}
      </button>
    </section>
  );
}
