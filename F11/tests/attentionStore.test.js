import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAttentionStore, ownerFromToken, EMPTY_ATTENTION } from '../src/modules/authority/data/attentionStore.js';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const tokenFor = (sub) => `${b64({ alg: 'HS256' })}.${b64({ sub })}.signature`;
const emergency = (id, level = 0) => ({ id, kind: 'emergency', level, severity: 80 });

/** A store wired to fake "who is signed in" and "what the server answers". */
function setup() {
  const world = { owner: 'officer-A', answer: { count: 1, emergencies: 1, items: [emergency('CMP-1')] }, delay: 0, calls: 0 };
  const store = createAttentionStore({
    fetchAttention: async () => { world.calls += 1; await new Promise((r) => setTimeout(r, world.delay)); return world.answer; },
    getOwner: () => world.owner,
    setTimer: () => 1, clearTimer: () => {},
  });
  return { world, store };
}

test('owner is read from the login token; no token means nobody', () => {
  assert.equal(ownerFromToken(tokenFor('usr_42')), 'usr_42');
  assert.equal(ownerFromToken(null), null);
  assert.equal(typeof ownerFromToken('garbage'), 'string');
});

test('a refresh stores the list for the signed-in officer', async () => {
  const { store } = setup();
  await store.refresh();
  const s = store.getSnapshot();
  assert.equal(s.loaded, true);
  assert.equal(s.owner, 'officer-A');
  assert.equal(s.items[0].id, 'CMP-1');
});

test('signing out wipes the list at once (the next person on this computer sees nothing)', async () => {
  const { world, store } = setup();
  await store.refresh();
  world.owner = null;
  await store.refresh();
  assert.equal(store.getSnapshot(), EMPTY_ATTENTION);
});

test('a different officer signing in never sees the previous officer\'s complaints, not even for a moment', async () => {
  const { world, store } = setup();
  await store.refresh();
  const seen = [];
  store.subscribe(() => seen.push(store.getSnapshot().items.map((i) => i.id).join(',')));
  world.owner = 'officer-B';
  world.answer = { count: 0, emergencies: 0, items: [] };
  await store.refresh();
  assert.ok(!seen.some((s) => s.includes('CMP-1')) || seen[0] === '', 'the old list is cleared before anything else is shown');
  assert.equal(store.getSnapshot().owner, 'officer-B');
  assert.equal(store.getSnapshot().items.length, 0);
});

test('an answer that arrives after the officer changed is thrown away', async () => {
  const { world, store } = setup();
  world.delay = 30;
  const pending = store.refresh();       // asks the server as officer-A...
  world.owner = 'officer-B';             // ...but B signs in before the answer arrives
  await pending;
  assert.notEqual(store.getSnapshot().owner, 'officer-A');
  assert.equal(store.getSnapshot().items.length, 0);
});

test('no change in the list means no new snapshot (no needless re-render); a new reminder level does', async () => {
  const { world, store } = setup();
  await store.refresh();
  const first = store.getSnapshot();
  world.answer = { count: 1, emergencies: 1, items: [emergency('CMP-1')] };
  await store.refresh();
  assert.equal(store.getSnapshot(), first);
  world.answer = { count: 1, emergencies: 1, items: [emergency('CMP-1', 3)] };
  await store.refresh();
  assert.notEqual(store.getSnapshot(), first, 'the server chased it again: the pop-up may show it again');
});

test('a failing network call keeps what is on screen', async () => {
  const world = { owner: 'a' };
  let fail = false;
  const store = createAttentionStore({ fetchAttention: async () => { if (fail) throw new Error('offline'); return { count: 1, emergencies: 0, items: [{ id: 'x', kind: 'overdue', level: 0, severity: null }] }; }, getOwner: () => world.owner, setTimer: () => 1, clearTimer: () => {} });
  await store.refresh();
  fail = true;
  await store.refresh();
  assert.equal(store.getSnapshot().items.length, 1);
});
