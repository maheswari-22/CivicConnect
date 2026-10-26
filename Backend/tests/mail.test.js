import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as t from '../src/mail/templates.js';

const link = 'https://civic.example/citizen/?reset=' + 'a'.repeat(64);
const all = () => [
  t.passwordResetEmail({ name: 'Asha', portal: 'Citizen', link, minutes: 30 }),
  t.passwordChangedEmail({ name: 'Asha', portal: 'Citizen', link, when: '18 Oct 2026, 4:30 pm (IST)' }),
  t.verifyEmailEmail({ name: 'Asha', link, hours: 24 }),
  t.changeEmailEmail({ name: 'Asha', link, hours: 24 }),
  t.emailChangedNoticeEmail({ name: 'Asha', newEmail: 'new@example.com' }),
  t.workerApprovedEmail({ name: 'Asha', link }),
  t.emergencyAlertEmail({ name: 'Asha', complaintId: 'CMP-1', title: 'Road Damage', location: 'Main Road', waited: '3 hours', level: 3, severity: 83, reason: 'Open manhole', link }),
];

test('every email has a subject, a plain-text part and an HTML part with the inline logo', () => {
  for (const m of all()) {
    assert.ok(m.subject.length > 5);
    assert.ok(m.text.includes('CivicConnect'));
    assert.ok(m.html.startsWith('<!DOCTYPE html>'));
    assert.ok(m.html.includes(`cid:${t.LOGO_CID}`));
  }
});

test('the reset email carries the link in the button, the fallback line and the text version', () => {
  const m = t.passwordResetEmail({ name: 'Asha', portal: 'Citizen', link, minutes: 30 });
  assert.equal(m.html.split(link).length - 1, 3, 'button href + visible fallback + its href');
  assert.ok(m.text.includes(link));
  assert.ok(m.text.includes('30 minutes'));
});

test('names and addresses typed by people are escaped in the HTML', () => {
  const m = t.emailChangedNoticeEmail({ name: '<script>alert(1)</script>', newEmail: 'a"b@x.com' });
  assert.ok(!m.html.includes('<script>'));
  assert.ok(m.html.includes('&lt;script&gt;'));
  assert.ok(m.html.includes('a&quot;b@x.com'));
});

test('the emergency e-mail says how long it has waited and escalates its wording', () => {
  const first = t.emergencyAlertEmail({ name: 'A', complaintId: 'CMP-1', title: 'Road', location: 'X', waited: '1 hour', level: 1, link });
  const later = t.emergencyAlertEmail({ name: 'A', complaintId: 'CMP-1', title: 'Road', location: 'X', waited: '6 hours', level: 6, link });
  assert.ok(!first.subject.startsWith('ESCALATED'));
  assert.ok(later.subject.startsWith('ESCALATED'));
  assert.ok(later.text.includes('6 hours') && later.html.includes('6 hours'));
  assert.equal(first.html.split(link).length - 1, 3);
});
