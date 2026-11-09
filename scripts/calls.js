#!/usr/bin/env node
// The calls ledger. calls.csv holds dated, checkable claims. Node 20, no packages.
//   node scripts/calls.js grade [YYYY-MM-DD]   grade open calls against markets.json and default.json
//   node scripts/calls.js lock [git-ref]       fail if a past row's terms changed versus git-ref (default HEAD)
// A call resolves true the first day its condition holds, and false at its deadline if it never held.
// Rows with status "test" are examples: never graded, never counted, and free to edit or delete.
// Metrics: run.<id> (Kalshi run price), market.<id> (blend), kalshi.<id>, poly.<id>, model.<id>
// (default run first place share), model.contested.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'calls.csv');
const HEAD = ['id', 'date_made', 'text', 'metric', 'operator', 'threshold', 'deadline', 'status', 'resolved_date', 'resolved_value'];
const LOCKED = ['text', 'metric', 'operator', 'threshold', 'deadline'];
const OPS = { '>=': (a, b) => a >= b, '<=': (a, b) => a <= b, '>': (a, b) => a > b, '<': (a, b) => a < b, '==': (a, b) => a === b };

// RFC 4180 style: quoted fields may hold commas, quotes ("") and newlines.
function parseCSV(text) {
  const rows = []; let row = [], f = '', q = false;
  text = text.replace(/\r/g, '');
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(f); f = ''; }
    else if (ch === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else f += ch;
  }
  if (f.length || row.length) { row.push(f); rows.push(row); }
  const clean = rows.filter(r => r.some(c => c.trim().length));
  if (!clean.length) return [];
  const head = clean[0];
  return clean.slice(1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] === undefined ? '' : r[i]])));
}
function cell(v) { v = v === undefined || v === null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
function toCSV(rows) { return [HEAD.join(',')].concat(rows.map(r => HEAD.map(h => cell(r[h])).join(','))).join('\n') + '\n'; }

function metricValue(metric, data) {
  const [kind, id] = String(metric).split('.');
  const M = data.markets || {}, D = data.def || {};
  const pick = o => (o && typeof o[id] === 'number') ? o[id] : null;
  if (kind === 'run') return pick(M.run);
  if (kind === 'market') return pick(M.blend);
  if (kind === 'kalshi') return pick(M.kalshi);
  if (kind === 'poly') return pick(M.polymarket);
  if (kind === 'model') return id === 'contested' ? (typeof D.contested === 'number' ? D.contested : null) : pick(D.first);
  return null;
}

function validate(r) {
  const errs = [];
  if (!r.id) errs.push('missing id');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date_made)) errs.push('date_made not ISO');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.deadline)) errs.push('deadline not ISO');
  if (!OPS[r.operator]) errs.push('operator must be one of ' + Object.keys(OPS).join(' '));
  if (!isFinite(parseFloat(r.threshold))) errs.push('threshold not a number');
  if (!/^(run|market|kalshi|poly|model)\.[a-z]+$/.test(r.metric)) errs.push('metric not recognized: ' + r.metric);
  if (!['open', 'true', 'false', 'test'].includes(r.status)) errs.push('status must be open, true, false or test');
  return errs.length ? r.id + ': ' + errs.join('; ') : null;
}

// Grade every open call for one day of data. Returns the ids graded today.
function grade(rows, data, today) {
  const graded = [];
  rows.forEach(r => {
    if (r.status !== 'open') return;
    if (today < r.date_made) return;
    const v = metricValue(r.metric, data);
    const t = parseFloat(r.threshold);
    if (v !== null && OPS[r.operator](v, t)) {
      r.status = 'true'; r.resolved_date = today; r.resolved_value = String(v); graded.push(r.id);
    } else if (today >= r.deadline) {
      r.status = 'false'; r.resolved_date = today; r.resolved_value = v === null ? '' : String(v); graded.push(r.id);
    }
  });
  return graded;
}

// Compare two versions of the ledger. Any row made before today whose terms changed, or that vanished, is a violation.
function lockViolations(oldRows, newRows, today) {
  const out = [];
  const byId = Object.fromEntries(newRows.map(r => [r.id, r]));
  oldRows.forEach(o => {
    if (!(o.date_made < today)) return;
    if (o.status === 'test') return; // examples can be replaced; real calls cannot
    const n = byId[o.id];
    if (!n) { out.push(o.id + ' was deleted'); return; }
    if (n.date_made !== o.date_made) out.push(o.id + ' date_made changed');
    LOCKED.forEach(k => { if ((n[k] || '') !== (o[k] || '')) out.push(o.id + ' ' + k + ' changed from "' + o[k] + '" to "' + n[k] + '"'); });
  });
  return out;
}

function record(rows) {
  const g = rows.filter(r => r.status === 'true' || r.status === 'false');
  return { right: g.filter(r => r.status === 'true').length, graded: g.length, open: rows.filter(r => r.status === 'open').length };
}

function todayET() {
  if (process.env.CALLS_TODAY) return process.env.CALLS_TODAY; // tests and dry runs only
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function main() {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === 'grade') {
    const M = JSON.parse(fs.readFileSync(path.join(ROOT, 'markets.json'), 'utf8'));
    const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'default.json'), 'utf8'));
    const today = arg || M.date;
    const rows = parseCSV(fs.readFileSync(FILE, 'utf8'));
    const bad = rows.map(validate).filter(Boolean);
    if (bad.length) { console.error('calls.csv invalid:\n' + bad.join('\n')); process.exit(1); }
    const graded = grade(rows, { markets: M, def: D }, today);
    fs.writeFileSync(FILE, toCSV(rows));
    const rec = record(rows);
    console.log('calls: graded ' + (graded.length ? graded.join(', ') : 'none') + ' on ' + today + '. Record ' + rec.right + ' for ' + rec.graded + ', ' + rec.open + ' open.');
  } else if (cmd === 'lock') {
    const ref = arg || 'HEAD';
    let old = '';
    try { old = execFileSync('git', ['show', ref + ':calls.csv'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); }
    catch (e) { console.log('calls lock: no calls.csv at ' + ref + ', nothing to check'); return; }
    const v = lockViolations(parseCSV(old), parseCSV(fs.readFileSync(FILE, 'utf8')), todayET());
    if (v.length) { console.error('calls lock FAILED against ' + ref + ':\n' + v.join('\n')); process.exit(1); }
    console.log('calls lock: no past row changed against ' + ref);
  } else {
    console.error('usage: node scripts/calls.js grade [date] | lock [git-ref]'); process.exit(2);
  }
}

if (require.main === module) main();
module.exports = { parseCSV, toCSV, metricValue, grade, lockViolations, record, validate, HEAD };
