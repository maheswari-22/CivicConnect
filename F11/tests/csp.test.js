import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCsp } from '../csp.js';

const directive = (csp, name) => csp.split('; ').find((d) => d.startsWith(`${name} `)) || '';

test('the policy lets the app reach its own API and nothing is open to inline or eval scripts', () => {
  const csp = buildCsp({ apiUrl: 'https://api.civic.example/' });
  assert.match(directive(csp, 'connect-src'), /https:\/\/api\.civic\.example(\s|$)/);
  assert.match(directive(csp, 'img-src'), /https:\/\/api\.civic\.example(\s|$)/);
  const script = directive(csp, 'script-src');
  assert.ok(!script.includes("'unsafe-inline'"));
  assert.ok(!/'unsafe-eval'/.test(script));
  assert.ok(script.includes("'wasm-unsafe-eval'"), 'the on-device AI needs WebAssembly');
});

test('plug-ins, <base> hijacking and foreign form targets are blocked', () => {
  const csp = buildCsp();
  assert.ok(csp.includes("object-src 'none'"));
  assert.ok(csp.includes("base-uri 'self'"));
  assert.ok(csp.includes("form-action 'self'"));
  assert.ok(directive(csp, 'default-src').includes("'self'"));
});

test('self-hosted model addresses are added to connect-src, junk is ignored', () => {
  const csp = buildCsp({ apiUrl: 'http://localhost:4000', extraConnect: ['https://models.example.org/clip', 'not a url'] });
  assert.match(directive(csp, 'connect-src'), /https:\/\/models\.example\.org(\s|$)/);
  assert.ok(!csp.includes('not a url'));
});

test('Hugging Face file hosts are allowed so the zero-shot model can download', () => {
  assert.match(directive(buildCsp(), 'connect-src'), /https:\/\/\*\.hf\.co/);
});
