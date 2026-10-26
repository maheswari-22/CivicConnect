import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import "../../../shared/severity.css";

/** "Due in 3h 20m" / "Overdue by 2h": ticks every 30 seconds. Shown for emergencies, late tasks and anything due within 12 hours. */
export function dueState(task, nowMs = Date.now()) {
  if (!task?.dueAt || task.status === "Completed") return null;
  const due = new Date(task.dueAt).getTime();
  if (Number.isNaN(due)) return null;
  const diff = due - nowMs;
  const fmt = (ms) => {
    const mins = Math.max(1, Math.round(Math.abs(ms) / 60000));
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${mins % 60}m`;
  };
  if (diff < 0) return { late: true, text: `Overdue by ${fmt(diff)}` };
  if (task.isEmergency || diff < 12 * 3600000) return { late: false, soon: diff < 3 * 3600000, text: `Due in ${fmt(diff)}` };
  return null;
}

export default function DueChip({ task }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  const state = dueState(task, now);
  if (!state) return null;
  return (
    <span className={`cc-due${state.late ? " cc-due--late" : state.soon ? " cc-due--soon" : ""}`}>
      <Clock3 size={12} aria-hidden="true" />
      {state.text}
    </span>
  );
}
