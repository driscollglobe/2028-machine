#!/usr/bin/env node
// Nightly share cards: a 1200x630 PNG for the default state and for every turning point
// preset in index.html (BP_PRESETS). Uses Playwright's bundled Chromium. Node 20.
// Usage: node scripts/render_cards.js  (expects markets.json and default.json in the repo root)
'use strict';
const fs = require('fs');
const path = require('path');
const core = require('./simcore');

const ROOT = core.ROOT;
const OUT = path.join(ROOT, 'cards');
const SHARE = path.join(ROOT, 'share');
const SITE = 'https://driscollglobe.github.io/2028-machine/';
const POOL_COLOR = { anchor: '#c98a18', fight: '#b8442b', suburb: '#1f7a5c', working: '#3b6ea5', movement: '#7a3e9d', out: '#8c5a2b' };
const SITE_LABEL = 'driscollglobe.github.io/2028-machine';
const RUNS = 20000;

function resolvePlaywright() {
  try { return require('playwright'); } catch (e) {}
  const extra = process.env.PLAYWRIGHT_MODULE_DIR;
  if (extra) return require(path.join(extra, 'node_modules', 'playwright'));
  throw new Error('playwright module not found; npm install playwright (or set PLAYWRIGHT_MODULE_DIR)');
}

function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

function cardHtml(title, sub, rows, date) {
  const max = rows[0] ? rows[0].pct : 1;
  const bars = rows.map(r => '<div class="row"><div class="name">' + esc(r.name) + '</div>'
    + '<div class="track"><div class="fill" style="width:' + (r.pct / max * 100).toFixed(1) + '%;background:' + (POOL_COLOR[r.lane] || POOL_COLOR.out) + '"></div></div>'
    + '<div class="pct">' + r.pct.toFixed(1) + '%</div></div>').join('');
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>'
    + 'body{margin:0;width:1200px;height:630px;background:#f5f3ec;color:#16171a;font-family:Inter,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;overflow:hidden;}'
    + '.card{box-sizing:border-box;width:1200px;height:630px;padding:54px 64px;display:flex;flex-direction:column;}'
    + '.globe{font-family:Georgia,serif;font-weight:700;font-size:18px;letter-spacing:.2em;text-transform:uppercase;}'
    + 'h1{font-family:Georgia,serif;font-weight:700;font-size:54px;line-height:1.02;margin:6px 0 4px;}'
    + '.sub{font-size:22px;color:#5c5b55;margin-bottom:26px;}'
    + '.lever{display:inline-block;font-family:Menlo,Consolas,monospace;font-size:16px;letter-spacing:.12em;text-transform:uppercase;background:#b8442b;color:#fff;padding:6px 14px;border-radius:6px;margin-bottom:22px;}'
    + '.row{display:flex;align-items:center;gap:18px;margin:9px 0;}'
    + '.name{width:230px;font-size:26px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
    + '.track{flex:1;height:30px;background:#fff;border:1.5px solid rgba(20,21,24,.18);border-radius:5px;overflow:hidden;}'
    + '.fill{height:100%;}'
    + '.pct{width:110px;text-align:right;font-family:Menlo,Consolas,monospace;font-size:26px;font-weight:600;}'
    + '.foot{margin-top:auto;display:flex;justify-content:space-between;font-family:Menlo,Consolas,monospace;font-size:17px;letter-spacing:.08em;color:#5c5b55;border-top:3px double #16171a;padding-top:14px;}'
    + '</style></head><body><div class="card">'
    + '<div class="globe">The Driscoll Globe</div><h1>The 2028 Machine</h1>'
    + '<div class="sub">' + esc(sub) + '</div><div><span class="lever">' + esc(title) + '</span></div>'
    + bars
    + '<div class="foot"><span>' + esc(date) + ' · ' + RUNS.toLocaleString() + ' SIMULATED PRIMARIES</span><span>' + SITE_LABEL + '</span></div>'
    + '</div></body></html>';
}

// One static page per preset with its own og tags. Social crawlers read HTML and never run
// JavaScript, so this is the only way a shared link unfurls with the matching card. The page
// forwards humans to the ?bp= deep link.
function writeSharePage(job, rows, date) {
  fs.mkdirSync(SHARE, { recursive: true });
  const target = SITE + '?bp=' + job.key;
  const img = SITE + 'cards/' + job.key + '.png';
  const desc = job.title + ': ' + rows.map(r => r.name + ' ' + r.pct.toFixed(1) + '%').join(', ') + ' (' + date + ').';
  const html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>The 2028 Machine: ' + esc(job.title) + '</title>\n'
    + '<meta property="og:title" content="The 2028 Machine: ' + esc(job.title) + '">\n'
    + '<meta property="og:description" content="' + esc(desc) + '">\n'
    + '<meta property="og:type" content="website">\n'
    + '<meta property="og:url" content="' + SITE + 'share/' + job.key + '.html">\n'
    + '<meta property="og:image" content="' + img + '">\n'
    + '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n'
    + '<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:image" content="' + img + '">\n'
    + '<meta http-equiv="refresh" content="0; url=' + target + '">\n'
    + '<link rel="canonical" href="' + target + '">\n'
    + '</head>\n<body>\n<p>Taking you to <a href="' + target + '">The 2028 Machine, ' + esc(job.title) + '</a>.</p>\n<script>location.replace(' + JSON.stringify(target) + ');</script>\n</body>\n</html>\n';
  fs.writeFileSync(path.join(SHARE, job.key + '.html'), html);
  console.log('wrote share/' + job.key + '.html');
}

async function main() {
  const { chromium } = resolvePlaywright();
  const sim = core.load();
  const M = JSON.parse(fs.readFileSync(path.join(ROOT, 'markets.json'), 'utf8'));
  core.applyMarkets(sim, M);
  const cand = id => sim.CANDS.find(c => c.id === id);
  const lastName = id => cand(id).name.split(' ').slice(-1)[0];
  const presets = sim.BP_PRESETS;
  const jobs = [{ key: 'default', title: 'Default settings', sub: 'Who finishes first when the market sets the odds' }]
    .concat(Object.keys(presets).map(k => ({ key: k, title: presets[k].label, sub: 'What changes when this turning point flips' })));

  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const job of jobs) {
    // reset controls to the page defaults, then apply the preset the way cueBranch does
    const fresh = core.load();
    core.applyMarkets(fresh, M);
    if (job.key !== 'default') {
      const set = presets[job.key].set;
      Object.keys(set).forEach(id => {
        const el = fresh.controls[id];
        if (!el) throw new Error('preset ' + job.key + ' names unknown control ' + id);
        if (typeof set[id] === 'boolean') el.checked = set[id]; else el.value = String(set[id]);
      });
    }
    const res = core.runMany(fresh, fresh.cfg(), RUNS, core.seedFrom(M.date + ':' + job.key));
    const rows = Object.keys(res.first).map(id => ({ id, name: lastName(id), lane: cand(id).lane, pct: res.first[id] })).sort((a, b) => b.pct - a.pct).slice(0, 5);
    await page.setContent(cardHtml(job.title, job.sub, rows, M.date), { waitUntil: 'load' });
    const file = path.join(OUT, job.key + '.png');
    await page.screenshot({ path: file, type: 'png' });
    console.log('wrote cards/' + job.key + '.png: ' + rows.map(r => r.id + ' ' + r.pct).join(', '));
    if (job.key !== 'default') writeSharePage(job, rows, M.date);
  }
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
