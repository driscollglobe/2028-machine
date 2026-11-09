#!/usr/bin/env node
// The 2020 backtest. One command:  node backtest-2020/run.js
// Runs the 2028 Machine's own sim code (index.html via scripts/simcore.js) on 2020 data as of 2019-12-01:
// PredictIt prices (data/predictit_2019-11-25.csv), November 2019 national polls (data/polls_2019-11.csv),
// and blind priors (priors.js). Writes results.md, results.csv and card.png (card needs Playwright).
// EVERY OUTPUT IS PROVISIONAL UNTIL KEVIN REVIEWS THE BLIND PRIORS.
'use strict';
const fs = require('fs');
const path = require('path');
const core = require('../scripts/simcore');
const P = require('./priors');

const HERE = __dirname;
const RUNS = +(process.env.RUNS || 50000);
const PAIRS = +(process.env.PAIRS || 5000);
const SEED = core.seedFrom('2019-12-01');
const PROV = 'PROVISIONAL UNTIL KEVIN REVIEWS THE BLIND PRIORS';

const { csv, market, corrected, poll, pw, polls, fresh, NID_ROWS, NEWS_SRC } = require('./setup');

const r1 = x => Math.round(x * 10) / 10;
const ids = P.CANDS.map(c => c.id);

// fit market strengths so anchor 100 reproduces the PredictIt book, as the nightly job does for 2028
const fitSim = fresh();
const fit = core.fitAnchor(fitSim, corrected, { seed: core.seedFrom('2019-12-01:anchor') });

function run(anchor) {
  const sim = fresh();
  core.applyAnchor(sim, { mstr: fit.mstr });
  sim.controls.pAnchor.value = String(anchor);
  return { sim, res: core.runMany(sim, sim.cfg(), RUNS, SEED) };
}
const def = run(50), op = run(0), mk = run(100);
const MODEL_DATE = '2026-11-09';
const C0 = Object.assign(def.sim.cfg(), { stateCap: def.sim.SIMRULES.stateCap, leak: def.sim.SIMRULES.transferLeak });
const hm = def.sim.computeHeatmap(def.sim.cfg(), PAIRS).map(r => ({ key: r.key, avgSwing: r.avgSwing, mover: r.mover, mv: r.mv })).sort((a, b) => b.avgSwing - a.avgSwing);

const order = ids.filter(id => id !== 'other').sort((a, b) => def.res.first[b] - def.res.first[a]);
const nm = id => P.CANDS.find(c => c.id === id).name;
const rows = order.map(id => ({ id, name: nm(id), predictit: r1(market[id]), poll: poll[id] === null ? '' : r1(poll[id]), model: def.res.first[id], operator_only: op.res.first[id], market_only: mk.res.first[id] }));

fs.writeFileSync(path.join(HERE, 'results.csv'), ['candidate,predictit,poll_avg,model_anchor50,operator_only,market_fit_only'].concat(rows.map(r => [r.name, r.predictit, r.poll, r.model, r.operator_only, r.market_only].join(','))).join('\n') + '\n');

const b = def.res.ballots, bl = k => (b[k] || 0).toFixed(1);
let md = `# The 2028 Machine, run on 2020 as of 2019-12-01\n\n**${PROV}.**\n\n`;
md += `${RUNS.toLocaleString('en-US')} simulated primaries using the 2028 Machine's own code. Market anchor: PredictIt on 2019-11-25, the last archived snapshot before 2019-12-01, normalized to 100. Polls: ${pw.used} national polls ending 2019-11-01 to 2019-12-01, weighted the way the site weights them today. Priors written blind from reporting before 2019-12-01 (SOURCES.md). Run on the model as of ${MODEL_DATE}: the PredictIt book gets the long-shot correction before it anchors the model, priors are drawn per run, no single contest multiplies a candidate by more than ${C0.stateCap}, name ID starts from Economist/YouGov on Dec. 1 to 3, 2019 and grows with blind attention scores and late-November ${NEWS_SRC === 'wiki' ? 'Wikipedia pageviews' : 'GDELT article counts'} (below), and the clock reads ${C0.days} days to South Carolina (event rate ${(C0.pEv * 100).toFixed(1)}, prior spread ${(C0.spread * 100).toFixed(1)} percent). Anchor 50, lane crowding ${(C0.crowd).toFixed(2)}, dropout transfer ${(C0.pDrop * 100).toFixed(0)} percent with ${(C0.leak * 100).toFixed(0)} percent leaking to the field, conventions resolved. The fitted market strengths reproduce the corrected PredictIt book within ${fit.distance} points.\n\n`;
md += `## Default top five\n\n| | Candidate | PredictIt | Corrected | Poll avg | Machine | Likely | Operator priors only | Market fit only |\n|---|---|---|---|---|---|---|---|---|\n`;
rows.forEach((r, i) => { md += `| ${i + 1} | ${r.name} | ${r.predictit.toFixed(1)} | ${r1(corrected[r.id] || 0).toFixed(1)} | ${r.poll === '' ? '' : r.poll.toFixed(1)} | ${r.model.toFixed(1)} | ${def.res.range ? Math.round(def.res.range[r.id][0]) + ' to ' + Math.round(def.res.range[r.id][1]) : ''} | ${r.operator_only.toFixed(1)} | ${r.market_only.toFixed(1)} |\n`; });
md += `\nWhat happened: Joe Biden won the nomination. He lost Iowa, New Hampshire and Nevada, won South Carolina on 2020-02-29, and took Super Tuesday after Buttigieg and Klobuchar dropped out and endorsed him.\n\n`;
md += `## Turning point rankings\n\nAverage swing in first place share across the field when each lever flips, ${PAIRS.toLocaleString('en-US')} matched seed pairs per lever.\n\n| | Turning point | Average swing | Biggest mover |\n|---|---|---|---|\n`;
hm.forEach((h, i) => { md += `| ${i + 1} | ${h.key} | ${h.avgSwing.toFixed(2)} | ${nm(h.mover)} ${h.mv > 0 ? '+' : ''}${h.mv.toFixed(1)} |\n`; });
md += `\n## Name ID inputs\n\nHeard-of and net favorable among Democrats from the Economist/YouGov poll of Dec. 1 to 3, 2019 (${NID_ROWS[0][0].source}). Attention scores were assigned blind from reporting before Dec. 1, 2019 and are for Kevin to review.\n\n| Candidate | Heard of | Net favorable, Democrats | Attention score | Why |\n|---|---|---|---|---|\n`;
NID_ROWS[0].forEach(r => { const a = NID_ROWS[1].find(x => x.id === r.id) || {}; md += `| ${r.candidate} | ${r.heard_of} | ${+r.net_fav_dem > 0 ? '+' : ''}${r.net_fav_dem} | ${a.score || ''} | ${a.reason || ''} |\n`; });
md += `\n## Convention\n\n${def.res.contested.toFixed(1)} percent of runs reach the convention without a pledged majority. Won on ballot 1: ${bl('1')}. Ballot 2: ${bl('2')}. Ballot 3: ${bl('3')}. Ballot 4: ${bl('4')}. Plurality after ballot 4: ${bl('plurality')}.\n\n`;
md += `Reproduce: \`node backtest-2020/run.js\`. Inputs refresh with \`python3 backtest-2020/fetch_inputs.py\`.\n`;
fs.writeFileSync(path.join(HERE, 'results.md'), md);
console.log(md);

// share card, when Playwright is available
(async () => {
  let pw = null;
  try { pw = require('playwright'); } catch (e) { if (process.env.PLAYWRIGHT_MODULE_DIR) pw = require(path.join(process.env.PLAYWRIGHT_MODULE_DIR, 'node_modules', 'playwright')); }
  if (!pw) { console.log('card.png skipped: Playwright not installed'); return; }
  const top = rows.slice(0, 6), mx = Math.max(...top.map(r => Math.max(r.model, r.predictit)));
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const bar = (v, col) => '<div class="t"><div style="width:' + (v / mx * 100).toFixed(1) + '%;background:' + col + '"></div></div>';
  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;width:1200px;height:630px;background:#f5f3ec;color:#16171a;font-family:Inter,Helvetica,Arial,sans-serif}.c{box-sizing:border-box;width:1200px;height:630px;padding:44px 60px;display:flex;flex-direction:column}.g{font-family:Georgia,serif;font-weight:700;font-size:17px;letter-spacing:.2em;text-transform:uppercase}h1{font-family:Georgia,serif;font-size:44px;margin:4px 0 2px}.s{font-size:20px;color:#5c5b55;margin-bottom:8px}.p{display:inline-block;font-family:Inter,Helvetica,Arial,sans-serif;font-variant-numeric:tabular-nums;font-size:13px;letter-spacing:.1em;background:#b8442b;color:#fff;padding:4px 10px;border-radius:5px;margin-bottom:14px}.r{display:grid;grid-template-columns:210px 1fr 80px;gap:4px 14px;align-items:center;margin:5px 0}.n{font-size:22px;font-weight:600}.t{height:13px;background:#fff;border:1px solid rgba(0,0,0,.15);border-radius:3px;overflow:hidden}.t div{height:100%}.v{font-family:Inter,Helvetica,Arial,sans-serif;font-variant-numeric:tabular-nums;font-size:15px;text-align:right}.k{font-family:Inter,Helvetica,Arial,sans-serif;font-variant-numeric:tabular-nums;font-size:14px;color:#5c5b55;margin-bottom:6px}.f{margin-top:auto;display:flex;justify-content:space-between;font-family:Inter,Helvetica,Arial,sans-serif;font-variant-numeric:tabular-nums;font-size:14px;color:#5c5b55;border-top:3px double #16171a;padding-top:10px}</style></head><body><div class="c"><div class="g">The Driscoll Globe</div><h1>The 2028 Machine, run on 2020</h1><div class="s">What it would have said on 2019-12-01. Biden won.</div><div><span class="p">' + PROV + '</span></div><div class="k"><span style="color:#1f7a5c">&#9632;</span> Machine &nbsp; <span style="color:#8a897f">&#9632;</span> PredictIt</div>'
    + top.map(r => '<div class="r"><div class="n">' + esc(r.name) + '</div><div>' + bar(r.model, '#1f7a5c') + bar(r.predictit, '#8a897f') + '</div><div class="v">' + r.model.toFixed(1) + '<br>' + r.predictit.toFixed(1) + '</div></div>').join('')
    + '<div class="f"><span>' + RUNS.toLocaleString('en-US') + ' SIMULATED PRIMARIES · SAME CODE AS 2028</span><span>driscollglobe.github.io/2028-machine</span></div></div></body></html>';
  const browser = await pw.chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(HERE, 'card.png') });
  await browser.close();
  console.log('wrote backtest-2020/card.png');
})().catch(e => { console.error(e); process.exit(1); });
