# File map

Written 2026-11-09 against main at 5e74f5a (weekly changelog 2026-11-08). Phase 0 of the post-midterm rebuild. No behavior changed.

GitHub Pages serves `main` from the repo root. Every file below is public at driscollglobe.github.io/2028-machine.

## Who writes what

| File | Written by | Read by |
|---|---|---|
| `index.html` | Hand | Browser; `scripts/simcore.js` (extracts the sim) |
| `track.html` | Hand | Browser |
| `gap.html` | Hand | Browser |
| `markets.json` | `fetch_markets.py`, nightly | `baseline.js`, `render_cards.js`, `index.html`, `gap.html` |
| `history.csv` | `baseline.js`, nightly | `index.html` (What moved), `track.html`, `changelog.js`, `gap.html` (link only) |
| `default.json` | `baseline.js`, nightly | `index.html` (first paint) |
| `cards/*.png` | `render_cards.js`, nightly | og:image tags in `index.html` and `share/*.html` |
| `share/*.html` | `render_cards.js`, nightly (presets only, not default) | Social crawlers, then redirect to `?bp=` |
| `changelog/YYYY-MM-DD.md` | `changelog.js`, weekly | Kevin, for Substack drafts |
| `polls.csv` | Hand | `index.html` (field cards), `gap.html` |
| `notes.json` | Hand | `gap.html` (Note column) |
| `note.txt` | Hand | `index.html` (hero note under the headline) |
| `screenshots/*.png` | Hand, from past PRs | Nothing on the site |

## Workflows

### `.github/workflows/update-markets.yml` (Nightly market update)
Cron `0 10 * * *` (6am Eastern). In practice GitHub starts it late; recent runs landed near 16:30 UTC. Also `workflow_dispatch`.
1. `python3 scripts/fetch_markets.py` writes `markets.json`.
2. `node scripts/baseline.js` writes `default.json` and upserts today's row in `history.csv`.
3. Installs `playwright@1.47.2` with `--no-save` and Chromium.
4. `node scripts/render_cards.js` writes `cards/` and `share/`.
5. Commits `markets.json history.csv default.json cards share` as `nightly update YYYY-MM-DD` and pushes to main.

No `package.json` in the repo. Python 3.12, Node 20, standard library only apart from Playwright.

### `.github/workflows/weekly-changelog.yml` (Weekly changelog)
Cron `0 12 * * 0` (Sunday). Runs `node scripts/changelog.js`, commits `changelog/` as `weekly changelog YYYY-MM-DD`.

### pages-build-deployment
GitHub's own Pages deploy, triggered by every push to main.

## Scripts

### `scripts/fetch_markets.py`
Standard library. Pulls three books:
- Kalshi nominee event `KXPRESNOMD-28`
- Kalshi run event `KX2028DRUN-28`
- Polymarket event slug `democratic-presidential-nominee-2028`

Maps contract names to candidate ids through `NAME_TO_ID`. Unmapped contracts are logged and summed into `unmapped_pct`. `blend` is the mean of the two books, or the one book that lists the candidate; `other` is 100 minus the rest. Any HTTP error, empty book, or a missing or zero price for aoc, ossoff, newsom, harris, or pete is fatal, which fails the nightly run on purpose. Date is stamped in America/New_York.

### `scripts/simcore.js`
Shared loader. Reads `index.html`, takes the first inline `<script>` up to the `/*==SIM_CORE_END==*/` marker, and runs it inside `new Function` with a stub DOM. Control defaults come from parsing the `<input>` and `<select>` tags in the markup (`value=`, `checked`, `selected`). Returns `CANDS`, `BP_PRESETS`, `simulate`, `cfg`, `mb`, `setRng`.
Also exports `applyMarkets` (blend to `c.mkt`; run price, the Kalshi and Polymarket average since 2026-11-09, to `c.run` when `0 < c.run < 100`; `runCap` on top; AOC, Harris and Ossoff run prices go to the `pAoc`, `pHarris` and `pOssRev` sliders), `seedFrom` (string hash), and `runMany` (N runs, first, majority, lead, contested shares).

This is the one copy of the sim. Node and the browser run the same code. Anything above the marker must stay DOM-safe under the stub.

### `scripts/baseline.js`
20,000 runs at default settings, seed `seedFrom(markets.date)`. Writes `default.json` (date, runs, contested, frontrunner, first, majority, lead, order, mkt, run). Upserts one `history.csv` row per date: `m_` model share, `k_` blend, `kal_`, `poly_`, `run_` per candidate. A rerun on the same date replaces that row. Older rows are never edited. Columns already in the file are never dropped, so a new column (for example `note`) survives nightly rewrites. Prints the top eight.

### `scripts/render_cards.js`
For `default` plus every key in `BP_PRESETS` (aoc, calendar, newsom, georgia, texas, ai, harris): reloads the sim, applies markets, applies the preset's `set` to the controls, runs 20,000 with seed `seedFrom(date + ':' + key)`, renders the top five as a 1200x630 PNG. Presets also get `share/<key>.html` with og tags and a redirect to `?bp=<key>`.

### `scripts/changelog.js`
Compares the newest `history.csv` row with the row at least seven days older. Writes prose on market movers, model minus market gap changes, crossings of 5 and 10, and run market moves. Candidate display names are hardcoded in `NAMES`.

## `index.html`

1,264 lines. Single inline script. Photos are base64 in `PHOTOS`.

### Above the sim marker (shared with Node)
- `CANDS`: one object per candidate. Fields: `id, name, role, age, mkt` (baked fallback price), `run, runCap, lane` (pool), `tag, rank, debate, str, weak, base` (operator strength), `fit` (per state multipliers). No `reviewed` field exists yet.
- `POOL_META`, `POOLS`, `POOLOF`, `POOL2` (secondary pool, transfers at half weight), `POOL_WHY`, `COORD_POOLS`. Pools drive transfers and coordination; pool shares are display only.
- `CALS`, `CAL`, `CALCLASS`, `SN`, `SMON`, `DELS`: calendar orders (R, NH, IA), state class multipliers, delegate counts.
- `THL`, `LL`: theme and lesson labels. `LL.under` is "Democrats underperformed in 2026".
- `BP_PRESETS`: turning point chips, `?bp=` links, nightly cards.
- `EVENTS`: random branch-point events.
- `mb` (mulberry32 RNG), `cfg()` (reads every control into a config), `simulate(C, collect)`.
- `buildHeatmap`, `renderRankings`, `renderHeatmap`: 5,000 matched-seed pairs per lever, in the browser, on click.
- Poll layer (`POLLS`, `pollAverages`): display only, never feeds the sim.
- `paintDefault`: paints from `default.json`, simulates only after a control changes.
- Share, deep link, dossier, bracket helpers, `TICK` (hardcoded wire items).

### Below the marker (browser only)
- What moved strip (`loadHistory`, `renderChangeStrip`) from `history.csv`.
- Your bracket (`?me=` URL encoding).
- Event wiring, `note.txt` fetch, steppers, then the live `markets.json` fetch that overwrites `c.mkt`, `c.run`, and the AOC and Harris sliders.

### Page sections in order
Wire ticker, hero, Model result, turning point chips, See one primary, The field, Heatmap, Turning point rankings, The world (Candidate gates, Environment), Your bracket (advanced), What moved, footer.

### The midterm levers today
| Control | Default | In the sim |
|---|---|---|
| `pOssWin` Ossoff wins Georgia | 62 | Draws win or lose, then `big` (45%) or `narrow`. A win gates `pOssRev` (run). |
| `pTexas` Talarico wins Texas | 55 | `texWin`: base x2 and run odds 60 for that run. |
| `pMich` El-Sayed wins Michigan | 52 | `michWin`: same shape as Texas. |
| `pMaine` Democrat beats Collins | 55 | Shifts the `selLesson` draw weights. |
| `selLesson` Lesson of 2026 | Drawn per run | inst, pop, muddle, under; weights depend on Maine. |

They also appear in: heatmap levers (Texas result, Michigan result), `BP_PRESETS` georgia and texas, the matching chips, `cards/georgia.png`, `cards/texas.png`, `share/georgia.html`, `share/texas.html`, and the input listener list near the end of the script.

## `track.html`
Track record. Reads `history.csv` only. Model versus market over time.

## `gap.html`
Polls versus markets. Reads `polls.csv`, `markets.json`, `notes.json`. 30-day window from today.

## Things the brief assumes that do not match the repo

1. **There is no note row in history.csv.** The 2026-09-17 calendar rebuild note lives in `note.txt`, the hero line under the headline. `history.csv` has no note column and the What moved strip reads none. `note.txt` still shows that September note today. Phase 1 has to either add a `note` column (baseline.js keeps unknown columns, so it would survive) and teach the strip to read it, or keep using `note.txt`.
2. **The run market overrides run odds every night.** `applyMarkets` and the page's `markets.json` fetch replace `c.run` with the Kalshi run price whenever `0 < c.run < 100`. Kalshi has Talarico at 12 and El-Sayed at 19 to run (2026-11-08). Setting their run odds to 60 in `CANDS` would be overwritten by morning. Holding 60 needs a floor field or a switch that skips the run market for them.
3. **Polls are stale.** The newest row in `polls.csv` ends 2026-09-02, so the 30-day window is empty and the poll average column is blank on the live site and on `gap.html`.
4. **Georgia has a margin draw.** A win in `pOssWin` still draws `big` or `narrow`. Resolving it at 100 leaves that draw in place unless Phase 1 also fixes the margin.
5. **Resolved presets.** The georgia and texas turning points, chips, cards, and share pages become no-ops once those levers are constants. Phase 1 should retire or replace them.
6. **Dates and dashes.** `changelog.js`, the hero date line, and the What moved strip label print long dates ("November 8, 2026"), not ISO. `computePaths` in `index.html` prints an em dash in the dossier (between "When X" and "finishes first").
7. **The wire is hardcoded.** `TICK` still carries September 17 prices.
