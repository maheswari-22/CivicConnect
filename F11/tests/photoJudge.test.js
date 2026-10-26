import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judgePhoto } from '../src/shared/imageClassifier.js';

const custom = (label, probability) => ({ available: true, source: 'custom', suggestion: null, top: [{ label, probability }] });
const generic = (suggestion, top) => ({ available: true, source: 'generic', suggestion, top: top ? [top] : [] });

test('trained model: matching class passes, other class and "nothing here" are refused', () => {
  assert.equal(judgePhoto(custom('pothole', 0.92), 'road').verdict, 'match');
  const wrong = judgePhoto(custom('garbage', 0.9), 'road');
  assert.equal(wrong.verdict, 'mismatch');
  assert.equal(wrong.blocked, true);
  assert.equal(wrong.detected, 'garbage');
  const nothing = judgePhoto(custom('background', 0.95), 'road');
  assert.equal(nothing.blocked, true);
  assert.equal(nothing.detected, null);
});

test('trained model is strict: an unsure answer is refused, but "other" is never a mismatch', () => {
  const unsure = judgePhoto(custom('pothole', 0.4), 'road');
  assert.equal(unsure.verdict, 'uncertain');
  assert.equal(unsure.blocked, true);
  assert.equal(judgePhoto(custom('garbage', 0.9), 'other').verdict, 'uncertain');
});

test('MobileNet: a confident other category is refused, weak evidence is allowed but flagged', () => {
  assert.equal(judgePhoto(generic({ category: 'garbage', confidence: 0.7, label: 'trash can' }), 'garbage').verdict, 'match');
  const wrong = judgePhoto(generic({ category: 'garbage', confidence: 0.7, label: 'trash can' }), 'light');
  assert.equal(wrong.blocked, true);
  const weak = judgePhoto(generic({ category: 'garbage', confidence: 0.3, label: 'trash can' }), 'light');
  assert.equal(weak.verdict, 'uncertain');
  assert.equal(weak.blocked, false, 'MobileNet does not know potholes, so unsure photos are not refused');
  assert.equal(judgePhoto(generic(null, null), 'road').blocked, false);
});

test('MobileNet: a selfie / pet / food photo is refused when the model is very sure', () => {
  const cat = judgePhoto(generic(null, { label: 'tabby, tabby cat', probability: 0.93 }), 'road');
  assert.equal(cat.verdict, 'mismatch');
  assert.equal(cat.blocked, true);
  assert.equal(judgePhoto(generic(null, { label: 'tabby, tabby cat', probability: 0.5 }), 'road').blocked, false);
  assert.equal(judgePhoto(generic(null, { label: 'sandbar, sand bar', probability: 0.95 }), 'road').blocked, false, 'terrain-like classes are never treated as "not civic"');
});

test('when the AI could not run, the photo is accepted as "unchecked"', () => {
  const r = judgePhoto({ available: false }, 'road');
  assert.equal(r.verdict, 'unchecked');
  assert.equal(r.blocked, false);
});

test('strict can be forced on or off', () => {
  assert.equal(judgePhoto(generic(null, null), 'road', { strict: true }).blocked, true);
  assert.equal(judgePhoto(custom('pothole', 0.4), 'road', { strict: false }).blocked, false);
});

/* ---- zero-shot engine ---- */
import { groupClipScores, CLIP_PROMPTS } from '../src/shared/imageClassifier.js';

const clipResult = (category, p) => ({ available: true, source: 'clip', suggestion: null, top: [{ category, label: CLIP_PROMPTS[category]?.[0] || 'x', probability: p }] });

test('zero-shot: scores of the phrases of one category are added up and normalised', () => {
  const raw = [
    { label: CLIP_PROMPTS.garbage[0], score: 0.3 }, { label: CLIP_PROMPTS.garbage[1], score: 0.25 },
    { label: CLIP_PROMPTS.road[0], score: 0.25 }, { label: CLIP_PROMPTS.none[0], score: 0.2 },
  ];
  const g = groupClipScores(raw);
  assert.equal(g[0].category, 'garbage');
  assert.ok(Math.abs(g[0].probability - 0.55) < 1e-9);
  assert.ok(Math.abs(g.reduce((a, b) => a + b.probability, 0) - 1) < 1e-9);
  assert.deepEqual(groupClipScores([]), []);
  assert.deepEqual(groupClipScores([{ label: 'unknown phrase', score: 1 }]), []);
});

test('zero-shot: match, mismatch and "not a civic photo"', () => {
  assert.equal(judgePhoto(clipResult('garbage', 0.8), 'garbage').verdict, 'match');
  const wrong = judgePhoto(clipResult('road', 0.7), 'garbage');
  assert.equal(wrong.verdict, 'mismatch');
  assert.equal(wrong.detected, 'road');
  assert.equal(wrong.blocked, true);
  const selfie = judgePhoto(clipResult('none', 0.85), 'road');
  assert.equal(selfie.verdict, 'mismatch');
  assert.equal(selfie.detected, null);
});

test('zero-shot: an unsure answer is flagged for the officer, never refused', () => {
  const unsure = judgePhoto(clipResult('road', 0.45), 'garbage');
  assert.equal(unsure.verdict, 'uncertain');
  assert.equal(unsure.blocked, false);
  assert.equal(judgePhoto(clipResult('road', 0.2), 'garbage').blocked, false);
  assert.equal(judgePhoto(clipResult('none', 0.5), 'road').blocked, false, 'only a confident "not civic" blocks');
});
