#!/usr/bin/env python3
"""Fetch 2028 Democratic nomination prices from Kalshi and Polymarket.

Standard library only. Writes markets.json at the repo root with the shape:
  {"date": "YYYY-MM-DD",
   "kalshi": {id: pct}, "polymarket": {id: pct}, "blend": {id: pct},
   "run": {id: pct}, "sources": [urls]}

blend is the simple average of the two books rounded to one decimal, or the
single available book when one of them lacks the candidate. "other" is 100
minus the sum of the mapped blends, the same rule the page uses for its baked
in value. Contracts that do not map to a candidate id are logged by name and
their blended total is written separately as unmapped_pct for reference.
Any HTTP error, empty book, or missing top candidate is fatal on purpose.
"""
import json
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone
try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover
    ZoneInfo = None
from decimal import Decimal, ROUND_HALF_UP

KALSHI_BASE = "https://api.elections.kalshi.com/trade-api/v2/markets"
KALSHI_NOM_EVENT = "KXPRESNOMD-28"
KALSHI_RUN_EVENT = "KX2028DRUN-28"
POLY_BASE = "https://gamma-api.polymarket.com/events"
POLY_NOM_SLUG = "democratic-presidential-nominee-2028"

SOURCES = [
    KALSHI_BASE + "?event_ticker=" + KALSHI_NOM_EVENT,
    KALSHI_BASE + "?event_ticker=" + KALSHI_RUN_EVENT,
    POLY_BASE + "?slug=" + POLY_NOM_SLUG,
]

# Candidate ids used by index.html. Order matters only for output readability.
IDS = ["newsom", "aoc", "ossoff", "harris", "shapiro", "pete", "pritzker", "khanna",
       "murphy", "kelly", "beshear", "rahm", "whitmer", "moore", "warnock", "talarico",
       "elsayed", "stewart", "fain", "walz", "other"]

# Lowercased contract names as the two books print them.
NAME_TO_ID = {
    "gavin newsom": "newsom",
    "alexandria ocasio-cortez": "aoc",
    "alexandria ocasio cortez": "aoc",
    "jon ossoff": "ossoff",
    "kamala harris": "harris",
    "josh shapiro": "shapiro",
    "pete buttigieg": "pete",
    "j.b. pritzker": "pritzker",
    "jb pritzker": "pritzker",
    "ro khanna": "khanna",
    "chris murphy": "murphy",
    "mark kelly": "kelly",
    "andy beshear": "beshear",
    "rahm emanuel": "rahm",
    "gretchen whitmer": "whitmer",
    "wes moore": "moore",
    "raphael warnock": "warnock",
    "james talarico": "talarico",
    "abdul el-sayed": "elsayed",
    "abdul el sayed": "elsayed",
    "jon stewart": "stewart",
    "shawn fain": "fain",
    "tim walz": "walz",
}

# The five candidates the local sanity check compares against the page.
TOP_FIVE_CHECK = ["aoc", "ossoff", "newsom", "harris", "pete"]


def log(msg):
    print(msg, file=sys.stderr)


def get_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "2028-machine nightly/1.0", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            if resp.status != 200:
                raise SystemExit("HTTP %s from %s" % (resp.status, url))
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8", "replace")[:500]
        except Exception:
            pass
        raise SystemExit("HTTP %s from %s\n%s" % (e.code, url, body))
    except urllib.error.URLError as e:
        raise SystemExit("Network error fetching %s: %s" % (url, e.reason))


def r1(x):
    return float(Decimal(str(x)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))


def map_name(raw):
    key = (raw or "").strip().lower().replace("’", "'")
    return NAME_TO_ID.get(key)


def kalshi_markets(event_ticker):
    """Return every market in a Kalshi event, following the cursor."""
    out = []
    cursor = None
    while True:
        url = KALSHI_BASE + "?event_ticker=" + event_ticker + "&limit=200"
        if cursor:
            url += "&cursor=" + cursor
        data = get_json(url)
        out.extend(data.get("markets", []))
        cursor = data.get("cursor")
        if not cursor:
            break
    if not out:
        raise SystemExit("Kalshi returned zero markets for event " + event_ticker + " at " + url)
    return out


def kalshi_book(event_ticker, label):
    """Map a Kalshi event to {id: pct}. Unmapped contracts go to other."""
    book = {}
    other = 0.0
    unmapped = []
    for m in kalshi_markets(event_ticker):
        name = m.get("yes_sub_title") or m.get("title")
        price = m.get("last_price_dollars")
        if price is None:
            price = m.get("last_price")
            if price is not None:
                price = float(price) / 100.0
        if price is None:
            raise SystemExit("Kalshi %s contract %s has no price field" % (label, m.get("ticker")))
        pct = float(price) * 100.0
        cid = map_name(name)
        if cid is None:
            unmapped.append("%s (%.1f)" % (name, pct))
            other += pct
            continue
        if cid in book:
            raise SystemExit("Kalshi %s maps two contracts to %s" % (label, cid))
        book[cid] = r1(pct)
    if unmapped:
        log("Kalshi %s unmapped: %s" % (label, "; ".join(unmapped)))
    book["_unmapped"] = r1(other)
    return book


def polymarket_book(slug):
    data = get_json(POLY_BASE + "?slug=" + slug)
    if not isinstance(data, list) or not data:
        raise SystemExit("Polymarket returned no event for slug " + slug + ": " + json.dumps(data)[:300])
    event = data[0]
    markets = event.get("markets") or []
    if not markets:
        raise SystemExit("Polymarket event " + slug + " has no markets")
    book = {}
    other = 0.0
    unmapped = []
    placeholders = []
    for m in markets:
        if m.get("closed"):
            continue
        name = m.get("groupItemTitle") or m.get("question")
        raw = m.get("outcomePrices")
        if isinstance(raw, str):
            raw = json.loads(raw)
        if not raw:
            # Polymarket pre-creates inactive placeholder slots ("Person V", "Other")
            # with no price. Those are not contracts anyone can trade; skip them.
            if not m.get("active"):
                placeholders.append(name)
                continue
            raise SystemExit("Polymarket active contract %s has no outcomePrices" % name)
        pct = float(raw[0]) * 100.0
        cid = map_name(name)
        if cid is None:
            unmapped.append("%s (%.1f)" % (name, pct))
            other += pct
            continue
        if cid in book:
            raise SystemExit("Polymarket maps two contracts to %s" % cid)
        book[cid] = r1(pct)
    if placeholders:
        log("Polymarket skipped %d inactive placeholder slots with no price" % len(placeholders))
    if unmapped:
        log("Polymarket unmapped: %s" % "; ".join(unmapped))
    book["_unmapped"] = r1(other)
    return book


def blend_books(k, p):
    blend = {}
    for cid in IDS:
        if cid == "other":
            continue
        kv = k.get(cid)
        pv = p.get(cid)
        if kv is not None and pv is not None:
            blend[cid] = r1((kv + pv) / 2.0)
        elif kv is not None:
            blend[cid] = kv
        elif pv is not None:
            blend[cid] = pv
    # other is the residual: 100 minus everything the model names
    blend["other"] = r1(100.0 - sum(blend.values()))
    return blend


def today_str():
    """Stamp rows with the desk's date (US Eastern). The 10:00 UTC cron lands at 6am Eastern,
    so the two agree on the nightly run; this only matters for manual runs late in the day."""
    tz = timezone.utc
    if ZoneInfo is not None:
        try:
            tz = ZoneInfo("America/New_York")
        except Exception:
            pass
    return datetime.now(tz).strftime("%Y-%m-%d")


def main():
    kal = kalshi_book(KALSHI_NOM_EVENT, "nominee")
    poly = polymarket_book(POLY_NOM_SLUG)
    run = kalshi_book(KALSHI_RUN_EVENT, "run")
    run.pop("_unmapped", None)
    unmapped_pct = r1((kal["_unmapped"] + poly["_unmapped"]) / 2.0)

    blend = blend_books(kal, poly)
    missing = [c for c in TOP_FIVE_CHECK if c not in blend]
    if missing:
        raise SystemExit("Top candidates missing from both books: " + ", ".join(missing))
    zeros = [c for c in TOP_FIVE_CHECK if blend[c] <= 0]
    if zeros:
        raise SystemExit("Refusing to write zero prices for: " + ", ".join(zeros))

    out = {
        "date": today_str(),
        "kalshi": {c: kal[c] for c in IDS if c in kal},
        "polymarket": {c: poly[c] for c in IDS if c in poly},
        "blend": blend,
        "run": {c: run[c] for c in IDS if c in run},
        "unmapped_pct": unmapped_pct,
        "sources": SOURCES,
    }
    with open("markets.json", "w") as f:
        json.dump(out, f, indent=1)
        f.write("\n")
    log("Wrote markets.json for " + out["date"] + "; unmapped contracts blended to %s" % unmapped_pct)
    for c in IDS:
        log("  %-9s kalshi %-5s poly %-5s blend %-5s run %s" % (
            c, kal.get(c, "-"), poly.get(c, "-"), blend.get(c, "-"), run.get(c, "-")))


if __name__ == "__main__":
    main()
