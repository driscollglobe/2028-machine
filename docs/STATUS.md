# Status

Updated 2026-11-09, evening. The post-midterm stack (PRs #4 to #19) is merged into main. The publication pass is open as one PR on `publication-pass`, based on main. Nothing else is in flight.

## Default run on the 2026-11-09 books (20,000 runs, anchor 50, publication-pass branch)
| | First place |
|---|---|
| Ossoff | 25.2 |
| AOC | 21.3 |
| Newsom | 16.5 |
| Harris | 12.8 |
| Khanna | 5.6 |

13.2 percent of runs reach the convention without a pledged majority (37.7 before the field rules changed). Ballot breakdown: 86.8 first ballot, 7.1 second, 2.7 third, 0.9 fourth, 2.6 plurality.

## What the publication pass changed
* Calls C1 to C3 replaced before locking: AOC above Ossoff in the blend, Ossoff run odds 85, Harris poll gap under 10, all by 2027-06-30. New metric forms: `a-b` differences and `gap.<id>` (default.json `gap`).
* Khanna operator base 5 to 0.5. First place 10.4 to 5.9 under the old field rules, 5.6 after them.
* Field rules (`SIMRULES` in index.html): top two after Super Tuesday (was three), dropout line 0.11 (was 0.07; 0.09 when coordination fails, was 0.05). Coordination and transfer defaults unchanged. methodology_run.js pins the old rules for the seed 5 example.
* Reader-facing dates are editorial. ISO stays in data, code, URLs and changelog.html.
* Byline, plain captions, dateline review stamps, a wire with no parameter names, a desk note that leads with who moved.
* Model changes reach readers through notes/changes.json (one plain sentence each) and changelog.html. The history.csv note column stays internal shorthand.

## Waiting on Kevin
1. **Lane crowding 0.05.** Parked on local branch `crowding-005` (not pushed), from the parallel session. Its numbers (Khanna 5.5 at base 5, Ossoff 32.9) were measured under the old field rules and need rerunning.
2. **Bracket copy.** The worker is live (CROWD_URL set on main) and Save posts brackets to it, so "nothing stored" and dropping the footer line would both be inaccurate. Left as is.
3. **Merge timing.** The lock check on the push to main fails if this merges after midnight ET, because main's old C1 to C3 lock on 2026-11-10.

## Known loose ends
* `notes.json` on the gap page is hand-written and stale.
* The desk note demo uses today's convention rate for every past day.
