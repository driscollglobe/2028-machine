'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { readKnobs, markupErrors, changeErrors } = require('../scripts/knobs');

const ROOT = path.resolve(__dirname, '..');
const K = readKnobs(fs.readFileSync(path.join(ROOT, 'knobs.json'), 'utf8'));
const clone = o => JSON.parse(JSON.stringify(o));

test('index.html matches knobs.json', () => {
  assert.deepStrictEqual(markupErrors(K, fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')), []);
});

test('a slider default that drifts from knobs.json fails', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace('value="5" id="pCrowd"', 'value="9" id="pCrowd"');
  assert.match(markupErrors(K, html).join(' '), /lane_crowding/);
});

test('an unchanged knob passes', () => {
  assert.deepStrictEqual(changeErrors(K, clone(K), [], () => ''), []);
});

test('a changed value with no new date fails', () => {
  const N = clone(K); N.lane_crowding.value = 0.1;
  assert.match(changeErrors(K, N, [], () => '').join(' '), /date stayed/);
});

test('a changed value with a new date but no changelog entry fails', () => {
  const N = clone(K); N.lane_crowding.value = 0.1; N.lane_crowding.date = '2099-01-01';
  assert.match(changeErrors(K, N, [{ date: '2099-01-01', file: 'x.md' }], () => 'nothing relevant').join(' '), /no changelog entry/);
});

test('a changed value with a dated changelog entry naming it passes', () => {
  const N = clone(K); N.lane_crowding.value = 0.1; N.lane_crowding.date = '2099-01-01';
  assert.deepStrictEqual(changeErrors(K, N, [{ date: '2099-01-01', file: 'x.md' }], () => 'Lane crowding moved to 0.1 because ...'), []);
});
