# The 2020 backtest

What would the 2028 Machine have said about the 2020 Democratic primary on 2019-12-01?
**Provisional until Kevin reviews the blind priors.**

* `node backtest-2020/run.js` runs it from the committed inputs and writes `results.md`, `results.csv`
  and `card.png`. The card needs Playwright, or `PLAYWRIGHT_MODULE_DIR`.
* `python3 backtest-2020/fetch_inputs.py` refetches the PredictIt snapshot and the November 2019 polls.
  It needs pandas and lxml.
* The sim is the one in `index.html`, loaded through `scripts/simcore.js`. `run.js` swaps the 2028 data
  for 2020 data in place (`CANDS`, pools, theme fits, calendar, delegates, heatmap levers). It never
  copies the sim code.
* The priors are in `priors.js`. Where they came from is in `SOURCES.md`.
