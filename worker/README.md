# Reader brackets worker

A Cloudflare Worker that stores anonymous reader brackets and serves their aggregate to
The 2028 Machine. Kevin deploys it from his own Cloudflare account. Nothing here deploys itself.

## What it stores
* One KV entry per saved bracket: the six run-odds numbers (0 to 100) and the UTC date. Nothing else.
* One rate-limit counter per reader per day, keyed by `sha256(daily salt + IP)`. The salt is
  `HMAC(SALT_SECRET, UTC date)`. It is computed on each request and never written down. The counter
  expires before the next UTC day, so no hash of anything survives the day it was made.
* No IP address, cookie, user agent, or account is stored.

## Endpoints
* `POST /bracket` with `{"runs": {"aoc": 63, "ossoff": 70, ...}}`: exactly six known candidate ids,
  each a number from 0 to 100. Returns 201, 400 (bad input), 403 (origin not allowed) or 429
  (more than `DAILY_LIMIT` brackets from one reader today).
* `GET /aggregate`: `{"count", "updated", "candidates": {id: {n, mean, median}}}`. Cached in KV for
  two minutes. The page shows the "Globe readers" column only once `count` is at least 25.

## Deploy (Kevin)
Run these from this `worker/` folder with Node 18 or newer.

1. `npx wrangler@3 login`
2. `npx wrangler@3 kv namespace create BRACKETS` and paste the printed `id` into `wrangler.toml`
   in place of `REPLACE_WITH_KV_NAMESPACE_ID`.
3. `npx wrangler@3 secret put SALT_SECRET` and paste a long random string. One way to make one:
   `openssl rand -hex 32`.
4. `npx wrangler@3 deploy`. Wrangler prints the worker URL, for example
   `https://globe-2028-crowd.<your-subdomain>.workers.dev`.
5. In `index.html`, set `const CROWD_URL='https://globe-2028-crowd.<your-subdomain>.workers.dev';`
   and commit. Until that line holds a URL, the page never calls the worker.

`ALLOWED_ORIGINS` in `wrangler.toml` lists the sites allowed to post. It ships with
`https://driscollglobe.github.io`.

## Run it locally
```
printf 'ALLOW_LOCALHOST=1\nSALT_SECRET=local-dev-secret\nDAILY_LIMIT=40\n' > .dev.vars
npx wrangler@3 dev --port 8787 --local
curl -X POST -H 'Origin: http://localhost:8028' -d '{"runs":{"ossoff":70,"aoc":63,"newsom":83,"harris":65,"pete":93,"shapiro":87}}' localhost:8787/bracket
curl localhost:8787/aggregate
```

## Known limits
* KV is eventually consistent. Two posts from one reader within a second can both pass the
  daily limit, and the aggregate can trail new posts by up to a minute. For a reader poll that
  is acceptable. A Durable Object would close the gap if it ever matters.
* `GET /aggregate` lists every bracket key when the cache is cold. That is fine into the low
  thousands of brackets. Past that, keep a running histogram instead.
