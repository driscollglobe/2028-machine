#!/usr/bin/env node
// Weekly changelog: plain prose from history.csv, written to changelog/YYYY-MM-DD.md
// so it can be pasted into a Substack draft. Node 20, no packages.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HISTORY = path.join(ROOT, 'history.csv');
const OUTDIR = path.join(ROOT, 'changelog');
const NAMES = { newsom: 'Gavin Newsom', aoc: 'AOC', ossoff: 'Jon Ossoff', harris: 'Kamala Harris', shapiro: 'Josh Shapiro', pete: 'Pete Buttigieg', pritzker: 'JB Pritzker', khanna: 'Ro Khanna', murphy: 'Chris Murphy', kelly: 'Mark Kelly', beshear: 'Andy Beshear', rahm: 'Rahm Emanuel', whitmer: 'Gretchen Whitmer', moore: 'Wes Moore', warnock: 'Raphael Warnock', talarico: 'James Talarico', elsayed: 'Abdul El-Sayed', stewart: 'Jon Stewart', fain: 'Shawn Fain', walz: 'Tim Walz', other: 'the field' };

function parseCSV(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim().length);
  const head = lines[0].split(',');
  return lines.slice(1).map(l => { const c = l.split(','); const o = {}; head.forEach((h, i) => o[h] = c[i] === undefined ? '' : c[i]); return o; });
}
const num = v => { const x = parseFloat(v); return isFinite(x) ? x : null; };
const name = id => NAMES[id] || id;
const sgn = x => (x > 0 ? 'up ' : 'down ') + Math.abs(x).toFixed(1);
const longDate = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
function joinList(parts) {
  if (parts.length <= 1) return parts.join('');
  return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
}

const rows = parseCSV(fs.readFileSync(HISTORY, 'utf8')).filter(r => r.date);
if (!rows.length) throw new Error('history.csv has no rows');
const last = rows[rows.length - 1];
const lastT = new Date(last.date + 'T12:00:00Z').getTime();
const weekAgo = lastT - 7 * 86400000;
let base = rows[0];
for (const r of rows) { if (new Date(r.date + 'T12:00:00Z').getTime() <= weekAgo) base = r; }
if (base === last && rows.length > 1) base = rows[rows.length - 2];
const single = base === last;

const ids = Object.keys(NAMES).filter(id => id !== 'other' && num(last['k_' + id]) !== null);
const d = ids.map(id => ({
  id,
  k1: num(last['k_' + id]), k0: num(base['k_' + id]),
  m1: num(last['m_' + id]), m0: num(base['m_' + id]),
  r1: num(last['run_' + id]), r0: num(base['run_' + id])
})).map(x => ({ ...x,
  dk: (x.k0 === null || x.k1 === null) ? null : x.k1 - x.k0,
  dm: (x.m0 === null || x.m1 === null) ? null : x.m1 - x.m0,
  dgap: (x.k0 === null || x.k1 === null || x.m0 === null || x.m1 === null) ? null : (x.m1 - x.k1) - (x.m0 - x.k0),
  dr: (x.r0 === null || x.r1 === null) ? null : x.r1 - x.r0
}));

const paras = [];
const title = 'The 2028 Machine, week of ' + longDate(last.date);
if (single) {
  paras.push('This is the first week the machine has been on the record, so there is nothing to compare yet. As of ' + longDate(last.date) + ' the market blend has ' + joinList(d.slice().sort((a, b) => b.k1 - a.k1).slice(0, 3).map(x => name(x.id) + ' at ' + x.k1.toFixed(1))) + ', and the model at its default settings has ' + joinList(d.slice().sort((a, b) => b.m1 - a.m1).slice(0, 3).map(x => name(x.id) + ' finishing first ' + x.m1.toFixed(1) + ' percent of the time')) + '. The comparisons start next week.');
} else {
  const span = 'between ' + longDate(base.date) + ' and ' + longDate(last.date);
  const movers = d.filter(x => x.dk !== null && Math.abs(x.dk) >= 0.05).sort((a, b) => Math.abs(b.dk) - Math.abs(a.dk)).slice(0, 4);
  if (movers.length) paras.push('The biggest market moves ' + span + ' were ' + joinList(movers.map(x => name(x.id) + ', ' + sgn(x.dk) + ' points to ' + x.k1.toFixed(1))) + '. Everyone else moved less than that, and most of the field did not move at all.');
  else paras.push('The market did not move ' + span + '. No candidate’s blended price changed by more than a tenth of a point.');

  const gaps = d.filter(x => x.dgap !== null && Math.abs(x.dgap) >= 0.05).sort((a, b) => Math.abs(b.dgap) - Math.abs(a.dgap)).slice(0, 3);
  if (gaps.length) paras.push('The model’s disagreement with the market changed most for ' + joinList(gaps.map(x => name(x.id) + ', where the gap between model share and market price went from ' + (x.m0 - x.k0).toFixed(1) + ' to ' + (x.m1 - x.k1).toFixed(1))) + '. A widening gap means the machine and the traders are reading the same news differently.');
  else paras.push('The gap between what the machine believes and what the market prices did not change meaningfully for anyone this week.');

  const crosses = [];
  d.forEach(x => {
    [['k', 'market price'], ['m', 'model share']].forEach(([key, label]) => {
      const a = x[key + '0'], b = x[key + '1'];
      if (a === null || b === null) return;
      [5, 10].forEach(t => {
        if (a < t && b >= t) crosses.push(name(x.id) + ' crossed above ' + t + ' in ' + label + ' (' + a.toFixed(1) + ' to ' + b.toFixed(1) + ')');
        if (a >= t && b < t) crosses.push(name(x.id) + ' fell below ' + t + ' in ' + label + ' (' + a.toFixed(1) + ' to ' + b.toFixed(1) + ')');
      });
    });
  });
  if (crosses.length) paras.push('Threshold watch: ' + joinList(crosses) + '. Five and ten are the lines where a candidate stops being a footnote and starts being a lane.');
  else paras.push('Nobody crossed five or ten in either direction this week, in the market or in the model.');

  const runs = d.filter(x => x.dr !== null && Math.abs(x.dr) >= 0.5).sort((a, b) => Math.abs(b.dr) - Math.abs(a.dr)).slice(0, 4);
  if (runs.length) paras.push('On the question of who actually runs, the Kalshi run market moved ' + joinList(runs.map(x => name(x.id) + ' ' + sgn(x.dr) + ' points to ' + x.r1.toFixed(0) + ' percent')) + '.');
  else if (d.some(x => x.dr !== null)) paras.push('The run market was quiet. No candidate’s probability of entering the race moved by half a point or more.');
  else paras.push('Run probability history begins with this week’s rows, so the run market comparison starts next week.');
}
paras.push('The machine reruns 20,000 primaries every morning on that day’s Kalshi and Polymarket prices and logs the result, so this is a record of what it believed and when, not a forecast.');

const md = title + '\n\n' + paras.join('\n\n') + '\n';
fs.mkdirSync(OUTDIR, { recursive: true });
const file = path.join(OUTDIR, last.date + '.md');
fs.writeFileSync(file, md);
console.log('wrote changelog/' + last.date + '.md');
console.log(md);
