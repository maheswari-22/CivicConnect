import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expectedFromPath, summarize } from '../src/ailab/evaluate.js';
import { predictedCategory } from '../src/shared/imageClassifier.js';

test('the folder a photo sits in is its true answer', () => {
  assert.equal(expectedFromPath('photos/Garbage/a.jpg'), 'garbage');
  assert.equal(expectedFromPath('photos/potholes/a.jpg'), 'road');
  assert.equal(expectedFromPath('x/street-light/a.jpg'), 'light');
  assert.equal(expectedFromPath('x/water leak/a.jpg'), 'water');
  assert.equal(expectedFromPath('x/not-civic/a.jpg'), 'none');
  assert.equal(expectedFromPath('x/holiday/a.jpg'), null);
  assert.equal(expectedFromPath('a.jpg'), null);
});

test('summary: accuracy, recall and a confusion matrix', () => {
  const s = summarize([
    { expected: 'road', predicted: 'road' }, { expected: 'road', predicted: 'garbage' },
    { expected: 'garbage', predicted: 'garbage' }, { expected: 'none', predicted: null },
  ]);
  assert.equal(s.total, 4);
  assert.equal(s.accuracy, 0.75);
  assert.equal(s.perClass.road.recall, 0.5);
  assert.equal(s.matrix.road.garbage, 1);
  assert.equal(s.matrix.none.none, 1, 'null means "none of them"');
  assert.equal(summarize([]).accuracy, null);
});

test('predictedCategory reads each engine\'s answer', () => {
  assert.equal(predictedCategory({ available: true, source: 'clip', top: [{ category: 'road', probability: 0.7 }] }), 'road');
  assert.equal(predictedCategory({ available: true, source: 'clip', top: [{ category: 'none', probability: 0.9 }] }), null);
  assert.equal(predictedCategory({ available: true, source: 'clip', top: [{ category: 'road', probability: 0.2 }] }), null);
  assert.equal(predictedCategory({ available: true, source: 'generic', suggestion: { category: 'garbage' } }), 'garbage');
  assert.equal(predictedCategory({ available: false }), null);
});
