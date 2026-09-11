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

function load(indexPath) {
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
    core + '\nreturn {CANDS:CANDS, BP_PRESETS:(typeof BP_PRESETS==="undefined"?{}:BP_PRESETS), simulate:simulate, cfg:cfg, mb:mb, setRng:function(r){rng=r;}};');
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
  });
  // AOC and Harris run probabilities live on the sliders, so the run market sets those too.
  if (M.run && typeof M.run.aoc === 'number') sim.controls.pAoc.value = String(Math.round(M.run.aoc));
  if (M.run && typeof M.run.harris === 'number') sim.controls.pHarris.value = String(Math.round(M.run.harris));
}

function seedFrom(str) {
  let seed = 0;
  for (const ch of str) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  return seed || 1;
}

// Run N simulations for a config and return first place shares, majority and contested splits.
function runMany(sim, C, N, seed) {
  sim.setRng(sim.mb(seed));
  const ids = sim.CANDS.map(c => c.id);
  const first = {}, maj = {}, lead = {};
  ids.forEach(id => { first[id] = 0; maj[id] = 0; lead[id] = 0; });
  let contested = 0;
  for (let i = 0; i < N; i++) {
    const r = sim.simulate(C, false);
    first[r.winner]++;
    if (r.majority) maj[r.winner]++; else { lead[r.winner]++; contested++; }
  }
  const pct = x => Math.round(x / N * 1000) / 10;
  const out = { runs: N, contested: pct(contested), first: {}, majority: {}, lead: {} };
  ids.forEach(id => { out.first[id] = pct(first[id]); out.majority[id] = pct(maj[id]); out.lead[id] = pct(lead[id]); });
  return out;
}

module.exports = { ROOT, load, applyMarkets, seedFrom, runMany, parseControls };
