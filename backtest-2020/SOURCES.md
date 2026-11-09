# Sources for the 2020 backtest

**Provisional until Kevin reviews the blind priors.** Every prior in `priors.js` had to be knowable on
2019-12-01. Nothing published after that date was used. That includes Harris's exit on 2019-12-03, which
is why she is not in the field.

## Data, fetched by `fetch_inputs.py`
* PredictIt market 3633, "Who will win the 2020 Democratic presidential nomination?", public API snapshot
  of 2019-11-25T23:06:17Z on the Wayback Machine:
  https://web.archive.org/web/20191125230617/https://www.predictit.org/api/marketdata/markets/3633
  This is the last archived snapshot on or before 2019-12-01. The next one is 2019-12-02.
* Wikipedia, "Nationwide opinion polling for the 2020 Democratic Party presidential primaries", vote share
  tables, polls ending 2019-11-01 to 2019-12-01 (35 polls):
  https://en.wikipedia.org/wiki/Nationwide_opinion_polling_for_the_2020_Democratic_Party_presidential_primaries
* Delegate counts from the DNC's 2020 allocation: Iowa 41, New Hampshire 24, Nevada 36, South Carolina 54,
  Super Tuesday 1,357, 3,979 pledged in all.

## Reporting behind the priors
These are the facts each prior leans on, with where they were reported before 2019-12-01. **Kevin: I wrote
these from memory of the coverage, not from fetched articles. Confirm each citation, with a link, before
publishing.**

| Prior | Fact it rests on | Reported |
|---|---|---|
| Biden South Carolina fit 1.6 | Biden led Black voters and South Carolina polling by wide margins through fall 2019 | South Carolina polls (Post and Courier, Monmouth), fall 2019 |
| Buttigieg Iowa 1.35, South Carolina 0.45 | Buttigieg led Iowa in November polling; polled near zero with Black voters | Des Moines Register/CNN Iowa poll, 2019-11-16; Quinnipiac South Carolina poll, November 2019 |
| Bloomberg early-state fit 0.1 | Bloomberg entered on 2019-11-24 and said he would skip the first four states | Bloomberg campaign launch coverage, 2019-11-24 |
| Sanders debate and base | Heart attack in October 2019; endorsements from Ocasio-Cortez, Omar and Tlaib in October | Coverage of the October debate and the Queens rally, 2019-10-19 |
| Warren "fading since October" | Medicare for All financing plan released 2019-11-01; national polling slipped through November | Coverage of the plan, 2019-11-01; national poll averages, November 2019 |
| Booker weakness | Missed the December debate threshold | DNC qualification coverage, late November 2019 |
| Steyer Nevada and South Carolina 1.3 | Heavy early-state ad spending in Nevada and South Carolina | Advertising Analytics reports, fall 2019 |
| Gabbard New Hampshire 1.3 | Campaign concentrated in New Hampshire | New Hampshire coverage, fall 2019 |
| Castro Nevada 1.3 | Campaign focused on Nevada and Latino voters | Coverage of the Castro campaign's Nevada push, November 2019 |
| Trump approval 42 | Public approval averages in the low 40s at the start of December 2019 | Poll averages, 2019-12-01 (to verify) |

## Operator choices that are judgment, not fact
* Operator strengths: Biden 24, Sanders 16, Warren 15, Buttigieg 11, Bloomberg 6, Klobuchar 4, Yang 4,
  Booker 3, Steyer 2.5, Gabbard 2, Castro 1.5, the rest 2.
* Pools: Party Anchor (Biden, Booker), Suburb (Buttigieg, Klobuchar, Bloomberg), Movement Left (Sanders,
  Warren, Castro), Outsider (Yang, Steyer, Gabbard, the rest).
* Theme fits, in `priors.js`, written as the 2028 file writes them.
