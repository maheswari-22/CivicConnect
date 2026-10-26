import { AlertTriangle, Bell, CheckCircle2, ClipboardList, Clock3 } from "lucide-react";
import { getTaskUpdate, isoToday } from "../../../shared/workPhotos.js";
import { TASKS } from "./tasks.js";

/* localStorage key for which worker notifications have been read. */
export const WORKER_READ_KEY = "civicWorkerNotificationsRead";

/* Built from the worker's tasks and the shared work store, so it reacts as the
   worker starts, photographs and completes a job. The key includes the task's
   state, so a task that moves on is unread again. */
export function buildWorkerNotifications() {
  const today = isoToday();
  const items = [];
  let waiting = 0;

  TASKS.forEach((task) => {
    const update = getTaskUpdate(task.id);
    const where = `${task.title} at ${task.location}`;

    if (update?.status === "Completed") {
      items.push({
        key: `task-${task.id}:completed`,
        title: "Task completed",
        text: `${where} is marked completed. Well done!`,
        icon: CheckCircle2,
        tone: "green",
        date: update.completedOn || today,
        to: "/history",
      });
    } else if (update?.status === "In Progress") {
      const photos = update.progressPhotos?.length || 0;
      items.push({
        key: `task-${task.id}:progress`,
        title: "Task in progress",
        text: `${where} is under way${photos ? ` (${photos} progress photo${photos > 1 ? "s" : ""} added)` : ""}.`,
        icon: Clock3,
        tone: "blue",
        date: update.startedOn || today,
        to: "/task-details",
        state: { task },
      });
    } else {
      waiting += 1;
      items.push({
        key: `task-${task.id}:assigned${task.isEmergency ? ":emergency" : ""}`,
        title: task.isEmergency ? "EMERGENCY task assigned" : "New task assigned",
        text: task.isEmergency
          ? `${where} is an EMERGENCY${task.emergencyReason ? ` (${task.emergencyReason})` : ""}. Start now and finish it today.`
          : `${where} has been assigned to you (${task.priority} priority).`,
        icon: task.isEmergency ? AlertTriangle : ClipboardList,
        tone: task.isEmergency ? "red" : "gold",
        urgent: task.isEmergency,
        date: today,
        timeLabel: task.time === "Tomorrow" ? "Due tomorrow" : "Due today",
        to: "/task-details",
        state: { task },
      });
    }
  });

  if (waiting > 0) {
    items.push({
      key: `reminder:${waiting}`,
      title: "Reminder",
      text: `You have ${waiting} task${waiting > 1 ? "s" : ""} waiting to be started.`,
      icon: Bell,
      tone: "wine",
      date: today,
      to: "/assigned-tasks",
    });
  }

  return items.sort((a, b) => Number(Boolean(b.urgent)) - Number(Boolean(a.urgent)) || String(b.date).localeCompare(String(a.date)));
}
