#!/usr/bin/env node
// Old (equal weight, 30 days) against new (weighted, pollavg.js) national poll averages for the top ten.
// Usage: node scripts/polls_compare.js [YYYY-MM-DD]   (date defaults to markets.json)
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const PA = require(path.join(ROOT, 'pollavg.js'));
const M = JSON.parse(fs.readFileSync(path.join(ROOT, 'markets.json'), 'utf8'));
const day = process.argv[2] || M.date;
const rows = PA.parseCSV(fs.readFileSync(path.join(ROOT, 'polls.csv'), 'utf8'));
const ps = PA.parsePollsters(fs.readFileSync(path.join(ROOT, 'pollsters.csv'), 'utf8'));
const ids = Object.keys(M.blend).filter(id => id !== 'other');
const o = PA.equal(rows, day, ids), w = PA.weighted(rows, ps, day, ids);
const top = ids.filter(id => typeof w.avg[id] === 'number').sort((a, b) => w.avg[b] - w.avg[a]).slice(0, 10);
const f = x => typeof x === 'number' ? x.toFixed(1) : 'n/a';
console.log('Poll averages to ' + day + ': old = equal weight, 30 days; new = weighted, ' + w.window + ' days, half-life ' + w.halfLife + ' (' + w.used + ' polls)');
console.log('candidate'.padEnd(11) + 'old'.padStart(7) + 'new'.padStart(7) + 'blend'.padStart(8));
top.forEach(id => console.log(id.padEnd(11) + f(o.avg[id]).padStart(7) + f(w.avg[id]).padStart(7) + f(M.blend[id]).padStart(8)));
