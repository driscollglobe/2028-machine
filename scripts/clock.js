#!/usr/bin/env node
// The clock: rerun today's default with the calendar moved, so the model sees N days left to South Carolina.
// Markets, anchor and every control stay at today's values; only the event rate and the prior spread move.
// Usage: node scripts/clock.js [days...]   (default: today, 180, 30)
'use strict';
const fs = require('fs');
const path = require('path');
const core = require('./simcore');
const M = JSON.parse(fs.readFileSync(path.join(core.ROOT, 'markets.json'), 'utf8'));
const RUNS = 20000;
const args = process.argv.slice(2).map(Number).filter(x => isFinite(x));
const sim = core.load();
core.applyMarkets(sim, M);
const sc = Date.parse(sim.CLOCK.sc + 'T00:00:00Z');
const todayDays = sim.daysToSC();
const list = args.length ? args : [todayDays, 180, 30];
const ids = sim.CANDS.map(c => c.id).filter(id => id !== 'other');
list.forEach(d => {
  sim.CLOCK.today = new Date(sc - d * 86400000).toISOString().slice(0, 10);
  const C = sim.cfg();
  const r = core.runMany(sim, C, RUNS, core.seedFrom(M.date));
  const top = ids.slice().sort((a, b) => r.first[b] - r.first[a]).slice(0, 5);
  console.log(d + ' days to South Carolina (' + sim.CLOCK.today + '), event rate ' + C.pEv.toFixed(3) + ', spread ' + C.spread.toFixed(3) + ', convention ' + r.contested);
  console.log('  ' + top.map(id => id + ' ' + r.first[id] + ' (likely ' + Math.round(r.range[id][0]) + ' to ' + Math.round(r.range[id][1]) + ')').join(', '));
});
