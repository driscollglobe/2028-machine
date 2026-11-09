// Wire templates. Short lines built from markets.json, default.json, history.csv and the
// resolved levers in index.html. baseline.js calls wireItems() nightly and writes wire.json.
// The Phase 7 desk note is meant to reuse these helpers. Node 20, no packages.
// House rules: ISO dates, no em or en dashes, no prices typed by hand.
'use strict';

const NUMWORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

function upper(t) { return String(t).toUpperCase(); }
function f1(x) { return (Math.round(x * 10) / 10).toFixed(1); }
function signed(x) { return (x > 0 ? '+' : '') + f1(x); }

// last name as the wire prints it: AOC stays AOC, Abdul El-Sayed becomes EL-SAYED
function wireName(cands, id) {
  const c = cands.find(x => x.id === id);
  if (!c) return upper(id);
  return upper(c.short || c.name.split(' ').slice(-1)[0]);
}

function topBy(obj, ids, n) {
  return ids.filter(id => typeof obj[id] === 'number').sort((a, b) => obj[b] - obj[a]).slice(0, n);
}

// One line per template. Each returns a string or null when the data is missing.
const T = {
  bookLeaders(ctx) {
    const { M, ids, name } = ctx;
    if (!M.kalshi || !M.polymarket) return null;
    const k = topBy(M.kalshi, ids, 1)[0], p = topBy(M.polymarket, ids, 1)[0];
    if (!k || !p) return null;
    if (k === p) return name(k) + ' LEADS BOTH BOOKS · KALSHI ' + f1(M.kalshi[k]) + ', POLYMARKET ' + f1(M.polymarket[p]);
    return name(k) + ' ' + f1(M.kalshi[k]) + ' LEADS KALSHI · ' + name(p) + ' ' + f1(M.polymarket[p]) + ' LEADS POLYMARKET';
  },
  blendTop(ctx) {
    const { M, ids, name } = ctx;
    const top = topBy(M.blend, ids, 3);
    if (top.length < 3) return null;
    return 'BLEND: ' + top.map(id => name(id) + ' ' + f1(M.blend[id])).join(', ');
  },
  modelLeader(ctx) {
    const { D, name } = ctx;
    if (!D || !D.frontrunner) return null;
    return 'MODEL: ' + name(D.frontrunner.id) + ' FINISHES FIRST IN ' + f1(D.frontrunner.share) + '% OF ' + D.runs.toLocaleString('en-US') + ' PRIMARIES';
  },
  widestGap(ctx) {
    const { M, D, ids, name } = ctx;
    if (!D || !D.first) return null;
    const g = ids.filter(id => typeof D.first[id] === 'number' && typeof M.blend[id] === 'number')
      .map(id => ({ id, g: D.first[id] - M.blend[id] })).sort((a, b) => Math.abs(b.g) - Math.abs(a.g))[0];
    if (!g) return null;
    return 'WIDEST GAP: ' + name(g.id) + ', MODEL ' + f1(D.first[g.id]) + ' VS MARKET ' + f1(M.blend[g.id]);
  },
  biggestMove(ctx) {
    const { M, prev, ids, name } = ctx;
    if (!prev) return null;
    const mv = ids.map(id => {
      const a = parseFloat(prev['k_' + id]), b = M.blend[id];
      return (isFinite(a) && typeof b === 'number') ? { id, d: b - a } : null;
    }).filter(Boolean).sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0];
    if (!mv || Math.abs(mv.d) < 0.05) return 'THE BLEND DID NOT MOVE SINCE ' + prev.date;
    return 'BIGGEST MOVE SINCE ' + prev.date + ': ' + name(mv.id) + ' ' + signed(mv.d) + ' TO ' + f1(M.blend[mv.id]);
  },
  topRun(ctx) {
    const { D, ids, name, cands } = ctx;
    if (!D || !D.run) return null;
    // skip the certain entries (other is always in) so the line says something
    const pool = ids.filter(id => typeof D.run[id] === 'number' && D.run[id] < 100);
    const id = topBy(D.run, pool, 1)[0];
    if (!id) return null;
    return name(id) + ' ' + Math.round(D.run[id]) + '% TO RUN · THE HIGHEST RUN ODDS IN THE FIELD';
  },
  contested(ctx) {
    const { D } = ctx;
    if (!D || typeof D.contested !== 'number') return null;
    return f1(D.contested) + '% OF SIMULATED PRIMARIES END IN A CONTESTED CONVENTION (DEFAULT SETTINGS)';
  },
  resolved(ctx) {
    const { R } = ctx;
    const keys = Object.keys(R || {});
    if (!keys.length) return null;
    const byDate = {};
    keys.forEach(k => { (byDate[R[k].date] = byDate[R[k].date] || []).push(R[k]); });
    const date = Object.keys(byDate).sort().pop();
    const list = byDate[date];
    const n = NUMWORD[list.length] || String(list.length);
    return upper(n) + ' MIDTERM LEVERS RESOLVED ' + date + ': ' + list.map(r => upper(r.label)).join(', ') + '. THE MODEL NOW TREATS THEM AS FACT';
  },
  anchors(ctx) {
    return 'MARKET ANCHORS BLEND KALSHI AND POLYMARKET, UPDATED NIGHTLY · LAST UPDATE ' + ctx.M.date;
  }
};

const ORDER = ['bookLeaders', 'blendTop', 'modelLeader', 'resolved', 'widestGap', 'biggestMove', 'topRun', 'contested', 'anchors'];

// M: markets.json. D: default.json content. prev: the history row before today (object keyed by column) or null.
// cands: CANDS from the sim. R: RESOLVED from the sim.
function wireItems(M, D, prev, cands, R) {
  const ids = cands.map(c => c.id).filter(id => id !== 'other');
  const ctx = { M, D, prev, cands, R, ids, name: id => wireName(cands, id) };
  return ORDER.map(k => T[k](ctx)).filter(Boolean);
}

module.exports = { wireItems, wireName, T, ORDER };
