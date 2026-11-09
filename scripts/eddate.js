// Editorial dates for anything a reader sees: '2026-11-09' -> 'Nov. 9, 2026' (AP month abbreviations).
// ISO stays in CSV, JSON, code and URLs. index.html carries the same helper above the sim marker.
'use strict';
const AP_MON = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
function edDate(d, withYear) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || '');
  if (!m) return d || '';
  return AP_MON[+m[2] - 1] + ' ' + (+m[3]) + (withYear === false ? '' : ', ' + m[1]);
}
function edMonth(d) { const m = /^(\d{4})-(\d{2})/.exec(d || ''); return m ? AP_MON[+m[2] - 1] + ' ' + m[1] : (d || ''); }
module.exports = { edDate, edMonth, AP_MON };
