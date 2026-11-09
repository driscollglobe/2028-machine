// Shared loader for the simulation core inside index.html. Node 20, no packages.
// Extracts the inline script up to the SIM_CORE_END marker, stubs the DOM with the
// default control values parsed from the markup, and returns the model plus helpers.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function parseControls(html) {
  const controls = {};
  let m;
  const inputRe = /<input\b[^>]*>/g;
  while ((m = inputRe.exec(html)) !== null) {
    const tag = m[0];
    const id = (tag.match(/\bid="([^"]+)"/) || [])[1];
    if (!id) continue;
    const type = (tag.match(/\btype="([^"]+)"/) || [])[1] || 'text';
    const value = (tag.match(/\bvalue="([^"]*)"/) || [])[1];
    controls[id] = { value: value === undefined ? '' : value, checked: type === 'checkbox' ? /\bchecked\b/.test(tag) : false, disabled: false };
  }
  const selectRe = /<select\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g;
  while ((m = selectRe.exec(html)) !== null) {
    const id = m[1];
    const optRe = /<option\b([^>]*)>/g;
    let first = null, selected = null, o;
    while ((o = optRe.exec(m[2])) !== null) {
      const v = (o[1].match(/\bvalue="([^"]*)"/) || [])[1];
      if (first === null) first = v;
      if (/\bselected\b/.test(o[1])) { selected = v; break; }
    }
    controls[id] = { value: selected === null ? first : selected, checked: false, disabled: false };
  }
  return controls;
}

// inject: optional JS source run after the sim's declarations and before they are returned. The 2020
// backtest uses it to swap the 2028 data (CANDS, POOLS, DELS, ...) for 2020 data in place, so the sim code
// itself is never forked.
function load(indexPath, inject) {
  const html = fs.readFileSync(indexPath || path.join(ROOT, 'index.html'), 'utf8');
  const scriptStart = html.indexOf('<script>');
  const scriptEnd = html.indexOf('</script>', scriptStart);
  if (scriptStart < 0 || scriptEnd < 0) throw new Error('index.html: inline script tag not found');
  const fullScript = html.slice(scriptStart + '<script>'.length, scriptEnd);
  const marker = '/*==SIM_CORE_END==*/';
  const markerAt = fullScript.indexOf(marker);
  if (markerAt < 0) throw new Error('index.html: ' + marker + ' marker not found');
  const core = fullScript.slice(0, markerAt);
  const controls = parseControls(html);
  const documentStub = {
    getElementById(id) { return controls[id] || null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    body: { classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } } },
    createElement() { return { style: {}, classList: { add() {}, remove() {} } }; }
  };
  const windowStub = { document: documentStub, location: { search: '' }, addEventListener() {}, innerWidth: 1200 };
  // Function wrapper rather than eval: the script declares top-level const.
  const factory = new Function('document', 'window', 'navigator', 'location',
    core + '\n' + (inject || '') + '\nreturn {CANDS:CANDS, RESOLVED:(typeof RESOLVED==="undefined"?{}:RESOLVED), BP_PRESETS:(typeof BP_PRESETS==="undefined"?{}:BP_PRESETS), HM_LEVERS:(typeof HM_LEVERS==="undefined"?[]:HM_LEVERS), HM_WATCH:(typeof HM_WATCH==="undefined"?[]:HM_WATCH), computeHeatmap:(typeof computeHeatmap==="undefined"?null:computeHeatmap), SIMRULES:(typeof SIMRULES==="undefined"?{}:SIMRULES), drawPrior:(typeof drawPrior==="undefined"?null:drawPrior), shareDist:(typeof shareDist==="undefined"?null:shareDist), simulate:simulate, cfg:cfg, mb:mb, setRng:function(r){rng=r;}};');
  const sim = factory(documentStub, windowStub, {}, windowStub.location);
  sim.controls = controls;
  sim.html = html;
  return sim;
}

// Apply markets.json to the loaded model: blend to mkt, run market to run probabilities.
function applyMarkets(sim, M) {
  if (!M.blend || !M.date) throw new Error('markets.json missing blend or date');
  sim.CANDS.forEach(c => {
    const b = M.blend[c.id];
    if (typeof b !== 'number') throw new Error('markets.json blend lacks ' + c.id);
    c.mkt = b;
    const r = M.run ? M.run[c.id] : undefined;
    if (typeof r === 'number' && c.run > 0 && c.run < 100) c.run = Math.round(r);
    if (typeof c.runCap === 'number') c.run = Math.min(c.run, c.runCap); // operator cap on top of the run market
  });
  // AOC and Harris run probabilities live on the sliders, so the run market sets those too.
  if (M.run && typeof M.run.aoc === 'number') sim.controls.pAoc.value = String(Math.round(M.run.aoc));
  if (M.run && typeof M.run.harris === 'number') sim.controls.pHarris.value = String(Math.round(M.run.harris));
  applyAnchor(sim);
  applyApproval(sim);
}

// Nightly approval average sets the Trump approval lever's default, clamped to the slider range.
function applyApproval(sim) {
  const f = path.join(ROOT, 'approval.json');
  if (!fs.existsSync(f)) return;
  const A = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (typeof A.value !== 'number') return;
  sim.controls.pTrump.value = String(Math.max(30, Math.min(60, A.value)));
}

// Fitted market strengths for the anchor slider. Only used when anchor.json matches the markets date.
function applyAnchor(sim, A) {
  if (!A) {
    const f = path.join(ROOT, 'anchor.json');
    if (!fs.existsSync(f)) return;
    A = JSON.parse(fs.readFileSync(f, 'utf8'));
  }
  if (!A || !A.mstr) return;
  sim.CANDS.forEach(c => { if (typeof A.mstr[c.id] === 'number') c.mstr = A.mstr[c.id]; else delete c.mstr; });
}

function seedFrom(str) {
  let seed = 0;
  for (const ch of str) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  return seed || 1;
}

// Run N simulations for a config and return first place shares, majority and contested splits.
// With drawn priors (C.spread > 0), runs come in batches of SIMRULES.priorBatch that share one prior draw, and
// the result carries dist (10th, 25th, 50th, 75th, 90th percentile of first place share across draws) and
// range ([p10, p90]) per candidate.
function runMany(sim, C, N, seed) {
  sim.setRng(sim.mb(seed));
  const per = (C.spread > 0 && sim.drawPrior && sim.SIMRULES.priorBatch) || 0;
  const batches = [];
  let cur = null;
  C = Object.assign({}, C);
  const ids = sim.CANDS.map(c => c.id);
  const first = {}, maj = {}, lead = {};
  ids.forEach(id => { first[id] = 0; maj[id] = 0; lead[id] = 0; });
  let contested = 0;
  const ballots = {};
  for (let i = 0; i < N; i++) {
    if (per && i % per === 0) { C.prior = sim.drawPrior(C.spread); cur = {}; batches.push(cur); }
    const r = sim.simulate(C, false);
    if (cur) cur[r.winner] = (cur[r.winner] || 0) + 1;
    first[r.winner]++;
    if (r.majority) maj[r.winner]++; else { lead[r.winner]++; contested++; }
    const bk = r.ballot === 0 || r.ballot === undefined ? 'unresolved' : (r.plurality ? 'plurality' : String(r.ballot));
    ballots[bk] = (ballots[bk] || 0) + 1;
  }
  const pct = x => Math.round(x / N * 1000) / 10;
  const out = { runs: N, contested: pct(contested), unresolved: pct(ballots.unresolved || 0), ballots: {}, first: {}, majority: {}, lead: {} };
  Object.keys(ballots).forEach(k => { out.ballots[k] = pct(ballots[k]); });
  ids.forEach(id => { out.first[id] = pct(first[id]); out.majority[id] = pct(maj[id]); out.lead[id] = pct(lead[id]); });
  if (per && N % per === 0) {
    out.dist = sim.shareDist(batches, per, ids);
    out.range = {};
    ids.forEach(id => { out.range[id] = [out.dist[id].p10, out.dist[id].p90]; });
    out.draws = batches.length;
  }
  return out;
}

// Fit market strengths so that a = 100 at the current settings reproduces target first-place shares.
// Damped multiplicative updates on a fixed seed; the sim's response to strength is steep, so steps stay small.
function fitAnchor(sim, target, opts) {
  opts = opts || {};
  const ROUNDS = opts.rounds || 30, N = opts.runs || 4000, K = opts.k || 0.3, DAMP = opts.damp || 0.2;
  const ids = sim.CANDS.map(c => c.id);
  const mstr = {};
  ids.forEach(id => { mstr[id] = Math.max(0.05, target[id] || 0); });
  let err = null;
  for (let r = 0; r < ROUNDS; r++) {
    applyAnchor(sim, { mstr });
    sim.controls.pAnchor.value = '100';
    const res = runMany(sim, sim.cfg(), N, opts.seed || 1);
    err = ids.reduce((t, id) => t + Math.abs(res.first[id] - (target[id] || 0)), 0) / 2;
    if (opts.debug) console.log(r, Math.round(err));
    ids.forEach(id => { mstr[id] = Math.max(0.01, mstr[id] * Math.pow(((target[id] || 0) + K) / (res.first[id] + K), DAMP)); });
  }
  const sum = ids.reduce((t, id) => t + mstr[id], 0);
  const out = {};
  ids.forEach(id => { out[id] = Math.round(mstr[id] / sum * 100000) / 1000; });
  return { mstr: out, distance: Math.round(err * 10) / 10 };
}

module.exports = { ROOT, load, fitAnchor, applyMarkets, applyAnchor, applyApproval, seedFrom, runMany, parseControls };
