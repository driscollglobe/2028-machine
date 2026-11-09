# Sources for the 2020 backtest

**Provisional until Kevin reviews the blind priors.** Every prior in `priors.js` had to be knowable on
2019-12-01. Nothing published after that date was used. That includes Harris's exit on 2019-12-03, which
is why she is not in the field. Two rows below are still open: Steyer's spending and the exact approval value.

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
These are the facts each prior leans on. Everything in this table was checked on 2026-11-09 and was public by 2019-12-01, unless the row says otherwise.

| Prior | Fact it rests on | Source (dated before 2019-12-01 unless noted) |
|---|---|---|
| Biden South Carolina fit 1.6 | Biden led South Carolina by about 20 points in November polling and led Black voters by a wide margin all fall | Quinnipiac SC poll, 2019-11-13 to 17, via [Washington Times, 2019-11-18](https://m.washingtontimes.com/news/2019/nov/18/joe-biden-big-over-2020-dem-rivals-south-carolina-/); Post and Courier/Change Research, [October 15 to 21](https://changeresearch.com/south-carolina-poll-october-15-21/) |
| Buttigieg Iowa 1.35 | Buttigieg first in Iowa at 25 percent | Des Moines Register/CNN/Mediacom Iowa Poll, 2019-11-08 to 13, released 2019-11-16, via [Washington Times, 2019-11-17](https://m.washingtontimes.com/news/2019/nov/17/pete-buttigieg-surges-lead-iowa-poll/) |
| Buttigieg South Carolina 0.45 | Under 1 percent with Black voters in South Carolina | Same Quinnipiac poll, via [The Week](https://theweek.com/speedreads/879289/pete-buttigieg-0-percent-support-from-black-voters-new-south-carolina-poll) and [The Intercept, 2019-11-20](https://theintercept.com/2019/11/20/pete-buttigieg-black-voters-south-carolina/) |
| Bloomberg early-state fit 0.1 | Planned to skip Iowa, New Hampshire, Nevada and South Carolina; launched 2019-11-24 | AP, pre-launch, via [ABC News 4](https://abcnews4.com/news/nation-world/bloomberg-opens-door-to-a-2020-democratic-presidential-bid); [campaign article](https://en.wikipedia.org/wiki/Mike_Bloomberg_2020_presidential_campaign) |
| Sanders base | Heart attack in early October 2019; Ocasio-Cortez endorsed him at the Queensbridge Park rally on 2019-10-19 | [VTDigger, 2019-10-19](https://vtdigger.org/2019/10/19/20000-attend-sanders-reboot-in-ny/); [WGBH, 2019-10-19](https://www.wgbh.org/news/national/2019-10-19/alexandria-ocasio-cortez-says-bernie-sanders-heart-attack-was-a-gut-check-moment) |
| Warren "fading since October" | Medicare for All financing plan, $20.5 trillion in new federal spending, released 2019-11-01; she dropped in the November Iowa Poll | [NPR, 2019-11-01](https://www.npr.org/2019/11/01/775339519/heres-how-warren-finds-20-5-trillion-to-pay-for-medicare-for-all); [Roll Call, 2019-11-01](https://rollcall.com/2019/11/01/warren-medicare-for-all-plan-has-20-5-trillion-price-tag/) |
| Booker weakness | Met the donor threshold for the December debate but had no qualifying poll and sat near 2 percent nationally. (He confirmed on 2019-12-12 that he would miss it. That is after the cutoff and is not used.) | [Washington Times, 2019-11-21](https://m.washingtontimes.com/news/2019/nov/21/cory-booker-camp-says-hes-hit-donor-threshold-next/); [WTOP, 2019-11-26](https://wtop.com/presidential-election/2019/11/bookers-campaign-shifts-into-all-out-sprint-to-persuade-voters-to-get-him-in-december-debate) |
| Gabbard New Hampshire 1.3 | Pulled back from Iowa in October and concentrated on New Hampshire with frequent town halls | [Valley News](https://www.vnews.com/Gabbard-seeking-primary-traction-in-N-H-32175227) (date to confirm); [Good Morning America](https://www.goodmorningamerica.com/news/story/tulsi-gabbard-moves-hampshire-candidate-places-bets-states-67504440) (date to confirm) |
| Castro Nevada 1.3 | More trips to Nevada than any other candidate; built his path on Nevada and Latino voters | [Dallas Morning News, 2019-11-09](https://dallasnews.com/news/politics/2019/11/09/julian-castros-balancing-act-yet-to-pay-off-court-latinos-without-getting-pegged-as-the-brown-guy); [Texas Tribune, 2019-11-02](https://www.texastribune.org/2019/11/02/julian-castro-pushes-after-11th-hour-fundraising-drive-orourke-exit/) |
| Steyer Nevada and South Carolina 1.3 | Heavy ad spending in both states | **Not confirmed before the cutoff.** The spending figures I found ([Advertising Analytics via The Hill](https://digital-release.thehill.com/homenews/campaign/484099-steyer-spends-big-on-facebook-ads-in-nevada-south-carolina)) date from early 2020. Either find a fall 2019 source or drop the prior to 1.0. |
| Trump approval 42 | FiveThirtyEight's average was about 41.1 in mid-November and 41.9 in mid-December 2019 | Reported in a FiveThirtyEight year-end piece that search surfaced, likely [this one](https://fivethirtyeight.com/features/the-year-in-trumps-approval-rating); I did not open it. The archived daily value for 2019-12-01 was not fetched. |

## Operator choices that are judgment, not fact
* Operator strengths: Biden 24, Sanders 16, Warren 15, Buttigieg 11, Bloomberg 6, Klobuchar 4, Yang 4,
  Booker 3, Steyer 2.5, Gabbard 2, Castro 1.5, the rest 2.
* Pools: Party Anchor (Biden, Booker), Suburb (Buttigieg, Klobuchar, Bloomberg), Movement Left (Sanders,
  Warren, Castro), Outsider (Yang, Steyer, Gabbard, the rest).
* Theme fits, in `priors.js`, written as the 2028 file writes them.
