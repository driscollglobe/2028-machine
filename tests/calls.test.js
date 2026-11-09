// node --test tests/   (Node 20 built-in runner, no packages)
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const C = require('../scripts/calls');

const data = { markets: { blend: { ossoff: 25.5, aoc: 15.1 }, run: { pete: 93 } }, def: { first: { aoc: 26.0 }, contested: 39.4 } };
const fixture = () => C.parseCSV([
  C.HEAD.join(','),
  'A,2026-09-01,"Ossoff reaches 30, a past deadline that never held",market.ossoff,>=,30,2026-10-01,open,,',
  'B,2026-09-01,AOC model share at least 20,model.aoc,>=,20,2027-01-01,open,,',
  'C,2026-09-01,Contested rate under 30,model.contested,<,30,2027-01-01,open,,',
  'D,2026-11-20,Made in the future,run.pete,>=,90,2027-01-01,open,,',
  'T,2026-09-01,An example,market.ossoff,>=,1,2026-10-01,test,,'
].join('\n'));

test('a past-deadline call that never held grades false', () => {
  const rows = fixture();
  const g = C.grade(rows, data, '2026-11-09');
  const a = rows.find(r => r.id === 'A');
  assert.strictEqual(a.status, 'false');
  assert.strictEqual(a.resolved_date, '2026-11-09');
  assert.strictEqual(a.resolved_value, '25.5');
  assert.ok(g.includes('A'));
});
test('a call grades true the first day it holds', () => {
  const rows = fixture();
  C.grade(rows, data, '2026-11-09');
  const b = rows.find(r => r.id === 'B');
  assert.strictEqual(b.status, 'true');
  assert.strictEqual(b.resolved_value, '26');
});
test('open calls that do not hold stay open; future and test rows are skipped', () => {
  const rows = fixture();
  C.grade(rows, data, '2026-11-09');
  assert.strictEqual(rows.find(r => r.id === 'C').status, 'open');
  assert.strictEqual(rows.find(r => r.id === 'D').status, 'open');
  assert.strictEqual(rows.find(r => r.id === 'T').status, 'test');
  assert.deepStrictEqual(C.record(rows), { right: 1, graded: 2, open: 2 });
});
test('graded calls are not regraded', () => {
  const rows = fixture();
  C.grade(rows, data, '2026-11-09');
  const g2 = C.grade(rows, { markets: { blend: { ossoff: 40 } }, def: {} }, '2026-11-10');
  assert.ok(!g2.includes('A'));
  assert.strictEqual(rows.find(r => r.id === 'A').status, 'false');
});
test('lock check fails on an edited past row', () => {
  const old = fixture();
  const edited = fixture();
  edited.find(r => r.id === 'A').threshold = '20';
  const v = C.lockViolations(old, edited, '2026-11-09');
  assert.strictEqual(v.length, 1);
  assert.match(v[0], /A threshold changed/);
});
test('lock check fails on a deleted past row and on edited text', () => {
  const old = fixture();
  const edited = fixture().filter(r => r.id !== 'B');
  edited.find(r => r.id === 'C').text = 'softer words';
  const v = C.lockViolations(old, edited, '2026-11-09');
  assert.ok(v.some(x => /B was deleted/.test(x)));
  assert.ok(v.some(x => /C text changed/.test(x)));
});
test('lock check allows grading columns to change and allows edits to rows made today', () => {
  const old = fixture();
  const graded = fixture();
  C.grade(graded, data, '2026-11-09');
  graded.find(r => r.id === 'D').threshold = '95';
  assert.deepStrictEqual(C.lockViolations(old, graded, '2026-11-21').filter(x => !/^D /.test(x)), []);
  assert.deepStrictEqual(C.lockViolations(old, graded, '2026-11-09'), []);
});
test('test rows are exempt from the lock', () => {
  const old = fixture();
  const edited = fixture().filter(r => r.id !== 'T');
  assert.deepStrictEqual(C.lockViolations(old, edited, '2026-11-09'), []);
});
test('csv round trip keeps commas and quotes', () => {
  const rows = fixture();
  const back = C.parseCSV(C.toCSV(rows));
  assert.strictEqual(back[0].text, 'Ossoff reaches 30, a past deadline that never held');
});
test('the committed ledger validates', () => {
  const fs = require('fs');
  const rows = C.parseCSV(fs.readFileSync(require('path').join(__dirname, '..', 'calls.csv'), 'utf8'));
  assert.ok(rows.length >= 1);
  rows.forEach(r => assert.strictEqual(C.validate(r), null));
});
