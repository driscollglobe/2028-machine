#!/usr/bin/env node
// What turns an Iowa win into the nomination. Runs the default settings with the DNC calendar and with
// Iowa crashing the window on the same seeds, and prints the chain for one candidate (default Buttigieg):
// Iowa win rate, the momentum multiplier he carries out of the early window, New Hampshire and South
// Carolina, delegates after the early window, survival, and the nomination. Then it switches each link
// off in turn to show which ones carry the swing.
//   node scripts/iowa_trace.js [id] [runs]      current rules
//   BEFORE=1 node scripts/iowa_trace.js         rules before 2026-11-09 (no state cap, calendar bonus all season)
'use strict';
const fs = require('fs');
const path = require('path');
const core = require('./simcore');

const W = process.argv[2] || 'pete';
const N = +(process.argv[3] || 4000);
const BEFORE = process.env.BEFORE ? 'SIMRULES.stateCap=0;SIMRULES.calEarly=false;' : '';
const M = JSON.parse(fs.readFileSync(path.join(core.ROOT, 'markets.json'), 'utf8'));

function chain(inject) {
  const sim = core.load(undefined, BEFORE + (inject || ''));
  core.applyMarkets(sim, M);
  const out = {};
  for (const cal of ['R', 'IA']) {
    const C = sim.cfg(); C.calKey = cal;
    let ran = 0, ia = 0, nh = 0, sc = 0, scs = 0, nsc = 0, alive = 0, mom = 0, dels = 0, nom = 0;
    for (let i = 0; i < N; i++) {
      sim.setRng(sim.mb(core.seedFrom('iowa:' + i)));
      const r = sim.simulate(C, true);
      if (r.winner === W) nom++;
      if (!r.steps.find(s => s.type === 'setup').inRace.includes(W)) continue;
      ran++;
      const st = r.steps.filter(s => s.type === 'state');
      const at = k => st.find(s => s.st === k);
      const first = k => at(k) && at(k).shares[0] && at(k).shares[0].k === W;
      if (first('IA')) ia++;
      if (first('NH')) nh++;
      if (first('SC')) sc++;
      const x = at('SC') && at('SC').trace.shares.find(y => y.k === W);
      if (x) { scs += x.s; nsc++; }
      const ew = st[st.findIndex(s => s.st === 'ST') - 1].trace; // the last early state
      if (ew.alive[W]) { alive++; mom += ew.mom[W]; }
      dels += ew.dels[W];
    }
    out[cal] = { ran, ia: ia / ran, nh: nh / ran, sc: sc / ran, scShare: nsc ? scs / nsc : 0, alive: alive / ran, mom: alive ? mom / alive : 0, dels: dels / ran, nom: nom / N };
  }
  return out;
}

const pct = x => (x * 100).toFixed(1);
const name = W === 'pete' ? 'Buttigieg' : W;
const base = chain('');
console.log((process.env.BEFORE ? 'Rules before 2026-11-09' : 'Current rules') + ', ' + M.date + ' books, ' + N + ' matched seeds, ' + name);
console.log('                                   DNC order   Iowa first');
const row = (l, a, b) => console.log(l.padEnd(35) + String(a).padStart(9) + String(b).padStart(13));
row('Runs where he is in the race', base.R.ran, base.IA.ran);
row('Wins Iowa (pct of his runs)', pct(base.R.ia), pct(base.IA.ia));
row('Wins New Hampshire', pct(base.R.nh), pct(base.IA.nh));
row('Wins South Carolina', pct(base.R.sc), pct(base.IA.sc));
row('South Carolina vote share', pct(base.R.scShare), pct(base.IA.scShare));
row('Still in after the early window', pct(base.R.alive), pct(base.IA.alive));
row('Momentum multiplier, if still in', base.R.mom.toFixed(2), base.IA.mom.toFixed(2));
row('Delegates after the early window', base.R.dels.toFixed(1), base.IA.dels.toFixed(1));
row('Finishes first (pct of all runs)', pct(base.R.nom), pct(base.IA.nom));
console.log('Swing: ' + ((base.IA.nom - base.R.nom) * 100).toFixed(1) + ' points');
console.log('');
console.log('Switch one link off, swing that remains:');
const links = [
  ['Momentum off (momWin, momSecond = 1)', 'SIMRULES.momWin=1;SIMRULES.momSecond=1;'],
  ['Calendar bonus off for him (CAL)', 'Object.values(CAL).forEach(t=>{delete t[' + JSON.stringify(W) + '];});'],
  ['Iowa and NH fits set to 1', 'CANDS.find(c=>c.id===' + JSON.stringify(W) + ').fit.IA=1;CANDS.find(c=>c.id===' + JSON.stringify(W) + ').fit.NH=1;'],
  ['No early dropout (winnow 0)', 'SIMRULES.winnow=0;SIMRULES.winnowFail=0;']
];
links.forEach(([l, inj]) => { const r = chain(inj); console.log('  ' + l.padEnd(40) + ((r.IA.nom - r.R.nom) * 100).toFixed(1)); });
