// Layout check: overflow sweep. Field cards and leaderboard rows from 320 to 1600 pixels in 20-pixel steps: no text
// overlaps, spills or overflows; every field card is the same height and width; the page never scrolls sideways.
//   node scripts/layout_sweep.js . /tmp/shot --check   (Playwright as in layout_noshift.js)
// usage: node shot.js <siteDir> <outPrefix> [--check] [--sel=css] [--full]
// Serves siteDir on a random port, loads index.html at 1440 and 390 wide, writes <outPrefix>-1440.png and -390.png.
// --check sweeps 320..1600 and reports overlapping text inside field cards and the leaderboard.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const [dir, out] = process.argv.slice(2);
const flags = process.argv.slice(4);
const check = flags.includes('--check');
const full = flags.includes('--full');
const sel = (flags.find(f => f.startsWith('--sel=')) || '').slice(6);
const widths = (flags.find(f => f.startsWith('--w=')) || '--w=1440,390').slice(4).split(',').map(Number);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.csv': 'text/csv', '.png': 'image/png', '.md': 'text/markdown' };
const srv = http.createServer((q, r) => {
  const p = path.join(dir, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html'));
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); r.end(b); });
});
srv.listen(0, async () => {
  const url = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  const browser = await chromium.launch();
  const page = await browser.newPage({ colorScheme: 'light' });
  await page.route(/workers\.dev/, r => r.abort());
  page.on('pageerror', e => console.log('PAGE ERROR', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
  for (const w of widths) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    if (sel) { const el = await page.$(sel); if (el) await el.screenshot({ path: out + '-' + w + '.png' }); }
    else await page.screenshot({ path: out + '-' + w + '.png', fullPage: full });
  }
  if (check) {
    let bad = 0;
    for (let w = 320; w <= 1600; w += 20) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.waitForTimeout(60);
      const res = await page.evaluate(() => {
        const errs = [];
        const leaves = root => [...root.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && (e.children.length === 0 || e.tagName === 'svg') && !e.closest('svg:not(:scope)') && e.tagName !== 'OPTION' && e.tagName !== 'polyline'; });
        document.querySelectorAll('.cc, .mr').forEach(card => {
          const cr = card.getBoundingClientRect();
          const L = leaves(card);
          L.forEach(e => { if (e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow === 'visible') errs.push((card.querySelector('.nm,.mname') || {}).textContent + ': ' + (e.textContent || e.tagName).trim().slice(0, 20) + ' text overflows'); const r = e.getBoundingClientRect(); if (r.right > cr.right + 1 || r.left < cr.left - 1) errs.push((card.querySelector('.nm,.mname') || {}).textContent + ': ' + (e.textContent || e.tagName).trim().slice(0, 20) + ' spills out'); });
          for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
            const a = L[i].getBoundingClientRect(), b = L[j].getBoundingClientRect();
            const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            if (ox > 1 && oy > 1) errs.push((card.querySelector('.nm,.mname') || {}).textContent + ': "' + (L[i].textContent || L[i].tagName).trim().slice(0, 20) + '" over "' + (L[j].textContent || L[j].tagName).trim().slice(0, 20) + '"');
          }
        });
        const cs=[...document.querySelectorAll('.cc')].map(c=>c.getBoundingClientRect());
        if (cs.length) { const h=new Set(cs.map(r=>Math.round(r.height))), w=new Set(cs.map(r=>Math.round(r.width))); if (h.size>1||w.size>1) errs.push('cards differ: heights '+[...h].join('/')+' widths '+[...w].join('/')); }
        if (document.documentElement.scrollWidth > window.innerWidth + 1) errs.push('page scrolls sideways: ' + document.documentElement.scrollWidth);
        return errs;
      });
      if (res.length) { bad++; console.log(w + 'px', res.slice(0, 6).join(' | '), res.length > 6 ? '(+' + (res.length - 6) + ')' : ''); }
    }
    console.log(bad ? bad + ' widths with problems' : 'no overlaps from 320 to 1600');
  }
  await browser.close(); srv.close();
});
