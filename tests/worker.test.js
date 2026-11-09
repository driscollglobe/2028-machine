'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const load = () => import(path.join(__dirname, '..', 'worker', 'src', 'index.js'));
const six = { ossoff: 70, aoc: 63, newsom: 83, harris: 65, pete: 93, shapiro: 87 };

test('worker accepts six numbers from 0 to 100', async () => {
  const W = await load();
  assert.strictEqual(W.validate({ runs: six }), null);
});
test('worker rejects out of range, unknown ids and the wrong count', async () => {
  const W = await load();
  assert.match(W.validate({ runs: Object.assign({}, six, { aoc: 101 }) }), /0 to 100/);
  assert.match(W.validate({ runs: Object.assign({}, six, { aoc: -1 }) }), /0 to 100/);
  const bad = Object.assign({}, six); delete bad.aoc; bad.nobody = 5;
  assert.match(W.validate({ runs: bad }), /unknown candidate/);
  const five = Object.assign({}, six); delete five.aoc;
  assert.match(W.validate({ runs: five }), /exactly 6/);
  assert.ok(W.validate(null));
});
test('aggregate returns count, mean and median', async () => {
  const W = await load();
  const a = W.aggregate([{ runs: six }, { runs: Object.assign({}, six, { aoc: 20 }) }, { runs: Object.assign({}, six, { aoc: 30 }) }]);
  assert.strictEqual(a.count, 3);
  assert.deepStrictEqual(a.candidates.aoc, { n: 3, mean: 37.7, median: 30 });
});
