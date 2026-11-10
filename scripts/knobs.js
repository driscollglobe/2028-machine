#!/usr/bin/env node
// knobs.json: the model's frozen settings, each with a value, the date it was set and a one-line reason.
//   node scripts/knobs.js check [baseRef]   fails if index.html disagrees with knobs.json, or if any value
//                                           changed against baseRef without a dated changelog entry
//   node scripts/knobs.js table             prints the knobs
//   node scripts/knobs.js methodology       rewrites the knobs table on methodology.html from knobs.json
// A changed value passes only when its date moved to a later day and changelog/index.json lists an entry
// on that date whose file names the knob (its label or key).
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');

function readKnobs(text) {
  const K = JSON.parse(text);
  Object.keys(K).forEach(k => {
    const x = K[k];
    if (typeof x.value !== 'number' || !isFinite(x.value)) throw new Error('knobs.json ' + k + ': value is not a number');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(x.date || '')) throw new Error('knobs.json ' + k + ': date is not YYYY-MM-DD');
    if (!x.reason || !x.label) throw new Error('knobs.json ' + k + ': needs a label and a reason');
    if (!x.control === !x.rule) throw new Error('knobs.json ' + k + ': needs exactly one of control or rule');
  });
  return K;
}

// slider markup value="N" (percent) and SIMRULES literals must match knobs.json
function markupErrors(K, html) {
  const errs = [];
  Object.keys(K).forEach(k => {
    const x = K[k];
    if (x.control) {
      const m = new RegExp('<input\\b[^>]*\\bvalue="([^"]*)"[^>]*\\bid="' + x.control + '"').exec(html) || new RegExp('<input\\b[^>]*\\bid="' + x.control + '"[^>]*\\bvalue="([^"]*)"').exec(html);
      if (!m) errs.push(k + ': no slider ' + x.control + ' in index.html');
      else if (+m[1] !== Math.round(x.value * 100)) errs.push(k + ': index.html ' + x.control + ' is ' + m[1] + ', knobs.json says ' + Math.round(x.value * 100));
    } else {
      const sr = /const SIMRULES=\{([^}]*)\}/.exec(html);
      const m = sr && new RegExp('\\b' + x.rule + ':([-\\d.]+)').exec(sr[1]);
      if (!m) errs.push(k + ': no SIMRULES.' + x.rule + ' in index.html');
      else if (+m[1] !== x.value) errs.push(k + ': index.html SIMRULES.' + x.rule + ' is ' + m[1] + ', knobs.json says ' + x.value);
    }
  });
  return errs;
}

// changed values against the base; entries is changelog/index.json, readEntry(file) returns its text
function changeErrors(base, K, entries, readEntry) {
  const errs = [];
  Object.keys(K).forEach(k => {
    const b = base[k], x = K[k];
    if (!b || b.value === x.value) return;
    if (!(x.date > b.date)) { errs.push(k + ': value changed from ' + b.value + ' to ' + x.value + ' but its date stayed ' + x.date); return; }
    const hit = entries.filter(e => e.date === x.date).some(e => {
      const t = (readEntry(e.file) || '').toLowerCase();
      return t.includes(x.label.toLowerCase()) || t.includes(k.toLowerCase());
    });
    if (!hit) errs.push(k + ': value changed from ' + b.value + ' to ' + x.value + ' on ' + x.date + ' with no changelog entry that day naming "' + x.label + '"');
  });
  return errs;
}

// the reader table on methodology.html, between the KNOBS markers
const MARK_A = '<!--KNOBS-->', MARK_B = '<!--/KNOBS-->';
function knobsTable(K) {
  const { edDate } = require('./eddate');
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return MARK_A + '\n<table><tr><th>Setting</th><th>Value</th><th>Set</th></tr>\n'
    + Object.keys(K).map(k => '<tr><td>' + esc(K[k].label) + '</td><td>' + Math.round(K[k].value * 100) + '%</td><td>' + edDate(K[k].date) + '</td></tr>\n<tr><td colspan="3" style="text-align:left;font-family:var(--sans);color:var(--muted)">' + esc(K[k].reason) + '</td></tr>').join('\n')
    + '\n</table>\n' + MARK_B;
}
function methodologyErrors(K, page) {
  const a = page.indexOf(MARK_A), b = page.indexOf(MARK_B);
  if (a < 0 || b < 0) return ['methodology.html has no knobs table'];
  return page.slice(a, b + MARK_B.length) === knobsTable(K) ? [] : ['methodology.html knobs table is out of date; run node scripts/knobs.js methodology'];
}

function main() {
  const [cmd, ref] = process.argv.slice(2);
  const K = readKnobs(fs.readFileSync(path.join(ROOT, 'knobs.json'), 'utf8'));
  if (cmd === 'table') {
    Object.keys(K).forEach(k => console.log(K[k].label.padEnd(32) + String(K[k].value).padStart(6) + '  ' + K[k].date + '  ' + K[k].reason));
    return;
  }
  if (cmd === 'methodology') {
    const f = path.join(ROOT, 'methodology.html'), page = fs.readFileSync(f, 'utf8');
    const a = page.indexOf(MARK_A), b = page.indexOf(MARK_B);
    if (a < 0 || b < 0) throw new Error('methodology.html: no ' + MARK_A + ' markers');
    fs.writeFileSync(f, page.slice(0, a) + knobsTable(K) + page.slice(b + MARK_B.length));
    console.log('knobs: wrote the table on methodology.html');
    return;
  }
  if (cmd !== 'check') { console.error('usage: node scripts/knobs.js check [baseRef] | table | methodology'); process.exit(2); }
  let errs = markupErrors(K, fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'))
    .concat(methodologyErrors(K, fs.readFileSync(path.join(ROOT, 'methodology.html'), 'utf8')));
  let compared = false;
  if (ref) {
    let baseText = null;
    try { baseText = execFileSync('git', ['show', ref + ':knobs.json'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { baseText = null; }
    if (baseText) {
      compared = true;
      const entries = JSON.parse(fs.readFileSync(path.join(ROOT, 'changelog', 'index.json'), 'utf8'));
      const read = f => { const p = path.join(ROOT, 'changelog', f); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''; };
      errs = errs.concat(changeErrors(readKnobs(baseText), K, entries, read));
    } else console.log('knobs: no knobs.json at ' + ref + ', checking markup only');
  }
  if (errs.length) { errs.forEach(e => console.error('knobs: ' + e)); process.exit(1); }
  console.log('knobs: ' + Object.keys(K).length + ' knobs match index.html' + (compared ? ' and every change against ' + ref + ' has a dated changelog entry' : ''));
}

if (require.main === module) main();
module.exports = { readKnobs, markupErrors, changeErrors, knobsTable, methodologyErrors };
