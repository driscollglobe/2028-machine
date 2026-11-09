#!/usr/bin/env node
// Reproduce the worked primary on methodology.html: one run of the sim, fixed seed, default settings,
// with the market, anchor and approval inputs frozen in methodology/.
//   node scripts/methodology_run.js [seed]        prints every number the page uses
//   node scripts/methodology_run.js --find N      lists the first N seeds that reach a second ballot
'use strict';
const fs = require('fs');
const path = require('path');
const core = require('./simcore');

function run(seed) {
  const sim = core.load();
  // inputs are frozen in methodology/ so the page stays reproducible after the nightly files move on
  const snap = f => JSON.parse(fs.readFileSync(path.join(core.ROOT, 'methodology', f), 'utf8'));
  const M = snap('markets.json');
  core.applyMarkets(sim, M);
  core.applyAnchor(sim, snap('anchor.json'));
  sim.controls.pTrump.value = String(snap('approval.json').value);
  const C = sim.cfg();
  sim.setRng(sim.mb(seed));
  const r = sim.simulate(C, true);
  return { seed, markets_date: M.date, anchor: C.anchor, crowd: C.crowd, autoLean: C.autoLean, winner: r.winner, ballot: r.ballot, steps: r.steps, mkt: Object.fromEntries(sim.CANDS.map(c => [c.id, c.mkt])), mstr: Object.fromEntries(sim.CANDS.map(c => [c.id, c.mstr])), opbase: Object.fromEntries(sim.CANDS.map(c => [c.id, c.base])) };
}

const arg = process.argv[2];
if (arg === '--find') {
  const want = +(process.argv[3] || 5); let found = 0;
  for (let s = 1; s < 5000 && found < want; s++) {
    const r = run(s);
    if (r.ballot >= 2) { found++; const su = r.steps.find(x => x.type === 'setup'); console.log(s, 'ballot', r.ballot, 'winner', r.winner, 'field', su.inRace.length, 'cal', su.calKey, 'theme', su.theme); }
  }
} else {
  const r = run(+(arg || 2028));
  const round = x => typeof x === 'number' ? Math.round(x * 1000) / 1000 : x;
  console.log(JSON.stringify(r, (k, v) => round(v), 1));
}
