#!/usr/bin/env node
// Print the raw and long-shot corrected blend side by side for the top ten, with each book's correction.
// The curve lives in index.html (longshot, LONGSHOT). Usage: node scripts/longshot.js [n]
'use strict';
const fs = require('fs');
const path = require('path');
const core = require('./simcore');
const n = +(process.argv[2] || 10);
const sim = core.load();
const M = JSON.parse(fs.readFileSync(path.join(core.ROOT, 'markets.json'), 'utf8'));
const MA = sim.correctedBlend(M);
const K = M.kalshi ? sim.longshot(M.kalshi) : {}, P = M.polymarket ? sim.longshot(M.polymarket) : {};
const f = x => typeof x === 'number' ? x.toFixed(1) : '';
const ids = Object.keys(M.blend).filter(id => id !== 'other').sort((a, b) => M.blend[b] - M.blend[a]).slice(0, n);
console.log('Long-shot correction, ' + M.date + ' books');
console.log('candidate'.padEnd(11) + 'raw blend'.padStart(10) + 'corrected'.padStart(10) + '   kalshi raw/corr   poly raw/corr');
ids.forEach(id => console.log(id.padEnd(11) + f(M.blend[id]).padStart(10) + f(MA[id]).padStart(10) + ('   ' + f(M.kalshi[id]) + ' / ' + f(K[id])).padEnd(18) + ('   ' + f(M.polymarket[id]) + ' / ' + f(P[id]))));
console.log('other'.padEnd(11) + f(M.blend.other).padStart(10) + f(MA.other).padStart(10));
