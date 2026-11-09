// The national poll average, shared by index.html, gap.html and scripts/baseline.js. Plain ES5 so the
// pages load it with a script tag and Node requires it.
// Each national poll whose field_end falls in the WINDOW days up to today counts with weight
//   0.5 ^ (age in days / HALF_LIFE) * sqrt(sample) * quality
// after its number for each candidate is shifted by the pollster's house adjustment (pollsters.csv).
// A poll with no sample size counts at the median sample of the polls in the window. A pollster missing
// from pollsters.csv counts at quality 1 with no adjustment. Each candidate's average uses only the polls
// that list them. Names match on letters and digits only, so "J.L. Partners" finds "JL Partners".
(function (root) {
  'use strict';
  var HALF_LIFE = 30, WINDOW = 90;
  function key(name) {
    return String(name || '').toLowerCase().replace(/\{\{.*?\}\}/g, '').replace(/[^a-z0-9]/g, '');
  }
  function parseCSV(text) {
    var lines = String(text || '').replace(/\r/g, '').split('\n').filter(function (l) { return l.trim().length; });
    if (!lines.length) return [];
    var head = lines[0].split(',').map(function (h) { return h.trim(); });
    return lines.slice(1).map(function (l) {
      var cells = l.split(','), o = {};
      head.forEach(function (h, i) { o[h] = (cells[i] || '').trim(); });
      return o;
    });
  }
  // pollsters.csv: pollster, aliases (;-separated), quality, house (id=points;id=points), reason
  function parsePollsters(text) {
    var out = {};
    parseCSV(text).forEach(function (r) {
      var q = parseFloat(r.quality), house = {};
      (r.house || '').split(';').forEach(function (p) {
        var m = /^\s*([a-z]+)\s*=\s*(-?[\d.]+)\s*$/.exec(p);
        if (m) house[m[1]] = parseFloat(m[2]);
      });
      var rec = { pollster: r.pollster, quality: isFinite(q) ? q : 1, house: house, reason: r.reason || '' };
      [r.pollster].concat((r.aliases || '').split(';')).forEach(function (n) { if (key(n)) out[key(n)] = rec; });
    });
    return out;
  }
  function median(a) {
    if (!a.length) return 0;
    var s = a.slice().sort(function (x, y) { return x - y; }), m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  // rows: parsed polls.csv; pollsters: parsePollsters output (or {}); today: 'YYYY-MM-DD' or Date; ids: candidate ids
  function weighted(rows, pollsters, today, ids) {
    var t = today instanceof Date ? today : new Date(today + 'T12:00:00Z');
    var inWin = rows.filter(function (r) {
      if ((r.geography || '').toLowerCase() !== 'national') return false;
      var end = new Date(r.field_end + 'T12:00:00Z');
      var age = (t - end) / 86400000;
      return !isNaN(age) && age >= -0.5 && age <= WINDOW;
    });
    var med = median(inWin.map(function (r) { return parseFloat(r.sample); }).filter(function (x) { return isFinite(x) && x > 0; })) || 1000;
    var sw = {}, swx = {}, n = {}, detail = [];
    inWin.forEach(function (r) {
      var age = Math.max(0, (t - new Date(r.field_end + 'T12:00:00Z')) / 86400000);
      var ps = pollsters[key(r.pollster)] || { quality: 1, house: {} };
      var size = parseFloat(r.sample);
      if (!(isFinite(size) && size > 0)) size = med;
      var w = Math.pow(0.5, age / HALF_LIFE) * Math.sqrt(size) * ps.quality;
      detail.push({ pollster: r.pollster, field_end: r.field_end, weight: w });
      ids.forEach(function (id) {
        var x = parseFloat(r[id]);
        if (r[id] === undefined || r[id] === '' || !isFinite(x)) return;
        x = Math.max(0, x + (ps.house[id] || 0));
        sw[id] = (sw[id] || 0) + w; swx[id] = (swx[id] || 0) + w * x; n[id] = (n[id] || 0) + 1;
      });
    });
    var avg = {};
    Object.keys(sw).forEach(function (id) { if (sw[id] > 0) avg[id] = Math.round(swx[id] / sw[id] * 10) / 10; });
    return { avg: avg, n: n, used: inWin.length, detail: detail, halfLife: HALF_LIFE, window: WINDOW };
  }
  // the old method, kept for comparison: equal weight mean of national polls ending in the last 30 days
  function equal(rows, today, ids) {
    var t = today instanceof Date ? today : new Date(today + 'T12:00:00Z'), cutoff = new Date(t.getTime() - 30 * 86400000);
    var sum = {}, n = {};
    rows.forEach(function (r) {
      if ((r.geography || '').toLowerCase() !== 'national') return;
      var end = new Date(r.field_end + 'T12:00:00Z');
      if (isNaN(end) || end < cutoff || end > t) return;
      ids.forEach(function (id) { var x = parseFloat(r[id]); if (r[id] === undefined || r[id] === '' || !isFinite(x)) return; sum[id] = (sum[id] || 0) + x; n[id] = (n[id] || 0) + 1; });
    });
    var avg = {};
    Object.keys(sum).forEach(function (k) { avg[k] = Math.round(sum[k] / n[k] * 10) / 10; });
    return { avg: avg, n: n };
  }
  var api = { HALF_LIFE: HALF_LIFE, WINDOW: WINDOW, key: key, parseCSV: parseCSV, parsePollsters: parsePollsters, weighted: weighted, equal: equal };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PollAvg = api;
})(this);
