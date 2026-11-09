# Status

Updated 2026-11-09, evening. The post-midterm stack (PRs #4 to #19) is merged into main. The publication pass is open as one PR on `publication-pass`, based on main. Nothing else is in flight.

## Default run on the 2026-11-09 books (20,000 runs, anchor 50, publication-pass branch)
| | First place |
|---|---|
| Ossoff | 35.0 |
| Newsom | 16.4 |
| AOC | 15.5 |
| Harris | 13.7 |
| Khanna | 4.7 |

11.8 percent of runs reach the convention without a pledged majority (37.7 before). Ballot breakdown: 88.2 first ballot, 6.3 second, 3.1 third, 1.5 fourth, 1.0 plurality.

## What the publication pass changed
* Calls C1 to C3 replaced before locking: AOC above Ossoff in the blend, Ossoff run odds 85, Harris poll gap under 10, all by 2027-06-30. New metric forms: `a-b` differences and `gap.<id>` (default.json `gap`).
* Lane crowding 0.15 to 0.05. Khanna falls to 4.7 with his base back at 5 (it was briefly 0.5 earlier on 2026-11-09).
* Field rules (`SIMRULES` in index.html): top two after Super Tuesday (was three), dropout line 0.11 (was 0.07; 0.09 when coordination fails, was 0.05). Coordination and transfer defaults unchanged. methodology_run.js pins the old rules and crowding for the seed 5 example.
* Bracket box: "No accounts. Saving adds your numbers, anonymously, to the Globe readers column." The footer line about reader brackets stays, since the worker is live.
* Reader-facing dates are editorial. ISO stays in data, code, URLs and changelog.html.
* Byline, plain captions, dateline review stamps, a wire with no parameter names, a desk note that leads with who moved.
* Model changes reach readers through notes/changes.json (one plain sentence each) and changelog.html. The history.csv note column stays internal shorthand.

## Waiting on Kevin
Nothing. PR #20 merged on 2026-11-09.

## Known loose ends
* `notes.json` on the gap page is hand-written and stale.
* The desk note demo uses today's convention rate for every past day.
