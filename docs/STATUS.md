# Status

Updated 2026-11-09, evening. The post-midterm stack (PRs #4 to #19) is merged into main. The publication pass is open as one PR on `publication-pass`, based on main. Nothing else is in flight.

## Default run on the 2026-11-09 books (20,000 runs, anchor 50, publication-pass branch)
| | First place |
|---|---|
| AOC | 26.2 |
| Ossoff | 22.8 |
| Newsom | 16.6 |
| Harris | 10.0 |
| Khanna | 5.9 |

37.7 percent of runs reach the convention without a pledged majority. Ballot breakdown: 62.3 first ballot, 8.9 second, 9.2 third, 5.4 fourth, 14.2 plurality.

## What the publication pass changed
* Calls C1 to C3 replaced before locking: AOC above Ossoff in the blend, Ossoff run odds 85, Harris poll gap under 10, all by 2027-06-30. New metric forms: `a-b` differences and `gap.<id>` (default.json `gap`).
* Khanna operator base 5 to 0.5. First place 10.4 to 5.9, rank 4 to 5.
* Reader-facing dates are editorial. ISO stays in data, code, URLs and changelog.html.
* Byline, plain captions, dateline review stamps, a wire with no parameter names, a desk note that leads with who moved.
* Model changes reach readers through notes/changes.json (one plain sentence each) and changelog.html. The history.csv note column stays internal shorthand.

## Waiting on Kevin
1. **Convention rate.** Coordination and dropout transfer alone cannot get the rate under 15 percent. The minimum across their full ranges is 27.7 (coordination 100, transfer 0). Defaults unchanged until you pick another lever.
2. **Lane crowding 0.05.** Parked on local branch `crowding-005` (not pushed), from the parallel session. At 0.05 Khanna drops to 5.5 with his base at 5, and Ossoff moves to first (32.9).
3. **Bracket copy.** The worker is live (CROWD_URL set on main) and Save posts brackets to it, so "nothing stored" and dropping the footer line would both be inaccurate. Left as is.
4. **Merge timing.** The lock check on the push to main fails if this merges after midnight ET, because main's old C1 to C3 lock on 2026-11-10.

## Known loose ends
* Khanna at base 0.5 sits at 5.9 on today's seed and 6.0 to 6.3 on other seeds. His floor comes from AOC's heir path, not his base.
* `notes.json` on the gap page is hand-written and stale.
* The desk note demo uses today's convention rate for every past day.
