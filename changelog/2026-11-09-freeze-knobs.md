The 2028 Machine, frozen settings of 2026-11-09

Nine settings are judgment calls with nothing to fit them to. Each now lives in knobs.json with its value, the date it was set and a one-line reason. The Advanced panel keeps its sliders, and their defaults come from knobs.json, in the nightly job and on the page. The build fails if index.html disagrees with knobs.json, if the table on the methodology page is out of date, or if a value changes without its date moving to a later day and a changelog entry on that day naming the setting.

The values as frozen today:
* Lane crowding 5 percent, set 2026-11-09.
* Secondary pool transfer share 50 percent, set 2026-09-10. This was a constant in the code until today (now SIMRULES.pool2Weight). A rival whose second home is the departing candidate's pool counts half as much in a transfer as a rival whose first home is.
* Field leak 30 percent, set 2026-11-09.
* Establishment coordination 50 percent, set 2026-06-14.
* Coordination failure 35 percent, set 2026-06-14.
* Automatic delegate lean 60 percent, set 2026-11-09.
* Debate skill 50 percent, set 2026-06-14.
* Random branch-point events 40 percent, set 2026-06-14. Since the clock, this is today's rate.
* Dropout support transfer 35 percent, set 2026-09-10.

No value changed, so the default numbers do not move.
