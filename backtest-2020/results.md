# The 2028 Machine, run on 2020 as of 2019-12-01

**PROVISIONAL UNTIL KEVIN REVIEWS THE BLIND PRIORS.**

50,000 simulated primaries using the 2028 Machine's own code. Market anchor: PredictIt on 2019-11-25, the last archived snapshot before 2019-12-01, normalized to 100. Polls: 35 national polls ending 2019-11-01 to 2019-12-01, weighted the way the site weights them today. Priors written blind from reporting before 2019-12-01 (SOURCES.md). Run on the model as of 2026-11-09: the PredictIt book gets the long-shot correction before it anchors the model, priors are drawn per run, no single contest multiplies a candidate by more than 1.2, name ID starts from Economist/YouGov on Dec. 1 to 3, 2019 and grows with blind attention scores and late-November Wikipedia pageviews (below), and the clock reads 90 days to South Carolina (event rate 16.1, prior spread 14.1 percent). Anchor 50, lane crowding 0.05, dropout transfer 35 percent with 30 percent leaking to the field, conventions resolved. The fitted market strengths reproduce the corrected PredictIt book within 1.2 points.

## Default top five

| | Candidate | PredictIt | Corrected | Poll avg | Machine | Likely | Operator priors only | Market fit only |
|---|---|---|---|---|---|---|---|---|
| 1 | Elizabeth Warren | 15.9 | 16.4 | 16.6 | 43.7 | 30 to 57 | 47.4 | 15.7 |
| 2 | Joe Biden | 17.4 | 17.9 | 28.9 | 41.6 | 27 to 56 | 45.9 | 18.4 |
| 3 | Pete Buttigieg | 13.8 | 14.2 | 8.8 | 7.6 | 3 to 13 | 3.8 | 13.8 |
| 4 | Bernie Sanders | 10.9 | 11.2 | 18.5 | 5.9 | 3 to 10 | 2.9 | 11.1 |
| 5 | Andrew Yang | 5.8 | 6.0 | 3.2 | 0.6 | 0 to 1 | 0.0 | 6.2 |
| 6 | Michael Bloomberg | 9.4 | 9.7 | 3.5 | 0.3 | 0 to 1 | 0.0 | 9.6 |
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
| 1 | Electability is the issue | 11.62 | Joe Biden +59.7 |
| 2 | Affordability is the issue | 11.29 | Joe Biden -58.2 |
| 3 | Future of work is the issue | 5.51 | Elizabeth Warren -22.7 |
| 4 | Debates matter | 4.50 | Joe Biden -21.4 |
| 5 | Trump approval high | 3.62 | Elizabeth Warren -16.2 |
| 6 | Dropout transfer | 2.85 | Elizabeth Warren +16.1 |
| 7 | Coordination fails | 0.69 | Joe Biden +3.6 |
| 8 | New Hampshire goes first | 0.16 | Pete Buttigieg -0.8 |
| 9 | Establishment coordinates | 0.11 | Pete Buttigieg +0.5 |

## Name ID inputs

Heard-of and net favorable among Democrats from the Economist/YouGov poll of Dec. 1 to 3, 2019 (https://d3nkl3psvxxpe9.cloudfront.net/documents/econTabReport_YZPZ8kJ.pdf). Attention scores were assigned blind from reporting before Dec. 1, 2019 and are for Kevin to review.

| Candidate | Heard of | Net favorable, Democrats | Attention score | Why |
|---|---|---|---|---|
| Joe Biden | 84 | +47 | 10 | Former vice president and front-runner all year; the Ukraine and impeachment story put his name in the news daily from September |
| Bernie Sanders | 86 | +52 | 9 | Heart attack in October then the Ocasio-Cortez endorsement and the biggest rallies and small-dollar totals of the field |
| Elizabeth Warren | 79 | +54 | 9 | Led some national and early-state polls in October; the Medicare for All financing fight kept her on front pages |
| Pete Buttigieg | 67 | +36 | 8 | The breakout of 2019; led Iowa polls in November and drew attacks as a front-runner there |
| Mike Bloomberg | 69 | -1 | 7 | Entered Nov. 24 with record television spending; his entry dominated political coverage for a week |
| Amy Klobuchar | 60 | +21 | 4 | Strong debate nights in October and November and a rise in Iowa; still single digits nationally |
| Andrew Yang | 62 | +27 | 5 | Online following and the universal basic income pitch; qualified for debates but little network coverage |
| Cory Booker | 69 | +41 | 3 | Struggling to qualify for the December debate; coverage was mostly about whether he would last |
| Julian Castro | 62 | +38 | 2 | Missed the November debate stage; coverage was about his campaign's survival |
| Tom Steyer | 53 | +9 | 3 | Heavy paid advertising but little earned coverage |
| Tulsi Gabbard | 59 | -15 | 4 | The October feud with Hillary Clinton made national news; otherwise fringe coverage |

## Convention

12.4 percent of runs reach the convention without a pledged majority. Won on ballot 1: 87.6. Ballot 2: 7.3. Ballot 3: 3.2. Ballot 4: 0.9. Plurality after ballot 4: 1.1.

Reproduce: `node backtest-2020/run.js`. Inputs refresh with `python3 backtest-2020/fetch_inputs.py`.
