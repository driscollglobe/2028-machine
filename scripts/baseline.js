#!/usr/bin/env node
// Nightly baseline: run the simulation core from index.html at default settings
// with the latest market anchors from markets.json and append one row to history.csv.
// Node 20, no npm packages.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const MARKETS = path.join(ROOT, 'markets.json');
const HISTORY = path.join(ROOT, 'history.csv');
const RUNS = 20000;

const html = fs.readFileSync(INDEX, 'utf8');

// 1. Extract the inline script up to the simulation core marker.
const scriptStart = html.indexOf('<script>');
const scriptEnd = html.indexOf('</script>', scriptStart);
if (scriptStart < 0 || scriptEnd < 0) throw new Error('index.html: inline script tag not found');
const fullScript = html.slice(scriptStart + '<script>'.length, scriptEnd);
const marker = '/*==SIM_CORE_END==*/';
const markerAt = fullScript.indexOf(marker);
if (markerAt < 0) throw new Error('index.html: ' + marker + ' marker not found');
const core = fullScript.slice(0, markerAt);

// 2. Stub the DOM: default control values come straight from the HTML markup.
const controls = {};
const inputRe = /<input\b[^>]*>/g;
let m;
while ((m = inputRe.exec(html)) !== null) {
  const tag = m[0];
  const id = (tag.match(/\bid="([^"]+)"/) || [])[1];
  if (!id) continue;
  const type = (tag.match(/\btype="([^"]+)"/) || [])[1] || 'text';
  const value = (tag.match(/\bvalue="([^"]*)"/) || [])[1];
  controls[id] = { value: value === undefined ? '' : value, checked: type === 'checkbox' ? /\bchecked\b/.test(tag) : false, disabled: false };
}
const selectRe = /<select\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g;
while ((m = selectRe.exec(html)) !== null) {
  const id = m[1];
  const body = m[2];
  const optRe = /<option\b([^>]*)>/g;
  let first = null, selected = null, o;
  while ((o = optRe.exec(body)) !== null) {
    const v = (o[1].match(/\bvalue="([^"]*)"/) || [])[1];
    if (first === null) first = v;
    if (/\bselected\b/.test(o[1])) { selected = v; break; }
  }
  controls[id] = { value: selected === null ? first : selected, checked: false, disabled: false };
}
const documentStub = {
  getElementById(id) { return controls[id] || null; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  addEventListener() {},
  body: { classList: { toggle() {}, add() {}, remove() {} } },
  createElement() { return { style: {}, classList: { add() {}, remove() {} } }; }
};
const windowStub = { document: documentStub, location: { search: '' }, addEventListener() {} };

// 3. Load the core with a Function wrapper (top-level const in the script rules out eval).
const factory = new Function('document', 'window', 'navigator', 'location',
  core + '\nreturn {CANDS:CANDS, simulate:simulate, cfg:cfg, mb:mb, setRng:function(r){rng=r;}};');
const sim = factory(documentStub, windowStub, {}, windowStub.location);
const CANDS = sim.CANDS;
const ids = CANDS.map(c => c.id);

// 4. Apply market anchors.
const M = JSON.parse(fs.readFileSync(MARKETS, 'utf8'));
if (!M.blend || !M.date) throw new Error('markets.json missing blend or date');
CANDS.forEach(c => {
  const b = M.blend[c.id];
  if (typeof b !== 'number') throw new Error('markets.json blend lacks ' + c.id);
  c.mkt = b;
  const r = M.run ? M.run[c.id] : undefined;
  if (typeof r === 'number' && c.run > 0 && c.run < 100) c.run = Math.round(r);
});
// AOC and Harris run probabilities live on the sliders, so the run market sets those too.
if (M.run && typeof M.run.aoc === 'number') controls.pAoc.value = String(Math.round(M.run.aoc));
if (M.run && typeof M.run.harris === 'number') controls.pHarris.value = String(Math.round(M.run.harris));

// 5. Run the simulation at default settings with a date-seeded generator.
const C = sim.cfg();
let seed = 0;
for (const ch of M.date) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
sim.setRng(sim.mb(seed || 1));
const first = {};
ids.forEach(id => first[id] = 0);
let contested = 0;
for (let i = 0; i < RUNS; i++) {
  const r = sim.simulate(C, false);
  first[r.winner]++;
  if (!r.majority) contested++;
}
const share = {};
ids.forEach(id => share[id] = Math.round(first[id] / RUNS * 1000) / 10);

// 6. Append to history.csv, extending the header when the model has new candidates.
let header = ['date'].concat(ids.map(id => 'm_' + id)).concat(ids.map(id => 'k_' + id));
let existing = [];
if (fs.existsSync(HISTORY)) {
  const lines = fs.readFileSync(HISTORY, 'utf8').replace(/\r/g, '').split('\n').filter(l => l.trim().length);
  if (lines.length) {
    const oldHeader = lines[0].split(',');
    const extra = oldHeader.filter(h => !header.includes(h));
    header = header.concat(extra); // never drop a column that already exists
    existing = lines.slice(1).map(l => {
      const cells = l.split(',');
      const row = {};
      oldHeader.forEach((h, i) => row[h] = cells[i] === undefined ? '' : cells[i]);
      return row;
    });
  }
}
if (existing.some(r => r.date === M.date)) {
  console.log('history.csv already has a row for ' + M.date + '; nothing appended');
  process.exit(0);
}
const newRow = { date: M.date };
ids.forEach(id => { newRow['m_' + id] = String(share[id]); newRow['k_' + id] = String(M.blend[id]); });
const rows = existing.concat([newRow]);
const out = [header.join(',')].concat(rows.map(r => header.map(h => r[h] === undefined ? '' : r[h]).join(','))).join('\n') + '\n';
fs.writeFileSync(HISTORY, out);

const top = ids.slice().sort((a, b) => share[b] - share[a]).slice(0, 8);
console.log('Appended ' + M.date + ' to history.csv (' + RUNS + ' runs, ' + Math.round(contested / RUNS * 100) + '% contested)');
console.log(top.map(id => id + ' ' + share[id]).join(', '));
