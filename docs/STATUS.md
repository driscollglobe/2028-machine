# Status

Updated 2026-11-09, night. Phase 2 (make the model defensible to a Silver-style reader) is six stacked PRs. Nothing is merged. Each PR's base is the one before it, and the first sits on #22 (footer-crowding-note), which is also still open.

## Stack order
| # | PR | Branch | Base |
|---|---|---|---|
| 1 | #23 Iowa swing | `iowa-swing` | `footer-crowding-note` (#22) |
| 2 | #24 Drawn priors | `drawn-priors` | `iowa-swing` |
| 3 | #25 Long-shot correction | `longshot` | `drawn-priors` |
| 4 | #26 Weighted polls | `weighted-polls` | `longshot` |
| 5 | #27 The clock | `clock` | `weighted-polls` |
| 6 | #28 Freeze the knobs, plus the final regeneration | `freeze-knobs` | `clock` |

Merge in that order: #22 first, then #23 to #28. The final regeneration (default.json, wire.json, heatmap, rankings, cards, share pages, desk note, methodology page, notes/changes.json) is the last commit on `freeze-knobs`.

## Default top five, 2026-11-09 books, 20,000 runs
| | Before the stack (main plus #22) | After the stack |
|---|---|---|
| 1 | Ossoff 29.3 | AOC 24.1, likely 14 to 35 |
| 2 | AOC 20.4 | Ossoff 23.7, likely 13 to 37 |
| 3 | Newsom 19.0 | Newsom 18.6, likely 8 to 32 |
| 4 | Harris 11.4 | Khanna 7.8, likely 6 to 10 |
| 5 | Khanna 5.7 | Harris 5.7, likely 3 to 10 |

There were no ranges before the stack. "Likely" is the 10th to 90th percentile across 200 prior draws.

Convention rate (runs that reach the convention without a pledged majority): 11.3 before, 11.2 after. Ballots after: 88.8 first, 5.4 second, 2.4 third, 0.9 fourth, 2.5 plurality.

Step by step: #23 AOC 25.0, Ossoff 22.7, Newsom 18.3, Khanna 9.6, Harris 5.0 (10.6). #24 Ossoff 24.1, AOC 23.4, Newsom 17.5, Khanna 9.2, Harris 5.3 (10.1). #25 AOC 24.1, Ossoff 23.7, Newsom 18.6, Khanna 7.8, Harris 5.7 (11.2). #26 to #28 leave it unchanged.

## Iowa swing
| | Before | After #23 | After the stack |
|---|---|---|---|
| Heatmap, Buttigieg, Iowa crashes the window | +71.1 | +11.0 | +12.0 |
| Heatmap, biggest mover on the Iowa row | Buttigieg +71.1 | Ossoff -13.1 | Ossoff -13.7 |
| Heatmap, Buttigieg, NH jumps the line | +55.7 | +7.6 | +7.7 |
| iowa_trace.js swing (4,000 matched seeds) | 71.2 | 22.2 | 11.0 |

Momentum was not the driver (with it off the old swing was 72.5). The calendar bonus applied all season and the 1.5 Iowa and NH fits were. Kevin chose a 1.2 cap on any one contest's multiplier, with the calendar bonus in the early window only.

## Biggest mover per heatmap row, after the stack
AOC runs: AOC +42.5. NH jumps the line: Ossoff -9.1. Iowa: Ossoff -13.7. AI: AOC -15.1. Affordability: AOC +30.2. Newsom scrutiny: Newsom +25.6. Polls right on Harris: Harris +16.5. Coordination fails: AOC +1.9. Dropout transfer: Ossoff +19.5. Trump approval high: AOC -13.1.

## Waiting on Kevin
* Review and merge #22, then #23 to #28 in order.
* On the day it lands, run the nightly workflow by hand with a `note` (no commas), so history.csv marks the structural change. The final regeneration leaves history.csv to that run.
* Settled 2026-11-09: "transfer share" in the knob list is the secondary pool transfer weight (0.5, now `SIMRULES.pool2Weight`). Kevin confirmed.

## Known loose ends
* Three levers still move one candidate more than 25 points: AOC runs (AOC 42.5), Affordability (AOC 30.2), Newsom scrutiny (Newsom 25.6). Kevin scoped the 25-point rule to the calendar levers.
* The ranges are wider than the "22 to 36" example in the brief. A 30 percent sigma on strength is a big draw because first-place share rises roughly with strength to the fifth power. The clock narrows it to 10 percent by the eve of South Carolina.
* With drawn priors, seed noise on a point estimate is about a point. AOC and Ossoff swap first place on different seeds. The default card now reads default.json so the page and the card agree.
* Call C3 (Harris poll minus market gap under 10) is now graded against the weighted poll average. Today's gap is 15.4 (15.6 on the old method).
* index.html now loads one external script, pollavg.js, shared with gap.html and the nightly job. The sim stays inline.
* The 2020 backtest (backtest-2020/) runs the current sim, which now has drawn priors, a state cap and the clock. It was not rerun.
* `notes.json` on the gap page is hand-written and stale.
