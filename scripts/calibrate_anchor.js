#!/usr/bin/env node
// Nightly: fit market strengths for the anchor slider so that a = 100 at default settings
// reproduces the Kalshi and Polymarket blend. Writes anchor.json. Node 20, no packages.
// Method: start from the blend, run the sim at a = 100 with a fixed seed, and scale each
// candidate's strength by (target + k) / (simulated + k), damped. Repeat. Same seed every
// round so the fit moves on the strengths, not on noise.
'use strict';
const fs = require('fs');
const path = require('path');
const core = require('./simcore');

const ROOT = core.ROOT;
const OUT = path.join(ROOT, 'anchor.json');
const ROUNDS = +(process.env.ANCHOR_ROUNDS || 30);
const N = +(process.env.ANCHOR_RUNS || 4000);
const K = 0.3;      // smoothing in points, keeps long shots from blowing up
const DAMP = +(process.env.ANCHOR_DAMP || 0.2); // exponent on the ratio; the sim's response to strength is steep (roughly share ~ strength^5), so steps stay small

const M = JSON.parse(fs.readFileSync(path.join(ROOT, 'markets.json'), 'utf8'));
const sim = core.load();
core.applyMarkets(sim, M);
const ids = sim.CANDS.map(c => c.id);
const target = {};
ids.forEach(id => { target[id] = Math.max(0, M.blend[id] || 0); });

const mstr = {};
ids.forEach(id => { mstr[id] = Math.max(0.05, target[id]); });
const seed = core.seedFrom(M.date + ':anchor');
let err = null, res = null;
for (let r = 0; r < ROUNDS; r++) {
  core.applyAnchor(sim, { mstr });
  sim.controls.pAnchor.value = '100';
  res = core.runMany(sim, sim.cfg(), N, seed);
  if (process.env.DEBUG) console.log(r, Math.round(err||0), 'oss', mstr.ossoff.toFixed(2), res.first.ossoff, 'aoc', mstr.aoc.toFixed(2), res.first.aoc);
  err = ids.reduce((t, id) => t + Math.abs(res.first[id] - target[id]), 0) / 2;
  ids.forEach(id => {
    const ratio = (target[id] + K) / (res.first[id] + K);
    mstr[id] = Math.max(0.01, mstr[id] * Math.pow(ratio, DAMP));
  });
}
const sum = ids.reduce((t, id) => t + mstr[id], 0);
const out = { date: M.date, rounds: ROUNDS, runs: N, distance: Math.round(err * 10) / 10, mstr: {} };
ids.forEach(id => { out.mstr[id] = Math.round(mstr[id] / sum * 100000) / 1000; });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log('anchor.json for ' + M.date + ': total variation distance from the blend ' + out.distance + ' points after ' + ROUNDS + ' rounds');
