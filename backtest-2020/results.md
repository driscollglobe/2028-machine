# The 2028 Machine, run on 2020 as of 2019-12-01

**PROVISIONAL UNTIL KEVIN REVIEWS THE BLIND PRIORS.**

20,000 simulated primaries using the 2028 Machine's own code. Market anchor: PredictIt on 2019-11-25, the last archived snapshot before 2019-12-01, normalized to 100. Polls: 35 national polls ending 2019-11-01 to 2019-12-01, equal weight. Priors written blind from reporting before 2019-12-01 (SOURCES.md). Anchor 50, lane crowding 0.15, conventions resolved. The fitted market strengths reproduce PredictIt within 2.1 points.

## Default top five

| | Candidate | PredictIt | Poll avg | Machine | Operator priors only | Market fit only |
|---|---|---|---|---|---|---|
| 1 | Joe Biden | 17.4 | 27.2 | 51.7 | 55.3 | 16.0 |
| 2 | Elizabeth Warren | 15.9 | 16.2 | 37.8 | 38.0 | 16.7 |
| 3 | Pete Buttigieg | 13.8 | 9.0 | 7.1 | 4.5 | 14.5 |
| 4 | Bernie Sanders | 10.9 | 17.7 | 3.2 | 2.3 | 10.7 |
| 5 | Andrew Yang | 5.8 | 3.0 | 0.2 | 0.0 | 6.2 |
| 6 | Michael Bloomberg | 9.4 | 3.5 | 0.0 | 0.0 | 9.3 |
| 7 | Amy Klobuchar | 2.2 | 1.8 | 0.0 | 0.0 | 2.1 |
| 8 | Cory Booker | 0.7 | 2.2 | 0.0 | 0.0 | 0.7 |
| 9 | Tom Steyer | 0.7 | 2.0 | 0.0 | 0.0 | 0.7 |
| 10 | Tulsi Gabbard | 1.4 | 1.3 | 0.0 | 0.0 | 1.7 |
| 11 | Julián Castro | 0.7 |  | 0.0 | 0.0 | 0.8 |

What happened: Joe Biden won the nomination. He lost Iowa, New Hampshire and Nevada, won South Carolina on 2020-02-29, and took Super Tuesday after Buttigieg and Klobuchar dropped out and endorsed him.

## Turning point rankings

Average swing in first place share across the field when each lever flips, 5,000 matched seed pairs per lever.

| | Turning point | Average swing | Biggest mover |
|---|---|---|---|
| 1 | Affordability is the issue | 11.43 | Joe Biden -57.6 |
| 2 | Electability is the issue | 11.35 | Joe Biden +58.8 |
| 3 | Future of work is the issue | 6.51 | Elizabeth Warren -31.2 |
| 4 | Debates matter | 5.42 | Joe Biden -28.1 |
| 5 | Trump approval high | 4.00 | Elizabeth Warren -19.8 |
| 6 | Dropout transfer | 2.72 | Joe Biden -12.2 |
| 7 | Coordination fails | 0.59 | Elizabeth Warren -3.2 |
| 8 | New Hampshire goes first | 0.18 | Elizabeth Warren +0.8 |
| 9 | Establishment coordinates | 0.13 | Elizabeth Warren -0.7 |

## Convention

35.4 percent of runs reach the convention without a pledged majority. Won on ballot 1: 64.6. Ballot 2: 15.7. Ballot 3: 15.0. Ballot 4: 3.8. Plurality after ballot 4: 0.9.

Reproduce: `node backtest-2020/run.js`. Inputs refresh with `python3 backtest-2020/fetch_inputs.py`.
