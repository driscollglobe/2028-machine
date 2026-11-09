#!/usr/bin/env node
// Nightly: fit market strengths for the anchor slider so that a = 100 at default settings
// reproduces the Kalshi and Polymarket blend after the long-shot correction. Writes anchor.json. Node 20, no packages.
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
// the target is the long-shot corrected blend (index.html longshot), the price the model anchors to
const MA = sim.correctedBlend(M);
ids.forEach(id => { target[id] = Math.max(0, MA[id] || 0); });

const fit = core.fitAnchor(sim, target, { rounds: ROUNDS, runs: N, k: K, damp: DAMP, seed: core.seedFrom(M.date + ':anchor'), debug: !!process.env.DEBUG });
const out = { date: M.date, rounds: ROUNDS, runs: N, distance: fit.distance, mstr: fit.mstr };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log('anchor.json for ' + M.date + ': total variation distance from the blend ' + out.distance + ' points after ' + ROUNDS + ' rounds');
