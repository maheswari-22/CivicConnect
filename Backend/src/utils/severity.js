/* Severity helpers shared by the complaint service.
   The photo AI (in the citizen's browser) sends a 0-100 estimate of how bad the problem looks.
   It is ADVICE: the authority decides the real priority, and an emergency flag always wins. */

/** 0-100 estimate -> the priority we suggest to the authority. */
export function priorityFromSeverity(severity, isEmergency = false) {
  if (isEmergency) return 'High';
  if (severity == null) return 'Medium';
  if (severity >= 70) return 'High';
  if (severity >= 40) return 'Medium';
  return 'Low';
}

/** 0-100 estimate -> a short word for the badge. */
export function severityBand(severity) {
  if (severity == null) return null;
  if (severity >= 80) return 'critical';
  if (severity >= 60) return 'high';
  if (severity >= 35) return 'moderate';
  return 'low';
}

/** Hours the worker is given. Emergencies are due the same day. */
export function leadHoursFor(priority, isEmergency) {
  if (isEmergency) return 6;
  return { High: 48, Medium: 96, Low: 144 }[priority] ?? 96;
}

/** What a repeated "still unassigned" reminder should do at escalation `level` (1 = the first reminder).
    In-app notifications are limited so the list does not fill up; emergencies also e-mail every officer of the area
    at levels 1, 3, 6, 12 and 24 (about 1 h, 3 h, 6 h, half a day and a day), because a pop-up is no use to an officer who has left the screen. */
const EMAIL_LEVELS = new Set([1, 3, 6, 12, 24]);
export function escalationPlan(level, isEmergency) {
  const inApp = level <= 6 || level % 6 === 0;
  const email = Boolean(isEmergency) && EMAIL_LEVELS.has(level);
  const stage = level >= 12 ? 'critical' : level >= 3 ? 'escalated' : 'new';
  return { inApp, email, stage };
}
