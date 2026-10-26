import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeFeatures, scoreSeverity, levelFor, suggestPriority } from '../src/shared/severity.js';

/* Builds a tiny RGBA picture from a function (x, y) -> [r, g, b]. */
const picture = (w, h, fn) => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const [r, g, b] = fn(x, y);
    data.set([r, g, b, 255], (y * w + x) * 4);
  }
  return { data, w, h };
};
const flat = picture(64, 64, () => [128, 128, 128]);
const noisy = picture(64, 64, (x, y) => ((x * 7 + y * 13) % 2 ? [0, 0, 0] : [255, 255, 255]));
const feat = (img) => computeFeatures(img.data, img.w, img.h);
const ai = (hint, category = 'road') => ({ available: true, severityHint: hint, severityCategory: category });

test('without the AI model\'s answer there is NO score (pixel statistics alone were wrong on real photos)', () => {
  const r = scoreSeverity(feat(flat), 'road');
  assert.equal(r.available, false);
  assert.equal(r.score, null);
  assert.equal(scoreSeverity(feat(flat), 'road', { available: true, suggestion: { category: 'road' } }).available, false);
  assert.equal(scoreSeverity(feat(flat), 'road', ai(0.9, 'garbage')).available, false, 'an answer about another category is ignored');
});

test('with the AI answer the score follows it, in order, inside 8-96', () => {
  const scores = [0.02, 0.3, 0.6, 0.98].map((h) => scoreSeverity(feat(flat), 'road', ai(h)).score);
  assert.deepEqual([...scores].sort((a, b) => a - b), scores, 'monotonic');
  assert.ok(scores[0] >= 8 && scores[3] <= 96);
  assert.ok(scores[3] - scores[0] > 60, 'a real spread, not a mush around the middle');
  assert.equal(scoreSeverity(feat(flat), 'road', ai(0.98)).level, 'critical');
  assert.equal(scoreSeverity(feat(flat), 'road', ai(0.02)).level, 'low');
});

test('pixel statistics can nudge the AI answer by about 10 points at most', () => {
  for (const c of ['road', 'garbage', 'light', 'water', 'other']) {
    const a = scoreSeverity(feat(flat), c, ai(0.5, c)).score;
    const b = scoreSeverity(feat(noisy), c, ai(0.5, c)).score;
    assert.ok(Math.abs(a - b) <= 10, `${c}: ${a} vs ${b}`);
  }
  assert.equal(scoreSeverity(null, 'road', ai(0.9)).available, true, 'works even if the picture cannot be decoded');
});

test('levels and suggested priorities', () => {
  assert.equal(levelFor(85), 'critical');
  assert.equal(levelFor(20), 'low');
  assert.equal(suggestPriority(75), 'High');
  assert.equal(suggestPriority(45), 'Medium');
  assert.equal(suggestPriority(10), 'Low');
  assert.equal(suggestPriority(10, true), 'High');
  assert.equal(computeFeatures(new Uint8ClampedArray(0), 0, 0), null);
});
