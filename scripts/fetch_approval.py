#!/usr/bin/env python3
"""Nightly Trump approval average for the approval lever's default. Standard library only.

Tries, in order, and keeps the first that returns a parseable number:
  1. Silver Bulletin. The public tracker embeds a Datawrapper chart (kSCt4). The chart's
     stable URL redirects to its newest version, and that version's dataset.csv is the
     daily average (modeldate, approve, disapprove, ...). The last row is today's number.
  2. RealClearPolling's approval page (blocks automated clients as of 2026-11-09; kept
     as a fallback in case that changes).
  3. VoteHub's public polls API: a plain mean of approve shares from polls ending in the
     last 14 days.

Writes approval.json: {"value": rounded approve, "approve": raw, "source", "source_url",
"date": the data's date, "fetched"}. On total failure it keeps the last approval.json and
writes a GitHub Actions warning. It exits 0 either way so the nightly run stays green.
"""
import csv
import io
import json
import re
import statistics
import sys
import urllib.request
from datetime import datetime, timedelta, timezone

UA = "Mozilla/5.0 (compatible; 2028-machine nightly/1.0)"
OUT = "approval.json"
SB_CHART = "https://datawrapper.dwcdn.net/kSCt4/"
SB_PAGE = "https://www.natesilver.net/p/trump-approval-ratings-nate-silver-bulletin"
RCP = "https://www.realclearpolling.com/polls/approval/donald-trump/approval-rating"
VOTEHUB = "https://api.votehub.com/polls?poll_type=approval&subject=Trump"


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def iso(mdy):
    return datetime.strptime(mdy, "%m/%d/%Y").strftime("%Y-%m-%d")


def silver_bulletin():
    stub = get(SB_CHART)
    m = re.search(r"kSCt4/(\d+)/", stub)
    if not m:
        raise ValueError("no version in the Datawrapper redirect")
    url = SB_CHART + m.group(1) + "/dataset.csv"
    rows = [r for r in csv.DictReader(io.StringIO(get(url))) if r.get("approve")]
    last = rows[-1]
    approve = float(last["approve"])
    if not 20 <= approve <= 80:
        raise ValueError("implausible approve %s" % approve)
    return {"approve": approve, "date": iso(last["modeldate"]), "source": "Silver Bulletin", "source_url": SB_PAGE}


def realclear():
    page = get(RCP)
    m = re.search(r'"approve"\s*:\s*"?(\d{2}(?:\.\d)?)', page)
    if not m:
        raise ValueError("no approve number on the page")
    return {"approve": float(m.group(1)), "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "source": "RealClearPolling", "source_url": RCP}


def votehub():
    polls = json.loads(get(VOTEHUB))
    cutoff = (datetime.now(timezone.utc) - timedelta(days=14)).strftime("%Y-%m-%d")
    recent = [p for p in polls if p.get("end_date", "") >= cutoff]
    vals = [a["pct"] for p in recent for a in p.get("answers", []) if a.get("choice") == "Approve"]
    if len(vals) < 3:
        raise ValueError("only %d approval polls in 14 days" % len(vals))
    last = max(p["end_date"] for p in recent)
    return {"approve": statistics.mean(vals), "date": last, "source": "VoteHub poll mean", "source_url": "https://votehub.com/polls/trump-approval/"}


def main():
    for name, fn in [("Silver Bulletin", silver_bulletin), ("RealClearPolling", realclear), ("VoteHub", votehub)]:
        try:
            r = fn()
        except Exception as e:
            print("fetch_approval: %s failed: %r" % (name, e), file=sys.stderr)
            continue
        out = {"value": int(round(r["approve"])), "approve": round(r["approve"], 2), "source": r["source"],
               "source_url": r["source_url"], "date": r["date"], "fetched": datetime.now(timezone.utc).strftime("%Y-%m-%d")}
        with open(OUT, "w") as f:
            json.dump(out, f, indent=1)
            f.write("\n")
        print("fetch_approval: %s %s on %s -> lever default %d" % (out["source"], out["approve"], out["date"], out["value"]))
        return
    print("::warning::fetch_approval: every source failed, keeping the last approval.json")


if __name__ == "__main__":
    main()
