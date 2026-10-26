import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertLoginAllowed, recordLoginFailure, clearLoginFailures, resetLoginThrottle } from '../src/services/loginThrottle.js';
import { env } from '../src/config/env.js';

test('an account is paused after too many wrong passwords, whatever spelling or address they came from', () => {
  resetLoginThrottle();
  for (let i = 0; i < env.loginMaxFailures - 1; i += 1) { assertLoginAllowed('Asha@Example.com'); recordLoginFailure('asha@example.com'); }
  assertLoginAllowed('asha@example.com'); // one attempt left
  recordLoginFailure('  ASHA@example.com ');
  assert.throws(() => assertLoginAllowed('asha@example.com'), (e) => e.status === 429);
  assertLoginAllowed('someone.else@example.com'); // other accounts are not affected
});

test('mobile numbers written differently count as one account', () => {
  resetLoginThrottle();
  for (let i = 0; i < env.loginMaxFailures; i += 1) recordLoginFailure(i % 2 ? '+91 98765 43210' : '9876543210');
  assert.throws(() => assertLoginAllowed('098765-43210'), (e) => e.status === 429);
});

test('a correct sign-in clears the count', () => {
  resetLoginThrottle();
  for (let i = 0; i < env.loginMaxFailures - 1; i += 1) recordLoginFailure('worker1');
  clearLoginFailures('WORKER1');
  recordLoginFailure('worker1'); // starts again from one
  assertLoginAllowed('worker1');
});

test('the lock never depends on whether the account exists', () => {
  resetLoginThrottle();
  for (let i = 0; i < env.loginMaxFailures; i += 1) recordLoginFailure('nobody-has-this-name');
  assert.throws(() => assertLoginAllowed('nobody-has-this-name'), (e) => e.status === 429);
});
