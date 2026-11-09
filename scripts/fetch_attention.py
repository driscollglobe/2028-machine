#!/usr/bin/env python3
"""Nightly news attention per candidate. Display only: this never feeds the model.

For each candidate, counts Google News RSS results from the last day for a disambiguated query
(name plus a term that keeps namesakes out, for example "Talarico" Senate). One row per date goes
into attention.csv. The page sums the last seven rows for the trailing week and draws them as a
sparkline. Google News returns at most 100 items per query, so a day at 100 means "100 or more".

Standard library only. A failed query writes an empty cell for that candidate; the script exits 0.
"""
import csv
import os
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_markets import today_str  # noqa: E402

OUT = "attention.csv"
CAP = 100
# id -> query. Quoted surnames plus a context term; full names where the surname is common.
QUERIES = {
    "newsom": '"Gavin Newsom"', "aoc": '"Ocasio-Cortez"', "sanders": '"Bernie Sanders"',
    "ossoff": '"Ossoff"', "harris": '"Kamala Harris"', "shapiro": '"Josh Shapiro"',
    "pete": '"Buttigieg"', "pritzker": '"Pritzker" governor', "khanna": '"Ro Khanna"',
    "murphy": '"Chris Murphy" senator', "kelly": '"Mark Kelly" senator', "beshear": '"Andy Beshear"',
    "rahm": '"Rahm Emanuel"', "whitmer": '"Gretchen Whitmer"', "moore": '"Wes Moore" governor',
    "warnock": '"Raphael Warnock"', "talarico": '"Talarico" Senate', "elsayed": '"El-Sayed" Michigan',
    "stewart": '"Jon Stewart"', "fain": '"Shawn Fain"', "walz": '"Tim Walz"',
    "booker": '"Cory Booker"', "gallego": '"Ruben Gallego"', "slotkin": '"Elissa Slotkin"', "vanhollen": '"Van Hollen"',
}
URL = "https://news.google.com/rss/search?q={q}&hl=en-US&gl=US&ceid=US:en"


def count(q, day=None):
    """day=None counts the last 24 hours; day=YYYY-MM-DD counts that calendar day (for backfill)."""
    if day:
        nxt = (datetime.strptime(day, "%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d")
        q = q + " after:" + day + " before:" + nxt
    else:
        q = q + " when:1d"
    url = URL.format(q=urllib.parse.quote_plus(q))
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; 2028-machine nightly/1.0)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return min(CAP, r.read().decode("utf-8", "replace").count("<item>"))


def fetch_row(day=None):
    row = {"date": day or today_str()}
    for cid, q in QUERIES.items():
        try:
            row[cid] = count(q, day)
        except Exception as e:
            print("::warning::fetch_attention: %s failed: %r" % (cid, e))
            row[cid] = ""
        time.sleep(0.4)  # be polite to the feed
    return row


def main():
    # python3 scripts/fetch_attention.py [--backfill N]  (backfill fills the N days before today once)
    today = today_str()
    new = [fetch_row()]
    if len(sys.argv) > 2 and sys.argv[1] == "--backfill":
        base = datetime.strptime(today, "%Y-%m-%d")
        new += [fetch_row((base - timedelta(days=k)).strftime("%Y-%m-%d")) for k in range(1, int(sys.argv[2]) + 1)]
    row = new[0]
    head = ["date"] + list(QUERIES)
    rows = []
    if os.path.exists(OUT):
        with open(OUT, newline="") as f:
            dates = {r["date"] for r in new}
            rows = [r for r in csv.DictReader(f) if r.get("date") not in dates]
    rows.extend(new)
    rows.sort(key=lambda r: r["date"])
    with open(OUT, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=head, extrasaction="ignore", lineterminator="\n")
        w.writeheader()
        w.writerows(rows)
    print("fetch_attention: %s %s" % (today, ", ".join("%s %s" % (k, row[k]) for k in QUERIES)))


if __name__ == "__main__":
    main()
