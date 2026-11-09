#!/usr/bin/env node
// Fit the name ID growth rate r (knobs.json nameid_growth, SIMRULES.nidR) to one case: Pete Buttigieg went from
// about 15 percent heard-of in January 2019 to about 80 percent by the Iowa caucus on Feb. 3, 2020.
// The news index is his monthly news volume over the median of the 2019 Democratic field (26 candidates) that month,
// capped like the live model (SIMRULES.nidNewsCap), from backtest-2020/data/news_2019_<src>.csv: GDELT article
// counts (gdelt) or English Wikipedia pageviews (wiki). His attention score
// is the blind 2019 score in backtest-2020/data/attention_scores_2019-12.csv. Each month:
//   x += r * score/10 * news_index * (1 - x)
// r is solved by bisection. As a check, the fit's value for Dec. 3, 2019 is printed beside the Economist/YouGov
// reading that week (backtest-2020/data/nameid_2019-12.csv), which the fit never sees.
// Usage: node scripts/fit_nameid.js
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'backtest-2020', 'data');
const X0 = 0.15, TARGET = 0.80, CAP = 3, WHO = 'PeteButtigieg';

function csv(f) {
  const lines = fs.readFileSync(path.join(DATA, f), 'utf8').trim().split('\n');
  const head = lines[0].split(',');
  return lines.slice(1).map(l => { const c = l.split(','); return Object.fromEntries(head.map((h, i) => [h, c[i]])); });
}
// news source: GDELT article counts when the full set is in data/, Wikipedia pageviews otherwise (NEWS_SRC overrides)
const SRC = process.env.NEWS_SRC || (fs.existsSync(path.join(DATA, 'news_2019_gdelt.csv')) ? 'gdelt' : 'wiki');
const months = csv('news_2019_' + SRC + '.csv');
const score = +csv('attention_scores_2019-12.csv').find(r => r.id === 'buttigieg').score;
const names = Object.keys(months[0]).filter(k => !['month', 'days', 'full'].includes(k));
const med = a => { const s = a.slice().sort((x, y) => x - y), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const steps = months.map(r => {
  const v = names.map(n => +r[n]).filter(x => x > 0);
  const m = med(v);
  return { month: r.month, frac: +r.days / +r.full, pete: +r[WHO], median: m, idx: Math.min(CAP, m > 0 ? +r[WHO] / m : 1) };
});
function run(r, upto) {
  let x = X0;
  for (const s of steps) {
    if (upto && s.month > upto) break;
    const k = Math.min(1, r * score / 10 * s.idx);
    x = 1 - (1 - x) * Math.pow(1 - k, s.frac);
  }
  return x;
}
let lo = 0, hi = 1;
for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (run(mid) < TARGET) lo = mid; else hi = mid; }
const r = Math.round((lo + hi) / 2 * 10000) / 10000;
console.log('Source: ' + SRC + '. Buttigieg, attention score ' + score + ', from ' + X0 * 100 + ' percent in January 2019 to ' + TARGET * 100 + ' percent on Feb. 3, 2020');
console.log('month    his volume    field median  news index  name ID after');
let x = X0;
steps.forEach(s => {
  const k = Math.min(1, r * score / 10 * s.idx);
  x = 1 - (1 - x) * Math.pow(1 - k, s.frac);
  console.log(s.month.padEnd(9) + String(s.pete).padStart(12) + String(Math.round(s.median)).padStart(14) + s.idx.toFixed(2).padStart(12) + (x * 100).toFixed(1).padStart(15));
});
const dec = run(r, '2019-11') ; // through November, then 3 days of December
const decIdx = steps.find(s => s.month === '2019-12').idx;
const dec3 = 1 - (1 - dec) * Math.pow(1 - Math.min(1, r * score / 10 * decIdx), 3 / 31);
const meas = csv('nameid_2019-12.csv').find(r => r.id === 'buttigieg');
console.log('fitted r = ' + r);
console.log('check: fit says ' + (dec3 * 100).toFixed(1) + ' percent on Dec. 3, 2019; Economist/YouGov measured ' + meas.heard_of + ' that week');
