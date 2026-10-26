import { test } from 'node:test';
import assert from 'node:assert/strict';
import { locate, describeAccuracy, explainGeoError, osmEmbedUrl, osmLink } from '../src/shared/geo.js';
import { nearestArea, distanceKm } from '../src/shared/areas.js';

/** A fake navigator.geolocation that plays back scripted readings. */
function fakeGeo(script) {
  const state = { cleared: false };
  return {
    state,
    watchPosition(ok, fail) {
      script.forEach(({ at, accuracy, error }) => setTimeout(() => {
        if (state.cleared) return;
        if (error) fail(error);
        else ok({ coords: { latitude: 16.3067, longitude: 80.4365, accuracy } });
      }, at));
      return 7;
    },
    clearWatch() { state.cleared = true; },
  };
}

test('locate keeps refining and stops at a precise fix', async () => {
  const geo = fakeGeo([{ at: 0, accuracy: 900 }, { at: 10, accuracy: 120 }, { at: 20, accuracy: 15 }, { at: 30, accuracy: 5 }]);
  const seen = [];
  const { promise } = locate({ geolocation: geo, onUpdate: (r) => seen.push(r.accuracy) });
  const fix = await promise;
  assert.equal(fix.accuracy, 15);
  assert.deepEqual(seen, [900, 120, 15]);
  assert.equal(geo.state.cleared, true, 'stops watching the GPS afterwards (saves battery)');
});

test('locate returns the best reading when time runs out', async () => {
  const geo = fakeGeo([{ at: 0, accuracy: 400 }, { at: 5, accuracy: 250 }]);
  const fix = await locate({ geolocation: geo, maxMs: 40 }).promise;
  assert.equal(fix.accuracy, 250);
  assert.equal(geo.state.cleared, true);
});

test('locate fails clearly when permission is denied or nothing arrives', async () => {
  const denied = fakeGeo([{ at: 0, error: { code: 1, message: 'denied' } }]);
  await assert.rejects(locate({ geolocation: denied }).promise, (e) => e.code === 1);
  const silent = fakeGeo([]);
  await assert.rejects(locate({ geolocation: silent, maxMs: 20 }).promise, (e) => e.code === 3);
  await assert.rejects(locate({ geolocation: null }).promise, (e) => /not available/i.test(e.message));
});

test('locate can be cancelled', async () => {
  const geo = fakeGeo([{ at: 500, accuracy: 10 }]);
  const handle = locate({ geolocation: geo, maxMs: 2000 });
  handle.cancel();
  await assert.rejects(handle.promise, (e) => e.code === -1);
  assert.equal(geo.state.cleared, true);
});

test('error and accuracy wording', () => {
  assert.match(explainGeoError({ code: 1 }, { secure: true }), /permission was denied/i);
  assert.match(explainGeoError({ code: 2 }, { secure: true }), /not available/i);
  assert.match(explainGeoError({ code: 3 }, { secure: true }), /too long/i);
  assert.match(explainGeoError({ code: 1 }, { secure: false }), /https/i, 'an insecure page is the real reason, so say that first');
  assert.equal(describeAccuracy(12).level, 'good');
  assert.equal(describeAccuracy(90).level, 'ok');
  assert.equal(describeAccuracy(2500).level, 'poor');
  assert.match(describeAccuracy(2500).text, /2\.5 km/);
});

test('area detection from a GPS position', () => {
  assert.equal(nearestArea(16.3067, 80.4365), 'Guntur');
  assert.equal(nearestArea(17.7, 83.3), 'Visakhapatnam');
  assert.equal(nearestArea(13.63, 79.42), 'Tirupati');
  assert.equal(nearestArea(19.076, 72.8777), null, 'Mumbai is outside every served area');
  assert.equal(nearestArea(17.385, 78.4867), null, 'Hyderabad is outside every served area');
  assert.ok(Math.abs(distanceKm(16.3067, 80.4365, 16.5062, 80.648) - 29) < 3, 'Guntur to Vijayawada is about 29 km');
});

test('map links carry the marker', () => {
  assert.match(osmEmbedUrl(16.3067, 80.4365), /marker=16\.306700,80\.436500/);
  assert.match(osmLink(16.3067, 80.4365), /mlat=16\.306700&mlon=80\.436500/);
});

test('locate averages the good readings, so GPS jitter shrinks, and flags a coarse (IP / cell) fix', async () => {
  const jitter = {
    watchPosition(ok) {
      [[16.30670, 80.43650, 12], [16.30674, 80.43654, 14], [16.30666, 80.43646, 16]].forEach(([latitude, longitude, accuracy], i) =>
        setTimeout(() => ok({ coords: { latitude, longitude, accuracy } }), i * 5));
      return 1;
    },
    clearWatch() {},
  };
  const fix = await locate({ geolocation: jitter, goodEnoughM: 5, maxMs: 60 }).promise;
  assert.equal(fix.samples, 3);
  assert.equal(fix.accuracy, 12, 'the reported accuracy is the best single reading');
  assert.ok(Math.abs(fix.lat - 16.3067) < 0.00003, 'the average sits between the readings');
  const coarse = fakeGeo([{ at: 0, accuracy: 4800 }]);
  assert.equal((await locate({ geolocation: coarse, maxMs: 30 }).promise).coarse, true);
  assert.match(describeAccuracy(4800).text, /drag the pin/i);
});
