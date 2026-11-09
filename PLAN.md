# The 2028 Machine: post-midterm rebuild plan

Repo: github.com/driscollglobe/2028-machine. Local clone: ~/Desktop/2028. Live: driscollglobe.github.io/2028-machine.

One phase per PR, in order. Each phase lists what to build, what Kevin decides, and what done looks like.

Reordered 2026-11-09: auto-polls moved up to Phase 2 because the poll column is blank on the live site. Old Phases 2 to 4 shift down one. Phases 6 to 14 keep their numbers.

## Ground rules

* One PR per phase. Branch name is the phase slug. Merge only after Kevin says so.
* Keep index.html as a single file unless a phase says otherwise.
* The nightly workflow (update-markets.yml) must stay green after every phase.
* Every PR description prints the default top five before and after the change, from a fresh 20,000 run.
* Where a phase says "Kevin decides," stop and ask him before implementing that part.
* Nothing posts anywhere public without Kevin typing the word go in the session.
* All dates ISO (2026-11-03). No em dashes or en dashes in user-facing text. Short declarative sentences in page copy.
* A structural change that moves the default numbers gets a note in history.csv on the day it lands. Set it with the `note` input on a manual run of the nightly workflow. The hero line and the What moved strip read it.

## What 2026-11-03 settled

* Georgia Senate: Jon Ossoff beat Mike Collins. Roughly 59 to 41.
* Texas Senate: James Talarico beat Ken Paxton.
* Michigan Senate: Abdul El-Sayed beat Mike Rogers.
* Maine Senate: Troy Jackson beat Susan Collins.
* Democrats won the House and the Senate.

## Phase 0: file map (done, PR 4)

docs/FILEMAP.md. No behavior change.

## Phase 1: resolve the midterm levers (slug: post-midterm)

Decided 2026-11-09:
* Talarico and El-Sayed: run odds come from the run market, no floor. Doubled base strength (4 to 8) is the baseline.
* Lesson of 2026: "Democrats underperformed" removed. Default "Both sides claim victory."
* What 2028 is about: Affordability and class is the largest share and stays drawn per run.
* No 2026 winner enters the field.
* Notes: a note column in history.csv. note.txt retired.
* Georgia margin fixed to big (roughly 18 points).
* Georgia and Texas chips, cards and share pages retired. Five chips remain.
* Wire generated nightly from markets.json and default.json.
* ISO dates and no em dash in the dossier.

## Phase 2: automate polls (slug: auto-polls)

fetch_polls.py pulls the Wikipedia table "Nationwide opinion polling for the 2028 Democratic Party presidential primaries" with pandas.read_html. Normalize names to field keys. Write polls.csv with pollster, field dates, sample, and shares. Keep the 30-day equal-weight mean and the Harvard CAPS note. If the scrape fails or returns fewer than three polls in 30 days, keep the last good polls.csv and warn in the log. Footer: "polls pulled nightly from public aggregators."

Done when a nightly run writes polls.csv with no hand edits and the gap column updates.

## Phase 3: the anchor slider (slug: anchor-slider)

A global slider in The World, "Anchor," 0 to 100. `base = (1 - a) * operator_norm + a * market_norm`. Levers, pools, calendar, convention run on top. `a` in URL state and share links. Field cards show model minus market. default.json and cards use the default.

Kevin decides the default `a`.

Done when `a = 100` reproduces the market order in the top eight within run noise and `a = 0` reproduces today's output.

## Phase 4: precompute the heatmap (slug: nightly-heatmap)

The 5,000 matched-seed heatmap moves into the nightly job, run in Node from the same sim code. Write heatmap.json and rankings.json. The page loads both on first paint. "Build heatmap" becomes "Recompute with my settings." The turning point chips become the top seven from rankings.json, so nobody picks chips by hand.

Done when a cold load shows the heatmap, rankings, and chips with no click, and recompute still works.

## Phase 5: the calls ledger (slug: calls-ledger)

calls.csv: id, date_made, text, metric, operator, threshold, deadline, status, resolved_date, resolved_value. Nightly grading. A lock check fails the build if a past row's text, metric, operator, threshold, or deadline changes. A Calls section on index.html and a full table on track.html with a record line "X for Y."

Kevin decides the first three calls.

Done when a test call with a past deadline grades correctly in a dry run and the lock check fails on an edited past row.

## Phase 6: automate the Trump approval default (slug: auto-approval)

Nightly pull of a public approval average: Silver Bulletin, then RealClearPolling, then VoteHub. The lever default becomes that number, rounded, with "source, date." Keep the last value on failure.

## Phase 7: the nightly desk note (slug: desk-note)

desk_note.py writes 100 to 140 words from the day's data with templates. notes/YYYY-MM-DD.md, a 1200 by 675 card, and a Desk note box above the wire. X posts only as draft files. Report on Substack Notes API. Nothing posts until Kevin types go.

Kevin decides the voice rules.

## Phase 8: the reader crowd layer (slug: crowd-layer)

Cloudflare Worker in worker/: POST /bracket, GET /aggregate, KV, daily-salted IP hash rate limit, no PII. "Globe readers" column once count reaches 25. Kevin deploys.

## Phase 9: resolve the convention (slug: convention)

Second ballot onward with pool transfers, automatic delegates from ballot two at the 2028 rule size, lean toward Party Anchor and Suburb. Up to ballot four, then plurality. "Won on ballot N." Toggle "Resolve conventions," default on.

Kevin decides the automatic-delegate lean.

## Phase 10: pools in the math (slug: pool-math)

Lane crowding: pool strength scales by `1 / (1 + c * (n - 1))`. c in Advanced.

Kevin decides the default c.

## Phase 11: the attention column (slug: attention)

fetch_attention.py counts Google News RSS results per candidate over seven days. attention.csv, a column and sparkline on field cards. Not in the math.

## Phase 12: model versus market scoreboard (slug: lead-lag)

On track.html, lead and lag counts of same-sign moves at lags -3 to +3 days, threshold 0.5 points. Both directions shown.

## Phase 13: the methodology page (slug: methodology)

methodology.html. One worked primary, fixed seed, every number reproducible. Draft for Kevin to rewrite.

## Phase 14: the 2020 backtest (slug: backtest-2020)

backtest-2020/ with PredictIt prices as of 2019-12-01, the Wikipedia national polls for the 30 days before, the 2020 field, blind priors from reporting before that date. One command. A results table and one share card.
