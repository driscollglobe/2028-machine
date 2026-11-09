#!/usr/bin/env node
// Nightly turning point heatmap: the same 5,000 matched-seed pairs per lever the page runs on
// "Recompute with my settings", at default settings with today's markets and anchor. Writes
// heatmap.json (every cell) and rankings.json (levers by average swing, which also picks the chips).
// Node 20, no packages. The sim, the levers and the seeds all come from index.html via simcore.
'use strict';
const fs = require('fs');
const path = require('path');
const core = require('./simcore');

const ROOT = core.ROOT;
const PAIRS = +(process.env.HM_PAIRS || 5000);
const sim = core.load();
if (!sim.computeHeatmap) throw new Error('index.html has no computeHeatmap');
const M = JSON.parse(fs.readFileSync(path.join(ROOT, 'markets.json'), 'utf8'));
core.applyMarkets(sim, M);

const t0 = Date.now();
const results = sim.computeHeatmap(sim.cfg(), PAIRS);
const r1 = x => Math.round(x * 10) / 10;
const clean = results.map(r => ({
  key: r.key, bp: r.bp, mover: r.mover, mv: r1(r.mv), avgSwing: Math.round(r.avgSwing * 100) / 100,
  sw: Object.fromEntries(Object.entries(r.sw).map(([k, v]) => [k, r1(v)]))
}));
fs.writeFileSync(path.join(ROOT, 'heatmap.json'), JSON.stringify({ date: M.date, pairs: PAIRS, watch: sim.HM_WATCH, results: clean }, null, 1) + '\n');
const ranked = clean.slice().sort((a, b) => b.avgSwing - a.avgSwing);
fs.writeFileSync(path.join(ROOT, 'rankings.json'), JSON.stringify({ date: M.date, pairs: PAIRS, ranked }, null, 1) + '\n');
console.log('heatmap.json and rankings.json for ' + M.date + ' (' + (PAIRS * clean.length).toLocaleString('en-US') + ' matched pairs, ' + ((Date.now() - t0) / 1000).toFixed(1) + 's)');
ranked.forEach((r, i) => console.log((i + 1) + '. ' + r.key + ' ' + r.avgSwing + ' (' + r.mover + ' ' + r.mv + ')'));
