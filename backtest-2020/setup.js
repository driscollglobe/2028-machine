// Shared setup for the 2020 backtest: data, the 2020 swap injected into the 2028 sim, and fresh().
// Used by run.js (the results) and flip.js (the revert experiments).
'use strict';
const fs = require('fs');
const path = require('path');
const core = require('../scripts/simcore');
const P = require('./priors');
const HERE = __dirname;

function csv(file) {
  const lines = fs.readFileSync(path.join(HERE, 'data', file), 'utf8').replace(/\r/g, '').trim().split('\n');
  const head = lines[0].split(',');
  return lines.slice(1).map(l => { const c = l.split(','); return Object.fromEntries(head.map((h, i) => [h, c[i] || ''])); });
}

// market: PredictIt last trades normalized to 100 (the book's overround is about 30 cents)
const pi = csv('predictit_2019-11-25.csv');
const piTotal = pi.reduce((t, r) => t + parseFloat(r.last_trade), 0);
const market = {};
P.CANDS.forEach(c => { market[c.id] = 0; });
pi.forEach(r => { if (r.id) market[r.id] = parseFloat(r.last_trade) / piTotal * 100; });
market.other = 100 - P.CANDS.filter(c => c.id !== 'other').reduce((t, c) => t + market[c.id], 0);

// polls: the site's weighted average (pollavg.js, pollsters.csv) as of 2019-12-01. Display only, as in 2028.
const PA = require('../pollavg.js');
const polls = csv('polls_2019-11.csv').map(r => Object.assign({ geography: 'national' }, r));
const pw = PA.weighted(polls, PA.parsePollsters(fs.readFileSync(path.join(HERE, '..', 'pollsters.csv'), 'utf8')), '2019-12-01', P.WATCH);
const poll = {};
P.WATCH.forEach(id => { poll[id] = typeof pw.avg[id] === 'number' ? pw.avg[id] : null; });

// the long-shot correction the 2028 model applies to each book before it anchors (index.html longshot)
const named = {};
P.CANDS.forEach(c => { if (c.id !== 'other') named[c.id] = market[c.id]; });
const corrected = core.load(path.join(HERE, '..', 'index.html')).longshot(named);

// news for the 2019 name ID input: GDELT article counts when the full set is in data/, Wikipedia pageviews otherwise
const NEWS_SRC = process.env.NEWS_SRC || (fs.existsSync(path.join(HERE, 'data', 'attention_2019-11_gdelt.csv')) ? 'gdelt' : 'wiki');
// name ID inputs as nameIdSetup takes them: rows, scores, news rows
const NID_ROWS = [csv('nameid_2019-12.csv'), csv('attention_scores_2019-12.csv'), csv('attention_2019-11_' + NEWS_SRC + '.csv')];
const NID = NID_ROWS.map(r => JSON.stringify(r)).join(',');
const DATA = { CANDS: P.CANDS.map(c => Object.assign({ mkt: market[c.id] }, c)), POOLS: P.POOLS, POOL2: P.POOL2, TM: P.TM, CALS: P.CALS, DELS: P.DELS, WATCH: P.WATCH };
const INJECT = `
const __D = ${JSON.stringify(DATA)};
CANDS.length = 0; __D.CANDS.forEach(c => CANDS.push(c));
[POOLS, POOLOF, POOL2, TM, CALS, CALCLASS].forEach(o => Object.keys(o).forEach(k => delete o[k]));
Object.assign(POOLS, __D.POOLS); Object.keys(POOLS).forEach(p => POOLS[p].forEach(id => POOLOF[id] = p));
Object.assign(POOL2, __D.POOL2); Object.assign(TM, __D.TM); Object.assign(CALS, __D.CALS); Object.assign(DELS, __D.DELS);
// RESOLVED stays: its levers only touch 2028 ids (and Maine only the lesson draw, which is fixed here).
// The clock: 2019-12-01 sits 90 days before South Carolina on 2020-02-29. The window keeps the 2028 span
// (439 days from the start of the narrowing to South Carolina), so 90 days out narrows exactly as it will in 2028.
CLOCK.sc = '2020-02-29'; CLOCK.today = '2019-12-01';
CLOCK.start = new Date(Date.parse('2020-02-29T00:00:00Z') - 439 * 86400000).toISOString().slice(0, 10);
// Name ID: the 2020 calendar dates, Economist/YouGov Dec. 1 to 3, 2019 (data/nameid_2019-12.csv), blind attention
// scores (data/attention_scores_2019-12.csv) and news volume for Nov. 24 to 30, 2019 as the news input
// (data/attention_2019-11_<src>.csv, GDELT or Wikipedia; Google News has no archive for 2019).
CAL_DATES.early = ['2020-02-03', '2020-02-11', '2020-02-22', '2020-02-29']; CAL_DATES.ST = '2020-03-03'; CAL_DATES.LS = '2020-04-28';
nameIdSetup(${NID});
EVENTS.length = 0;
HM_WATCH.length = 0; __D.WATCH.forEach(id => HM_WATCH.push(id));
HM_LEVERS.length = 0;
[
 {key:'New Hampshire goes first',bp:'',apply:(C,hi)=>{C.calKey=hi?'NH':'R';}},
 {key:'Future of work is the issue',bp:'',apply:(C,hi)=>{C.selTheme=hi?'ai':'afford';}},
 {key:'Affordability is the issue',bp:'',apply:(C,hi)=>{C.selTheme=hi?'afford':'norm';}},
 {key:'Electability is the issue',bp:'',apply:(C,hi)=>{C.selTheme=hi?'norm':'afford';}},
 {key:'Establishment coordinates',bp:'',apply:(C,hi)=>{C.pC=hi?1:0;C.pCF=0;}},
 {key:'Coordination fails',bp:'',apply:(C,hi)=>{C.pCF=hi?1:0;}},
 {key:'Dropout transfer',bp:'',apply:(C,hi)=>{C.pDrop=hi?0.7:0;}},
 {key:'Trump approval high',bp:'',apply:(C,hi)=>{C.appr=hi?50:36;C.apprMixed=false;}},
 {key:'Debates matter',bp:'',apply:(C,hi)=>{C.pDb=hi?1:0;}}
].forEach(l => HM_LEVERS.push(l));
`;

// extra: JS run after the 2020 swap, for the revert experiments in flip.js
function fresh(extra) {
  const sim = core.load(path.join(HERE, '..', 'index.html'), INJECT + (extra || ''));
  Object.entries(P.CONTROLS).forEach(([k, v]) => { sim.controls[k].value = v; });
  return sim;
}

module.exports = { NEWS_SRC, P, HERE, core, csv, market, corrected, poll, pw, polls, INJECT, fresh, NID_ROWS };
