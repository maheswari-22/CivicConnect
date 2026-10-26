import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priorityFromSeverity, severityBand, leadHoursFor, escalationPlan } from '../src/utils/severity.js';

test('suggested priority follows the AI severity, and an emergency is always High', () => {
  assert.equal(priorityFromSeverity(null), 'Medium');
  assert.equal(priorityFromSeverity(15), 'Low');
  assert.equal(priorityFromSeverity(40), 'Medium');
  assert.equal(priorityFromSeverity(69), 'Medium');
  assert.equal(priorityFromSeverity(70), 'High');
  assert.equal(priorityFromSeverity(5, true), 'High');
});

test('severity bands', () => {
  assert.equal(severityBand(null), null);
  assert.equal(severityBand(10), 'low');
  assert.equal(severityBand(35), 'moderate');
  assert.equal(severityBand(60), 'high');
  assert.equal(severityBand(95), 'critical');
});

test('emergencies are due the same day', () => {
  assert.equal(leadHoursFor('High', true), 6);
  assert.equal(leadHoursFor('High', false), 48);
  assert.equal(leadHoursFor('Low', false), 144);
});

test('escalation ladder: emergencies e-mail the officers at 1, 3, 6, 12, 24 and in-app notices are thinned out', () => {
  const emailLevels = [];
  for (let level = 1; level <= 30; level += 1) if (escalationPlan(level, true).email) emailLevels.push(level);
  assert.deepEqual(emailLevels, [1, 3, 6, 12, 24]);
  assert.equal(escalationPlan(1, false).email, false, 'ordinary complaints never e-mail');
  assert.equal(escalationPlan(2, true).stage, 'new');
  assert.equal(escalationPlan(3, true).stage, 'escalated');
  assert.equal(escalationPlan(12, true).stage, 'critical');
  const inApp = Array.from({ length: 24 }, (_, i) => i + 1).filter((l) => escalationPlan(l, true).inApp);
  assert.deepEqual(inApp, [1, 2, 3, 4, 5, 6, 12, 18, 24], 'the notification list does not fill up with hourly repeats');
});
