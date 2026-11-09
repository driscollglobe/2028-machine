# The 2028 Machine, run on 2020 as of 2019-12-01

**PROVISIONAL UNTIL KEVIN REVIEWS THE BLIND PRIORS.**

50,000 simulated primaries using the 2028 Machine's own code. Market anchor: PredictIt on 2019-11-25, the last archived snapshot before 2019-12-01, normalized to 100. Polls: 35 national polls ending 2019-11-01 to 2019-12-01, weighted the way the site weights them today. Priors written blind from reporting before 2019-12-01 (SOURCES.md). Run on the model as of 2026-11-09: the PredictIt book gets the long-shot correction before it anchors the model, priors are drawn per run, no single contest multiplies a candidate by more than 1.2, and the clock reads 90 days to South Carolina (event rate 16.1, prior spread 14.1 percent). Anchor 50, lane crowding 0.05, dropout transfer 35 percent with 30 percent leaking to the field, conventions resolved. The fitted market strengths reproduce the corrected PredictIt book within 1.2 points.

## Default top five

| | Candidate | PredictIt | Corrected | Poll avg | Machine | Likely | Operator priors only | Market fit only |
|---|---|---|---|---|---|---|---|---|
| 1 | Elizabeth Warren | 15.9 | 16.4 | 16.6 | 41.8 | 27 to 57 | 47.8 | 15.7 |
| 2 | Joe Biden | 17.4 | 17.9 | 28.9 | 40.5 | 26 to 56 | 43.9 | 18.4 |
| 3 | Pete Buttigieg | 13.8 | 14.2 | 8.8 | 10.4 | 4 to 18 | 5.8 | 13.8 |
| 4 | Bernie Sanders | 10.9 | 11.2 | 18.5 | 5.5 | 3 to 9 | 2.4 | 11.1 |
| 5 | Andrew Yang | 5.8 | 6.0 | 3.2 | 0.9 | 1 to 1 | 0.1 | 6.2 |
| 6 | Michael Bloomberg | 9.4 | 9.7 | 3.5 | 0.6 | 0 to 1 | 0.0 | 9.6 |
| 7 | Amy Klobuchar | 2.2 | 1.5 | 1.9 | 0.1 | 0 to 0 | 0.0 | 1.3 |
| 8 | Cory Booker | 0.7 | 0.3 | 2.0 | 0.0 | 0 to 0 | 0.0 | 0.4 |
| 9 | Tom Steyer | 0.7 | 0.3 | 2.0 | 0.0 | 0 to 0 | 0.0 | 0.3 |
| 10 | Tulsi Gabbard | 1.4 | 0.8 | 1.8 | 0.0 | 0 to 0 | 0.0 | 0.7 |
| 11 | Julián Castro | 0.7 | 0.3 |  | 0.0 | 0 to 0 | 0.0 | 0.4 |

What happened: Joe Biden won the nomination. He lost Iowa, New Hampshire and Nevada, won South Carolina on 2020-02-29, and took Super Tuesday after Buttigieg and Klobuchar dropped out and endorsed him.

## Turning point rankings

Average swing in first place share across the field when each lever flips, 5,000 matched seed pairs per lever.

| | Turning point | Average swing | Biggest mover |
|---|---|---|---|
| 1 | Affordability is the issue | 11.29 | Joe Biden -56.2 |
| 2 | Electability is the issue | 11.28 | Joe Biden +56.9 |
| 3 | Future of work is the issue | 5.77 | Elizabeth Warren -24.4 |
| 4 | Debates matter | 4.30 | Joe Biden -20.5 |
| 5 | Trump approval high | 3.59 | Joe Biden +15.8 |
| 6 | Dropout transfer | 2.83 | Elizabeth Warren +16.1 |
| 7 | Coordination fails | 0.80 | Joe Biden +4.2 |
| 8 | Establishment coordinates | 0.20 | Pete Buttigieg +0.9 |
| 9 | New Hampshire goes first | 0.13 | Pete Buttigieg -0.6 |

## Convention

12.9 percent of runs reach the convention without a pledged majority. Won on ballot 1: 87.1. Ballot 2: 7.2. Ballot 3: 3.4. Ballot 4: 1.1. Plurality after ballot 4: 1.3.

Reproduce: `node backtest-2020/run.js`. Inputs refresh with `python3 backtest-2020/fetch_inputs.py`.
