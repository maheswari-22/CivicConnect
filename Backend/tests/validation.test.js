// Unit tests: no database or running server needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loginSchema,
  citizenRegisterSchema,
  workerRegisterSchema,
  complaintSchema,
  assignSchema,
  resetPasswordSchema,
} from '../src/utils/validation.js';
import { AREAS, isArea } from '../src/config/areas.js';

test('areas: list is non-empty and isArea only accepts known areas', () => {
  assert.ok(AREAS.length > 0);
  assert.ok(isArea(AREAS[0]));
  assert.equal(isArea('Atlantis'), false);
});

test('login: identifier and password are required', () => {
  assert.equal(loginSchema.safeParse({ identifier: 'AUTH-001', password: 'x' }).success, true);
  assert.equal(loginSchema.safeParse({ identifier: '', password: 'x' }).success, false);
  assert.equal(loginSchema.safeParse({ identifier: 'a' }).success, false);
});

test('citizen sign-up: needs a mobile or an email, and an 8+ character password', () => {
  const base = { name: 'Asha Rao', password: 'Trusty#Bridge42' };
  assert.equal(citizenRegisterSchema.safeParse(base).success, false, 'no mobile / email');
  assert.equal(citizenRegisterSchema.safeParse({ ...base, email: 'asha@example.com' }).success, true);
  assert.equal(citizenRegisterSchema.safeParse({ ...base, mobile: "9876543210" }).success, false, "mobile alone is not enough: no way to send a reset link");
  assert.equal(citizenRegisterSchema.safeParse({ ...base, email: 'asha@example.com', password: 'short' }).success, false);
});

test('citizen sign-up: email is trimmed and lower-cased', () => {
  const r = citizenRegisterSchema.parse({ name: 'Asha Rao', email: '  Asha@Example.COM ', password: 'Trusty#Bridge42' });
  assert.equal(r.email, 'asha@example.com');
});

test('worker sign-up: area must be one of the supported areas', () => {
  const ok = { name: 'Ravi Kumar', username: 'ravi01', email: 'ravi@example.com', phone: '+919848010101', area: AREAS[0], password: 'Trusty#Bridge42' };
  assert.equal(workerRegisterSchema.safeParse(ok).success, true);
  assert.equal(workerRegisterSchema.safeParse({ ...ok, area: 'Atlantis' }).success, false);
});

test('complaint: description must be at least 10 characters and category must be known', () => {
  const ok = { category: 'road', description: 'Large pothole near the junction', location: 'Main Road' };
  assert.equal(complaintSchema.safeParse(ok).success, true);
  assert.equal(complaintSchema.safeParse({ ...ok, description: 'too short' }).success, false);
  assert.equal(complaintSchema.safeParse({ ...ok, category: 'noise' }).success, false);
});

test('complaint: coordinates must be real latitude / longitude values', () => {
  const ok = { category: 'road', description: 'Large pothole near the junction', location: 'Main Road' };
  assert.equal(complaintSchema.safeParse({ ...ok, lat: '17.7', lng: '83.2' }).success, true);
  assert.equal(complaintSchema.safeParse({ ...ok, lat: 123, lng: 0 }).success, false);
});

test('assign: priority must be Low, Medium or High', () => {
  assert.equal(assignSchema.safeParse({ workerId: 'usr_1', priority: 'High' }).success, true);
  assert.equal(assignSchema.safeParse({ workerId: 'usr_1', priority: 'Urgent' }).success, false);
});

test('reset password: new password must meet the strong-password rules', () => {
  assert.equal(resetPasswordSchema.safeParse({ role: 'citizen', token: 'abc', newPassword: 'short' }).success, false);
  assert.equal(resetPasswordSchema.safeParse({ role: 'citizen', token: 'abc', newPassword: 'Trusty#Bridge42' }).success, true);
});

import { rejectSchema, reopenSchema, feedbackSchema } from '../src/utils/validation.js';

test('reject and reopen need a real reason', () => {
  assert.equal(rejectSchema.safeParse({ reason: 'no' }).success, false);
  assert.equal(rejectSchema.safeParse({ reason: 'Duplicate of CC-2026-1281' }).success, true);
  assert.equal(reopenSchema.safeParse({}).success, false);
  assert.equal(reopenSchema.safeParse({ reason: 'Still leaking' }).success, true);
});

test('feedback rating must be a whole number from 1 to 5', () => {
  for (const bad of [0, 6, 2.5, 'abc']) assert.equal(feedbackSchema.safeParse({ rating: bad }).success, false, String(bad));
  for (const good of [1, 3, '5']) assert.equal(feedbackSchema.safeParse({ rating: good }).success, true, String(good));
});

import { passwordSchema, usernameSchema } from '../src/utils/validation.js';

test('password: must be strong (10+ chars, upper, lower, number, symbol, no spaces)', () => {
  assert.equal(passwordSchema.safeParse('Trusty#Bridge42').success, true);
  for (const weak of ['short1A#', 'alllowercase123!', 'ALLUPPERCASE123!', 'NoNumbersHere!!', 'NoSymbols12345A', 'Has Space#12345', 'Password#12345']) {
    assert.equal(passwordSchema.safeParse(weak).success, false, weak);
  }
});

test('username: 4-20 chars, starts with a letter, only letters/numbers/. _ -', () => {
  for (const ok of ['ravi01', 'ravi_kumar', 'Ravi.K-2']) assert.equal(usernameSchema.safeParse(ok).success, true, ok);
  for (const bad of ['ra', '1ravi', 'ravi kumar', 'ravi..k', 'ravi_', 'a'.repeat(21)]) assert.equal(usernameSchema.safeParse(bad).success, false, bad);
});
