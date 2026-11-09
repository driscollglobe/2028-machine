#!/usr/bin/env node
// Reproduce the worked primary on methodology.html: one run of the sim, fixed seed, default settings,
// with the market, anchor and approval inputs frozen in methodology/.
//   node scripts/methodology_run.js [seed]        prints every number the page uses
//   node scripts/methodology_run.js --find N      lists the first N seeds that reach a second ballot
'use strict';
var LATER_IDS;
const fs = require('fs');
const path = require('path');
const core = require('./simcore');

function run(seed) {
  // The page was written on 2026-11-09 against the field and settings of that morning. Candidates added
  // later are removed and later default changes are pinned back, so seed 5 keeps reproducing the page.
  const LATER = ['booker', 'gallego', 'slotkin', 'vanhollen'];
  const sim = core.load(undefined, 'SIMRULES.lateField=3;SIMRULES.winnow=0.07;SIMRULES.winnowFail=0.05;LATER_IDS=' + JSON.stringify(LATER) + ';LATER_IDS.forEach(id=>{const i=CANDS.findIndex(c=>c.id===id);if(i>=0)CANDS.splice(i,1);});');
  sim.controls.pCrowd.value = '15';
  sim.CANDS.find(c => c.id === 'khanna').base = 5; // lowered to 0.5 after the page was written
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
