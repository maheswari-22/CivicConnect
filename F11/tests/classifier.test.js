import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as tf from '@tensorflow/tfjs';
import { labelToCategory, suggestFromCustom, suggestFromGeneric, classifyTensor } from '../src/shared/imageClassifier.js';

test('class names from a custom model map onto the app categories', () => {
  const cases = { pothole: 'road', 'Road damage': 'road', 'Street Light': 'light', streetlight: 'light', garbage: 'garbage', 'Trash dump': 'garbage', 'Water leak': 'water', drainage: 'water', background: 'other' };
  for (const [label, category] of Object.entries(cases)) assert.equal(labelToCategory(label), category, label);
});

test('a trained model must be confident, and "other" never becomes a suggestion', () => {
  assert.equal(suggestFromCustom([{ label: 'garbage', probability: 0.9 }]).category, 'garbage');
  assert.equal(suggestFromCustom([{ label: 'garbage', probability: 0.45 }]), null);
  assert.equal(suggestFromCustom([{ label: 'background', probability: 0.95 }]), null);
  assert.equal(suggestFromCustom([]), null);
});

test('MobileNet class names are turned into a suggestion only with real evidence', () => {
  const bin = 'ashcan, trash can, garbage can, wastebin, ash bin, ash-bin, ashbin, dustbin, trash barrel, trash bin';
  const garbage = suggestFromGeneric([{ className: bin, probability: 0.5 }, { className: 'plastic bag', probability: 0.12 }, { className: 'tabby, tabby cat', probability: 0.05 }]);
  assert.equal(garbage.category, 'garbage');
  assert.ok(garbage.confidence > 0.5 && garbage.confidence < 1);
  assert.equal(suggestFromGeneric([{ className: 'manhole cover', probability: 0.4 }]).category, 'road');
  assert.equal(suggestFromGeneric([{ className: 'fountain', probability: 0.35 }]).category, 'water');
  assert.equal(suggestFromGeneric([{ className: 'tabby, tabby cat', probability: 0.9 }]), null, 'unrelated objects give no suggestion');
  assert.equal(suggestFromGeneric([{ className: 'ashcan, trash can', probability: 0.08 }]), null, 'weak evidence gives no suggestion');
});

/** A tiny real TensorFlow.js model: pools the image to its mean R,G,B and scores each colour. Round-trips through save/load. */
async function tinyColourModel() {
  const model = tf.sequential();
  model.add(tf.layers.globalAveragePooling2d({ inputShape: [224, 224, 3] }));
  model.add(tf.layers.dense({ units: 3, activation: 'softmax', kernelInitializer: 'zeros', biasInitializer: 'zeros' }));
  model.layers[1].setWeights([tf.mul(tf.eye(3), 8), tf.zeros([3])]); // class i likes colour channel i
  let artifacts;
  await model.save(tf.io.withSaveHandler(async (a) => { artifacts = a; return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: 'JSON' } }; }));
  return tf.loadLayersModel(tf.io.fromMemory(artifacts));
}

test('classifyTensor runs a real TensorFlow.js model and ranks the classes', async () => {
  await tf.setBackend('cpu');
  await tf.ready();
  const model = await tinyColourModel();
  const labels = ['pothole', 'garbage', 'street light'];
  const solid = (r, g, b) => tf.tidy(() => tf.stack([tf.fill([300, 400], r), tf.fill([300, 400], g), tf.fill([300, 400], b)], 2)); // any size: it is resized

  const red = await classifyTensor(tf, model, labels, solid(255, 0, 0));
  assert.equal(red[0].label, 'pothole');
  assert.ok(red[0].probability > 0.9);
  assert.equal(red.length, 3);
  assert.equal(suggestFromCustom(red).category, 'road');

  const green = await classifyTensor(tf, model, labels, solid(0, 255, 0));
  assert.equal(green[0].label, 'garbage');
  assert.equal(suggestFromCustom(green).category, 'garbage');

  const grey = await classifyTensor(tf, model, labels, solid(128, 128, 128));
  assert.equal(suggestFromCustom(grey), null, 'an undecided image gives no suggestion');
  assert.equal(tf.memory().numTensors < 40, true, 'tensors are disposed, no memory leak per photo');
});
