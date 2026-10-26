import { ClipboardList, Clock, UserCheck, CircleCheck, AlertTriangle } from "lucide-react";
import { getComplaints, hoursWaiting, waitingLabel, isOverdue } from "./complaints";

/* localStorage key for which authority notifications have been read. */
export const AUTHORITY_READ_KEY = "civicAuthorityNotificationsRead";

const MAX_NOTIFICATIONS = 30;

/* One notification per complaint, worded by its current status. The key
   includes the status, so a complaint that moves on becomes unread again. */
const WORDING = {
  New: (c) => {
    const waited = hoursWaiting(c);
    // Overdue: still no worker after its limit (1 h for an emergency, 2 h when severe, 4 h otherwise).
    // A separate key makes it unread again at that moment.
    if (isOverdue(c)) {
      return {
        key: `${c.id}:New:overdue`,
        title: c.isEmergency ? "EMERGENCY still has no worker" : "No worker assigned yet",
        text: `${c.title} at ${c.ward} has waited ${waitingLabel(waited)} for a worker.${c.isEmergency ? " The citizen marked it as an emergency." : ""} Assign one now.`,
        icon: AlertTriangle,
        tone: "red",
        date: c.reportedOn,
        urgent: true,
      };
    }
    if (c.isEmergency) {
      return {
        key: `${c.id}:New:emergency`,
        title: "EMERGENCY reported",
        text: `${c.title} at ${c.ward}${c.emergencyReason ? `: ${c.emergencyReason}` : ""}. Assign a worker now.`,
        icon: AlertTriangle,
        tone: "red",
        date: c.reportedOn,
        urgent: true,
      };
    }
    return {
      title: "New complaint reported",
      text: `${c.title} at ${c.ward}.${c.aiSeverity != null ? ` AI severity ${c.aiSeverity}%.` : ""} Assign a worker.`,
      icon: ClipboardList,
      tone: "gold",
      date: c.reportedOn,
    };
  },
  Pending: (c) => ({
    title: "Worker assigned",
    text: `${c.title} is waiting for the worker to start.`,
    icon: Clock,
    tone: "blue",
    date: c.assignedOn || c.reportedOn,
  }),
  "In Progress": (c) => ({
    title: "Work in progress",
    text: `${c.title} is ${c.progress}% complete.`,
    icon: UserCheck,
    tone: "blue",
    date: c.progressPhotos?.[c.progressPhotos.length - 1]?.at || c.assignedOn || c.reportedOn,
  }),
  Completed: (c) => ({
    title: "Complaint resolved",
    text: `${c.title} at ${c.ward} was completed.`,
    icon: CircleCheck,
    tone: "green",
    date: c.completedOn || c.assignedOn || c.reportedOn,
  }),
};

export function buildAuthorityNotifications() {
  return getComplaints()
    .filter((c) => WORDING[c.status])
    .map((c) => ({
      key: `${c.id}:${c.status}`,
      to: `/complaints/${c.id}`,
      ...WORDING[c.status](c),
    }))
    // Overdue (unassigned) complaints always come first, then newest first.
    .sort((a, b) => Number(Boolean(b.urgent)) - Number(Boolean(a.urgent)) || String(b.date).localeCompare(String(a.date)))
    .slice(0, MAX_NOTIFICATIONS);
}
