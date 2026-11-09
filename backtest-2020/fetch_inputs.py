#!/usr/bin/env python3
"""Fetch the two public inputs for the 2020 backtest into backtest-2020/data/. Run once; the
results are committed, so the backtest itself runs offline.

1. PredictIt "Who will win the 2020 Democratic presidential nomination?" (market 3633), from the
   Wayback Machine snapshot of PredictIt's public API taken on or before 2019-12-01. The last
   snapshot before that date is 2019-11-25T23:06:17Z. Prices are last trades in dollars. They sum
   past 1 because of PredictIt's overround, so the backtest normalizes them to 100.
2. National polls from Wikipedia, "Nationwide opinion polling for the 2020 Democratic Party
   presidential primaries", the 30 days ending 2019-12-01. Uses the same table parser as the
   nightly 2028 scrape (scripts/fetch_polls.py).

Needs pandas and lxml for step 2.  python3 backtest-2020/fetch_inputs.py
"""
import csv
import io
import os
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))
import fetch_polls as fp  # noqa: E402

SNAPSHOT = "https://web.archive.org/web/20191125230617id_/https://www.predictit.org/api/marketdata/markets/3633"
WIKI = "https://en.wikipedia.org/wiki/Nationwide_opinion_polling_for_the_2020_Democratic_Party_presidential_primaries"
END = date(2019, 12, 1)
START = date(2019, 11, 1)
NAMES = {"joe biden": "biden", "bernie sanders": "sanders", "elizabeth warren": "warren", "pete buttigieg": "buttigieg",
         "michael bloomberg": "bloomberg", "amy klobuchar": "klobuchar", "andrew yang": "yang", "cory booker": "booker",
         "julián castro": "castro", "julian castro": "castro", "tom steyer": "steyer", "tulsi gabbard": "gabbard"}
IDS = ["biden", "sanders", "warren", "buttigieg", "bloomberg", "klobuchar", "yang", "booker", "castro", "steyer", "gabbard"]


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "2028-machine backtest/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", "replace")


def predictit():
    root = ET.fromstring(get(SNAPSHOT))
    stamp = root.findtext("TimeStamp")
    rows = [(c.findtext("Name"), float(c.findtext("LastTradePrice") or 0)) for c in root.iter("MarketContract")]
    with open(os.path.join(HERE, "data", "predictit_2019-11-25.csv"), "w", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["contract", "id", "last_trade", "snapshot_utc", "source"])
        for n, p in sorted(rows, key=lambda x: -x[1]):
            w.writerow([n, NAMES.get(n.lower(), ""), p, stamp, SNAPSHOT])
    print("predictit: %d contracts at %s" % (len(rows), stamp))


def polls():
    import pandas as pd
    page = fp.inline_footnotes(get(WIKI))
    out = []
    for t in pd.read_html(io.StringIO(page)):
        cols = [str(c[-1] if isinstance(c, tuple) else c) for c in t.columns]
        t.columns = cols
        if not cols or not cols[0].lower().startswith(("poll source", "pollster")):
            continue
        # vote share tables carry a margin of error column; the favorability tables on the page do not
        if not any(c.lower().startswith("margin") for c in cols):
            continue
        dcol = next((c for c in cols if c.lower().startswith("date")), None)
        scol = next((c for c in cols if c.lower().startswith("sample")), None)
        if not dcol:
            continue
        for _, r in t.iterrows():
            src = r[cols[0]]
            ds = str(r[dcol])
            # the monthly tables print dates without a year; the window here is November 2019 only
            if not re.search(r"\d{4}", ds):
                ds = ds + ", 2019"
            try:
                d = fp.parse_dates(ds)
            except ValueError:
                d = None  # Feb 29 rows from 2020 tables read as 2019; outside the window anyway
            if not isinstance(src, str) or not d or not (START <= d[1] <= END):
                continue
            n, pop = fp.parse_sample(r[scol]) if scol else ("", "")
            row = {"pollster": re.sub(r"\[[a-z0-9]+\]", "", src).strip(), "field_start": d[0].isoformat(), "field_end": d[1].isoformat(), "sample": n, "population": pop}
            for c in cols[3:]:
                cid = NAMES.get(c.lower().strip())
                v = fp.pct(r[c])
                if cid and v is not None:
                    row[cid] = v
            if any(k in row for k in IDS):
                out.append(row)
    seen, uniq = set(), []
    for r in out:
        k = (r["pollster"], r["field_end"], r.get("biden"))
        if k not in seen:
            seen.add(k)
            uniq.append(r)
    with open(os.path.join(HERE, "data", "polls_2019-11.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["pollster", "field_start", "field_end", "sample", "population"] + IDS, lineterminator="\n", extrasaction="ignore")
        w.writeheader()
        w.writerows(sorted(uniq, key=lambda r: r["field_end"], reverse=True))
    print("polls: %d national polls ending %s to %s" % (len(uniq), START, END))


if __name__ == "__main__":
    predictit()
    polls()
