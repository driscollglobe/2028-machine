#!/usr/bin/env node
// Nightly baseline: run the simulation core from index.html at default settings
// with the latest market anchors from markets.json, append one row to history.csv,
// and write default.json so the page can paint the default run without simulating.
// Node 20, no npm packages.
'use strict';
const fs = require('fs');
const path = require('path');
const core = require('./simcore');

const ROOT = core.ROOT;
const MARKETS = path.join(ROOT, 'markets.json');
const HISTORY = path.join(ROOT, 'history.csv');
const DEFAULT = path.join(ROOT, 'default.json');
const RUNS = 20000;

const sim = core.load();
const CANDS = sim.CANDS;
const ids = CANDS.map(c => c.id);

const M = JSON.parse(fs.readFileSync(MARKETS, 'utf8'));
core.applyMarkets(sim, M);

const C = sim.cfg();
const res = core.runMany(sim, C, RUNS, core.seedFrom(M.date));
const share = res.first;

// default.json: everything the page needs to paint the default state.
const runProb = {};
CANDS.forEach(c => { runProb[c.id] = c.id === 'aoc' ? +sim.controls.pAoc.value : (c.id === 'harris' ? +sim.controls.pHarris.value : c.run); });
const order = ids.slice().sort((a, b) => share[b] - share[a]);
const def = {
  date: M.date,
  runs: RUNS,
  contested: res.contested,
  frontrunner: { id: order[0], share: share[order[0]] },
  first: share,
  majority: res.majority,
  lead: res.lead,
  order: order,
  mkt: Object.fromEntries(CANDS.map(c => [c.id, c.mkt])),
  run: runProb
};
fs.writeFileSync(DEFAULT, JSON.stringify(def, null, 1) + '\n');

// history.csv: date, m_<id> model share, k_<id> blended price, then kal_/poly_/run_ per book detail.
let header = ['date'].concat(ids.map(id => 'm_' + id)).concat(ids.map(id => 'k_' + id))
  .concat(ids.map(id => 'kal_' + id)).concat(ids.map(id => 'poly_' + id)).concat(ids.map(id => 'run_' + id));
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
// One row per date: a rerun on the same day replaces that day's row. Older rows are never touched.
const num = v => (typeof v === 'number' && isFinite(v)) ? String(v) : '';
const newRow = { date: M.date };
ids.forEach(id => {
  newRow['m_' + id] = String(share[id]);
  newRow['k_' + id] = String(M.blend[id]);
  newRow['kal_' + id] = num(M.kalshi ? M.kalshi[id] : undefined);
  newRow['poly_' + id] = num(M.polymarket ? M.polymarket[id] : undefined);
  newRow['run_' + id] = num(runProb[id]);
});
const replaced = existing.some(r => r.date === M.date);
const rows = existing.filter(r => r.date !== M.date).concat([newRow]);
const out = [header.join(',')].concat(rows.map(r => header.map(h => r[h] === undefined ? '' : r[h]).join(','))).join('\n') + '\n';
fs.writeFileSync(HISTORY, out);

console.log((replaced ? 'Replaced ' : 'Appended ') + M.date + ' in history.csv (' + RUNS + ' runs, ' + res.contested + '% contested); wrote default.json');
console.log(order.slice(0, 8).map(id => id + ' ' + share[id]).join(', '));
