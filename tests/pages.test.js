'use strict';
// moved.html carries its own copy of the field (names and pools) so it doesn't load the model. Keep it in step.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const core = require('../scripts/simcore');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'moved.html'), 'utf8');
const grab = name => JSON.parse(new RegExp('const ' + name + '=(\\{[^\\n]*\\});').exec(html)[1]);

test('moved.html names and pools match the field in index.html', () => {
  const sim = core.load();
  const N = {}, P = {};
  sim.CANDS.forEach(c => { N[c.id] = c.name; P[c.id] = c.lane; });
  assert.deepStrictEqual(grab('NAMES'), N);
  assert.deepStrictEqual(grab('POOLOF'), P);
});

test('every page header links to What moved beside Track record', () => {
  ['index.html', 'moved.html'].forEach(f => {
    assert.match(fs.readFileSync(path.join(ROOT, f), 'utf8'), /<a href="track.html">Track record<\/a><a href="moved.html">What moved<\/a>/, f);
  });
});
