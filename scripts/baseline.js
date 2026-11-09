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
const WIRE = path.join(ROOT, 'wire.json');
const wire = require('./wire');
const RUNS = +(process.env.RUNS || 50000); // 50,000 since 2026-11-09: about 4 seconds locally, and about 37 percent less seed noise than 20,000

const sim = core.load();
const CANDS = sim.CANDS;
const ids = CANDS.map(c => c.id);

const M = JSON.parse(fs.readFileSync(MARKETS, 'utf8'));
core.applyMarkets(sim, M);

const C = sim.cfg();
const res = core.runMany(sim, C, RUNS, core.seedFrom(M.date));
const share = res.first;

// Poll minus market gap per candidate, the same numbers gap.html shows: the weighted national average
// (pollavg.js, pollsters.csv) up to the market date, minus the raw blend. Graded by calls.js as gap.<id>.
// A candidate with no poll in the window has no gap.
const PA = require(path.join(ROOT, 'pollavg.js'));
function pollGap() {
  const file = path.join(ROOT, 'polls.csv');
  if (!fs.existsSync(file)) return {};
  const pf = path.join(ROOT, 'pollsters.csv');
  const ps = fs.existsSync(pf) ? PA.parsePollsters(fs.readFileSync(pf, 'utf8')) : {};
  const w = PA.weighted(PA.parseCSV(fs.readFileSync(file, 'utf8')), ps, M.date, ids);
  const gap = {};
  Object.keys(w.avg).forEach(id => {
    if (id === 'other' || typeof M.blend[id] !== 'number') return;
    gap[id] = Math.round((w.avg[id] - M.blend[id]) * 10) / 10;
  });
  return gap;
}

// default.json: everything the page needs to paint the default state.
const runProb = {};
// runIfAocOut candidates (El-Sayed): run odds are the chance AOC stays out times their chance then
CANDS.forEach(c => { runProb[c.id] = c.id === 'aoc' ? +sim.controls.pAoc.value : (c.id === 'harris' ? +sim.controls.pHarris.value : (typeof c.runIfAocOut === 'number' ? Math.round((1 - sim.controls.pAoc.value / 100) * c.runIfAocOut) : c.run)); });
const order = ids.slice().sort((a, b) => share[b] - share[a]);
const def = {
  date: M.date,
  runs: RUNS,
  anchor: +sim.controls.pAnchor.value,
  contested: res.contested,
  unresolved: res.unresolved,
  ballots: res.ballots,
  frontrunner: { id: order[0], share: share[order[0]] },
  // first and second within 2 points: the page, card, wire and desk note name both (index.html twoWay)
  two_way: sim.twoWay(order.map(id => ({ id, first: share[id] }))),
  first: share,
  range: res.range || {},
  dist: res.dist || {},
  draws: res.draws || 0,
  spread: C.spread || 0,
  days_to_sc: typeof C.days === 'number' ? C.days : null,
  majority: res.majority,
  lead: res.lead,
  order: order,
  mkt: Object.fromEntries(CANDS.map(c => [c.id, c.mkt])),
  run: runProb,
  gap: pollGap(),
  resolved: Object.keys(sim.RESOLVED || {}).map(k => ({ id: k, label: sim.RESOLVED[k].label, date: sim.RESOLVED[k].date, outcome: sim.RESOLVED[k].outcome }))
};
fs.writeFileSync(DEFAULT, JSON.stringify(def, null, 1) + '\n');

// history.csv: date, m_<id> model share, k_<id> blended price, then kal_/poly_/run_ per book detail.
let header = ['date'].concat(ids.map(id => 'm_' + id)).concat(ids.map(id => 'k_' + id))
  .concat(ids.map(id => 'kal_' + id)).concat(ids.map(id => 'poly_' + id)).concat(ids.map(id => 'run_' + id))
  .concat(['note']);
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
// note: a structural change (a model rebuild, a resolved lever) that moves the default numbers without the books.
// Set with the NOTE env var (the workflow_dispatch input) on the day it lands. A rerun on the same date keeps it. Notes cannot hold commas
// or quotes because every reader splits this file on commas.
const prior = existing.find(r => r.date === M.date);
const envNote = (process.env.NOTE || '').trim();
if (/[,"]/.test(envNote)) throw new Error('NOTE contains a comma or quote: ' + envNote);
newRow.note = envNote || (prior && prior.note ? prior.note : '');
existing.forEach(r => { if (/[,"]/.test(r.note || '')) throw new Error('history.csv note on ' + r.date + ' contains a comma or quote'); });
const replaced = !!prior;
const rows = existing.filter(r => r.date !== M.date).concat([newRow]);
const out = [header.join(',')].concat(rows.map(r => header.map(h => r[h] === undefined ? '' : r[h]).join(','))).join('\n') + '\n';
fs.writeFileSync(HISTORY, out);

// wire.json: the ticker, from today's markets and default run, against the previous history row.
const prevRow = rows.length > 1 ? rows[rows.length - 2] : null;
const items = wire.wireItems(M, def, prevRow, CANDS, sim.RESOLVED);
fs.writeFileSync(WIRE, JSON.stringify({ date: M.date, items }, null, 1) + '\n');

console.log((replaced ? 'Replaced ' : 'Appended ') + M.date + ' in history.csv (' + RUNS + ' runs, ' + res.contested + '% contested); wrote default.json and wire.json');
console.log(order.slice(0, 8).map(id => id + ' ' + share[id] + (res.range ? ' (likely ' + Math.round(res.range[id][0]) + ' to ' + Math.round(res.range[id][1]) + ')' : '')).join(', '));
