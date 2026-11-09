// Reader brackets for The 2028 Machine. Anonymous and aggregated.
//   POST /bracket    {"runs": {"aoc": 63, "ossoff": 70, ...}}  six candidates, each 0 to 100
//   GET  /aggregate  {"count", "updated", "candidates": {id: {n, mean, median}}}
// Privacy: no IP address, cookie, user agent or account is stored. Rate limiting keys on
// sha256(daily salt + IP). The salt is HMAC(SALT_SECRET, today's UTC date), so it rotates every
// day and is never written anywhere, and the rate-limit entry expires before the next UTC day.
// A saved bracket holds only the six numbers and the UTC date.

const IDS = ['newsom', 'aoc', 'sanders', 'ossoff', 'harris', 'shapiro', 'pete', 'pritzker', 'khanna', 'murphy',
  'kelly', 'beshear', 'rahm', 'whitmer', 'moore', 'warnock', 'talarico', 'elsayed', 'stewart', 'fain', 'walz', 'booker', 'gallego', 'slotkin', 'vanhollen'];
const NEED = 6;
const AGG_KEY = 'agg:cache';
const AGG_TTL = 120; // seconds the aggregate is cached

function json(body, status, origin) {
  return new Response(JSON.stringify(body), { status: status || 200, headers: Object.assign({ 'content-type': 'application/json' }, cors(origin)) });
}
function cors(origin) {
  return origin ? { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'origin' } : {};
}
function allowedOrigin(req, env) {
  const o = req.headers.get('origin') || '';
  const list = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (list.includes(o)) return o;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o) && env.ALLOW_LOCALHOST === '1') return o;
  return null;
}
const enc = new TextEncoder();
async function hex(buf) { return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join(''); }
async function dailySalt(env, day) {
  const key = await crypto.subtle.importKey('raw', enc.encode(env.SALT_SECRET || 'dev-only-secret'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(day)));
}
function secondsLeftToday(now) {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(60, Math.floor((end - now.getTime()) / 1000) - 5);
}

export function validate(body) {
  if (!body || typeof body !== 'object' || !body.runs || typeof body.runs !== 'object') return 'body must be {"runs": {...}}';
  const keys = Object.keys(body.runs);
  if (keys.length !== NEED) return 'exactly ' + NEED + ' candidates required';
  for (const k of keys) {
    if (!IDS.includes(k)) return 'unknown candidate ' + k;
    const v = body.runs[k];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 100) return k + ' must be a number from 0 to 100';
  }
  return null;
}

export function aggregate(brackets) {
  const by = {};
  brackets.forEach(b => Object.entries(b.runs).forEach(([k, v]) => { (by[k] = by[k] || []).push(v); }));
  const out = {};
  Object.entries(by).forEach(([k, vs]) => {
    vs.sort((a, b) => a - b);
    const n = vs.length, mid = Math.floor(n / 2);
    out[k] = { n, mean: Math.round(vs.reduce((a, x) => a + x, 0) / n * 10) / 10, median: n % 2 ? vs[mid] : (vs[mid - 1] + vs[mid]) / 2 };
  });
  return { count: brackets.length, candidates: out };
}

async function loadAll(env) {
  const out = [];
  let cursor;
  do {
    const page = await env.BRACKETS.list({ prefix: 'b:', cursor });
    for (const k of page.keys) { const v = await env.BRACKETS.get(k.name, 'json'); if (v && v.runs) out.push(v); }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  return out;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = allowedOrigin(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });

    if (url.pathname === '/aggregate' && req.method === 'GET') {
      const cached = await env.BRACKETS.get(AGG_KEY, 'json');
      if (cached) return json(cached, 200, origin);
      const agg = Object.assign(aggregate(await loadAll(env)), { updated: new Date().toISOString() });
      await env.BRACKETS.put(AGG_KEY, JSON.stringify(agg), { expirationTtl: Math.max(60, AGG_TTL) });
      return json(agg, 200, origin);
    }

    if (url.pathname === '/bracket' && req.method === 'POST') {
      if (!origin) return json({ error: 'origin not allowed' }, 403, null);
      let body;
      try { body = await req.json(); } catch (e) { return json({ error: 'invalid JSON' }, 400, origin); }
      const err = validate(body);
      if (err) return json({ error: err }, 400, origin);

      const now = new Date();
      const day = now.toISOString().slice(0, 10);
      const ip = req.headers.get('cf-connecting-ip') || 'local';
      const rl = 'rl:' + await hex(await crypto.subtle.digest('SHA-256', enc.encode(await dailySalt(env, day) + '|' + ip)));
      const used = parseInt(await env.BRACKETS.get(rl) || '0', 10);
      const limit = parseInt(env.DAILY_LIMIT || '5', 10);
      if (used >= limit) return json({ error: 'daily limit reached' }, 429, origin);
      await env.BRACKETS.put(rl, String(used + 1), { expirationTtl: secondsLeftToday(now) });

      const runs = Object.fromEntries(Object.entries(body.runs).map(([k, v]) => [k, Math.round(v)]));
      await env.BRACKETS.put('b:' + now.getTime() + ':' + crypto.randomUUID().slice(0, 8), JSON.stringify({ day, runs }));
      await env.BRACKETS.delete(AGG_KEY);
      return json({ ok: true }, 201, origin);
    }
    return json({ error: 'not found' }, 404, origin);
  }
};
