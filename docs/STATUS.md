# Rebuild status

Written 2026-11-09 at the end of the unattended run. Nothing was merged. Nothing was pushed to main. Nothing was posted anywhere. No worker was deployed.

## The stack
Each PR is based on the one above it. Merge from the top of this list down.

| PR | Branch | Phase | What it changes | Default top five after (2026-11-08 books) |
|---|---|---|---|---|
| [#4](https://github.com/driscollglobe/2028-machine/pull/4) | filemap | 0 | docs/FILEMAP.md. No behavior change. Based on main. | unchanged |
| [#5](https://github.com/driscollglobe/2028-machine/pull/5) | post-midterm | 1 | Resolved levers and a What 2026 settled strip. Talarico and El-Sayed base 8, run odds from the market. Lesson default Both sides claim victory. Reviewed stamps and a dynamic footer. history.csv note column replaces note.txt. Nightly wire.json. Georgia and Texas presets retired. ISO dates. PLAN.md. | AOC 32.3, Ossoff 23.8, Newsom 23.3, Harris 9.6, Khanna 4.8 |
| [#6](https://github.com/driscollglobe/2028-machine/pull/6) | auto-polls | 2 | Nightly Wikipedia poll scrape into polls.csv, with a keep-last-good fallback. | unchanged |
| [#7](https://github.com/driscollglobe/2028-machine/pull/7) | anchor-slider | 3 | Anchor slider. Market strengths fitted nightly so a = 100 reproduces the books. Model vs market on cards. `?a=` in links. | Ossoff 26.9, AOC 26.0, Newsom 20.2, Harris 9.3, Khanna 3.5 |
| [#8](https://github.com/driscollglobe/2028-machine/pull/8) | nightly-heatmap | 4 | Heatmap and rankings precomputed nightly with the same code. Recompute button kept. Chips are the top seven turning points. | unchanged |
| [#9](https://github.com/driscollglobe/2028-machine/pull/9) | calls-ledger | 5 | calls.csv, nightly grading, lock check, Checks workflow, unit tests, Calls sections. | unchanged |
| [#10](https://github.com/driscollglobe/2028-machine/pull/10) | auto-approval | 6 | Nightly Silver Bulletin approval sets the lever default. | unchanged (38 either way) |
| [#11](https://github.com/driscollglobe/2028-machine/pull/11) | desk-note | 7 | Templated nightly desk note, a 1200x675 card, and a Desk note box. Templates are a draft. | unchanged |
| [#12](https://github.com/driscollglobe/2028-machine/pull/12) | crowd-layer | 8 | Cloudflare Worker for anonymous brackets, not deployed. Globe readers column at 25 or more. | unchanged |
| [#13](https://github.com/driscollglobe/2028-machine/pull/13) | convention | 9 | Ballots 2 to 4, then plurality. Automatic delegates from ballot 2. Unresolved share goes to 0. | Ossoff 32.5, AOC 21.7, Newsom 16.3, Harris 12.0, Khanna 3.2 |
| [#14](https://github.com/driscollglobe/2028-machine/pull/14) | pool-math | 10 | Lane crowding `1 / (1 + c (n - 1))` at c = 0.15. | AOC 28.9, Ossoff 20.8, Newsom 17.5, Harris 10.0, Khanna 7.4 (anchor refit) |
| [#15](https://github.com/driscollglobe/2028-machine/pull/15) | attention | 11 | Google News counts with a seven-day sparkline. Not in the math. | unchanged |
| [#16](https://github.com/driscollglobe/2028-machine/pull/16) | lead-lag | 12 | "Who moved first" table on track.html. | unchanged |
| [#17](https://github.com/driscollglobe/2028-machine/pull/17) | methodology | 13 | methodology.html draft, one worked primary at seed 5, reproducible. | unchanged |
| [#18](https://github.com/driscollglobe/2028-machine/pull/18) | backtest-2020 | 14 | 2020 backtest on the same sim code. Provisional. Also adds these status docs. | unchanged |

Each PR's top five came from a fresh 20,000-run baseline on the 2026-11-08 books, with that branch's anchor.json. The nightly job refits the anchor every morning, so live numbers will differ a little. On today's 2026-11-09 books the full stack gives AOC 24.6, Ossoff 23.3, Newsom 15.8, Khanna 9.8, Harris 9.5.

## Defaults used, Kevin to confirm
| Phase | Default | Where it came from |
|---|---|---|
| 1 | Theme weights unchanged; affordability largest at 46.2 | Kevin confirmed, 2026-11-09 |
| 1 | Georgia margin fixed to big (about 59 to 41, unofficial) | Decision Desk HQ, cited in code |
| 1 | Untouched priors stamped reviewed 2026-09 | The month they were written |
| 3 | Anchor 50 | Kevin confirmed, 2026-11-09 |
| 3 | Anchor fit: 30 rounds of 4,000 runs, damping 0.2 | Me, so a = 100 lands within 2 to 5 points of the books |
| 4 | Five new presets for chips | They mirror each heatmap lever's on state |
| 5 | Calls C1 to C3: AOC market 20 or more, Ossoff market under 20 (both by 2027-06-30), Talarico run odds 30 or more by 2027-12-31 | Kevin, 2026-11-09 |
| 6 | Silver Bulletin through its Datawrapper dataset. RealClearPolling returns 403 and VoteHub has no recent polls. | First that parsed |
| 7 | Desk note templates, draft | Me, after the anti-ai-writing skill |
| 8 | Daily limit 5 brackets per reader. The readers column shows the median. | Me |
| 9 | Automatic delegate lean 60 percent to Party Anchor and Suburb | You |
| 9 | Automatic delegate count at the 2024 ratio | The 2028 count is not published |
| 10 | Lane crowding c = 0.15 | You |
| 13 | Seed 5 for the worked primary | Me |
| 14 | All blind priors, labeled provisional | Me, from pre-2019-12-01 reporting |

## How to merge
1. Merge #4, then #5, into main. If GitHub's "delete branch on merge" is on, each next PR retargets to main by itself. If not, edit each PR's base to main before merging it.
2. **Expect one conflict in #5.** The nightly job on main rewrites `cards/georgia.png`, `cards/texas.png`, `share/georgia.html` and `share/texas.html`, and #5 deletes them. Keep the deletion.
3. The PRs commit code, not the nightly outputs (default.json, history.csv, markets.json, cards), so they don't fight the nightly job. After the last merge, run **Nightly market update** by hand from the Actions tab, with this in the `note` box:

   `Post-midterm rebuild: midterm levers resolved; anchor slider at 50; conventions resolved on later ballots; lane crowding at 0.15`

   That one run regenerates everything and writes the note on that day's history row. The hero line and the What moved strip will show it. Notes cannot contain commas or quotes.
4. The new Checks workflow runs on every PR from #9 up. It needs no secrets.

## Things I noticed and left alone
* `notes.json` on the gap page is hand-written and stale. The Harris note says plus 21; the gap is now plus 15.3.
* Talarico's weakness still reads "No infrastructure," which may be stale for a senator-elect.
* The 2026-09-17 calendar rebuild row in history.csv has no note, so the lead-lag table counts it as a model move.
* Blending at anchor 50 favors whichever input has the wider spread of strengths. In the 2020 backtest that made anchor 50 look almost like operator-only.

## Blocked
Nothing stopped a phase. What waits on you is in [BLOCKED.md](BLOCKED.md).
