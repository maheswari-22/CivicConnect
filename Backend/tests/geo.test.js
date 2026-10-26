import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { createGeoRouter, shortAddress, clearGeoCache } from '../src/routes/geo.js';
import { errorHandler } from '../src/middleware/error.js';

test('shortAddress builds "road, neighbourhood, city" without repeats', () => {
  assert.equal(
    shortAddress({ road: 'Brodipet 3rd Line', suburb: 'Brodipet', city: 'Guntur' }),
    'Brodipet 3rd Line, Brodipet, Guntur',
  );
  assert.equal(shortAddress({ road: 'Main Road', suburb: 'Guntur', city: 'Guntur' }), 'Main Road, Guntur');
  assert.equal(shortAddress({ village: 'Pedakakani' }), 'Pedakakani');
  assert.equal(shortAddress({}, 'A Place, Some City, Some State, India'), 'A Place, Some City, Some State');
});

/** Starts a fake Nominatim and a tiny app that mounts the real geo router in front of it. */
async function boot(handler) {
  const hits = { count: 0, lastUA: '' };
  const stub = http.createServer((req, res) => {
    hits.count += 1;
    hits.lastUA = req.headers['user-agent'] || '';
    handler(req, res);
  });
  await new Promise((r) => stub.listen(0, r));
  const app = express();
  app.use('/geo', createGeoRouter({ geocoderUrl: `http://localhost:${stub.address().port}/reverse` }));
  app.use(errorHandler);
  const api = http.createServer(app);
  await new Promise((r) => api.listen(0, r));
  const base = `http://localhost:${api.address().port}/geo`;
  return { base, hits, close: () => { stub.close(); api.close(); } };
}

test('reverse geocoding: returns a short address, identifies itself, and caches', async () => {
  clearGeoCache();
  const s = await boot((_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ display_name: 'Brodipet 3rd Line, Brodipet, Guntur, Andhra Pradesh, India', address: { road: 'Brodipet 3rd Line', suburb: 'Brodipet', city: 'Guntur', postcode: '522002' } }));
  });
  try {
    const a = await (await fetch(`${s.base}/reverse?lat=16.3067&lng=80.4365`)).json();
    assert.equal(a.ok, true);
    assert.equal(a.data.address, 'Brodipet 3rd Line, Brodipet, Guntur');
    assert.equal(a.data.postcode, '522002');
    assert.match(s.hits.lastUA, /^CivicConnect\//, 'sends the User-Agent that the OSM policy requires');
    await fetch(`${s.base}/reverse?lat=16.30671&lng=80.43649`); // ~1 m away -> same cache cell
    assert.equal(s.hits.count, 1, 'nearby lookups are served from the cache');
  } finally { s.close(); }
});

test('reverse geocoding: bad input is rejected; upstream failures degrade gracefully', async () => {
  clearGeoCache();
  const s = await boot((_req, res) => { res.statusCode = 503; res.end('down'); });
  try {
    assert.equal((await fetch(`${s.base}/reverse?lat=abc&lng=80`)).status, 400);
    assert.equal((await fetch(`${s.base}/reverse?lat=95&lng=80`)).status, 400);
    assert.equal((await fetch(`${s.base}/reverse`)).status, 400);
    const down = await (await fetch(`${s.base}/reverse?lat=16.3&lng=80.4`)).json();
    assert.equal(down.ok, true, 'a failed lookup is not an error for the citizen');
    assert.equal(down.data.address, null);
    assert.equal(down.data.unavailable, true);
  } finally { s.close(); }

  const empty = await boot((_req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: 'Unable to geocode' })); });
  try {
    clearGeoCache();
    const none = await (await fetch(`${empty.base}/reverse?lat=1&lng=1`)).json();
    assert.equal(none.data.address, null);
  } finally { empty.close(); }
});

import { locateArea, AREAS } from '../src/config/areas.js';
import { hammingHex } from '../src/utils/photoHash.js';
import { placeFrom, searchResult } from '../src/routes/geo.js';

test('locateArea: routes a pin to the right office, villages to the nearest one, and refuses outside the region', () => {
  assert.equal(locateArea(16.3067, 80.4365).area, 'Guntur');
  const village = locateArea(14.9, 79.3); // far from any HQ, still routed
  assert.ok(AREAS.includes(village.area));
  assert.equal(locateArea(28.6, 77.2), null, 'Delhi is not served');
  assert.equal(locateArea(NaN, 80), null);
});

test('placeFrom names a village / town / city and its district', () => {
  assert.deepEqual(placeFrom({ village: 'Pedakakani', state_district: 'Guntur', state: 'Andhra Pradesh' }), { name: 'Pedakakani', type: 'village', district: 'Guntur', state: 'Andhra Pradesh' });
  assert.equal(placeFrom({ city: 'Guntur', town: 'x' }).type, 'city');
  assert.equal(placeFrom({}).name, '');
});

test('searchResult keeps only what the app needs and adds the serving office', () => {
  const r = searchResult({ lat: '16.30', lon: '80.43', display_name: 'Pedakakani, Guntur', address: { village: 'Pedakakani', state_district: 'Guntur', state: 'Andhra Pradesh' } });
  assert.equal(r.name, 'Pedakakani');
  assert.equal(r.area, 'Guntur');
  assert.equal(r.label, 'Pedakakani, Guntur, Andhra Pradesh');
});

test('hammingHex counts differing bits', () => {
  assert.equal(hammingHex('0000000000000000', '0000000000000000'), 0);
  assert.equal(hammingHex('0000000000000000', 'ffffffffffffffff'), 64);
  assert.equal(hammingHex('0000000000000001', '0000000000000003'), 1);
});

test('shortAddress puts a named place and the house number first, so the spot is easy to find', () => {
  assert.equal(
    shortAddress({ amenity: 'Sri Rama Temple', house_number: '12', road: 'Arundelpet 2nd Line', suburb: 'Arundelpet', city: 'Guntur' }),
    'Sri Rama Temple, 12, Arundelpet 2nd Line, Arundelpet, Guntur',
  );
});

test('reverse geocoding: simultaneous identical lookups share one upstream call', async () => {
  clearGeoCache();
  const s = await boot((_req, res) => {
    setTimeout(() => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ display_name: 'X, Guntur', address: { road: 'X Road', city: 'Guntur' } })); }, 80);
  });
  try {
    const answers = await Promise.all([1, 2, 3, 4].map(() => fetch(`${s.base}/reverse?lat=16.5555&lng=80.5555`).then((r) => r.json())));
    assert.ok(answers.every((a) => a.data.address === 'X Road, Guntur'));
    assert.equal(s.hits.count, 1, 'four citizens at the same spot cost one request to the free service');
  } finally { s.close(); }
});
