#!/usr/bin/env python3
"""Pull national 2028 Democratic primary polls from Wikipedia into polls.csv.

Source: the tables on "Nationwide opinion polling for the 2028 Democratic Party
presidential primaries", read with pandas.read_html. Candidates folded into the
"Other" column live in efn footnotes; their text sits in each footnote's data-mw
attribute, so the HTML is rewritten to inline that text before parsing.

polls.csv keeps the shape the page reads:
  pollster,sponsor,field_start,field_end,sample,population,geography,<ids...>,other

Safety rule: if the fetch or parse fails, or the result has fewer than three
national polls ending in the last 30 days, the last good polls.csv is kept and a
GitHub Actions warning is written to the log. The script exits 0 in that case so
the rest of the nightly job still runs.

Needs pandas and lxml (installed by the workflow).
"""
import csv
import html
import io
import json
import os
import re
import sys
import urllib.request
from datetime import date, datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_markets import IDS, NAME_TO_ID, map_name, today_str  # noqa: E402

URL = "https://en.wikipedia.org/wiki/Nationwide_opinion_polling_for_the_2028_Democratic_Party_presidential_primaries"
OUT = "polls.csv"
WINDOW_DAYS = 30
MIN_POLLS = 3
HEAD = ["pollster", "sponsor", "field_start", "field_end", "sample", "population", "geography"] + IDS

POP = {"LV": "likely voters", "RV": "registered voters", "A": "adults", "V": "voters"}
MONTHS = {m: i for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul",
                                      "aug", "sep", "oct", "nov", "dec"], 1)}  # keyed by the first three letters
# Names the books do not list but the polls do. Extra aliases for the poll tables only.
EXTRA_NAMES = {"alexandria ocasio-cortez": "aoc", "aoc": "aoc", "jb pritzker": "pritzker", "pete buttigieg": "pete"}


def warn(msg):
    print("::warning::fetch_polls: " + msg)


def poll_id(name):
    key = re.sub(r"\s+", " ", (name or "").strip().lower())
    return EXTRA_NAMES.get(key) or map_name(key)


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "2028-machine nightly/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8")


def inline_footnotes(page):
    """Replace each efn <sup> with its text in braces so it survives read_html."""
    def sub(m):
        data = html.unescape(m.group(1))
        try:
            mw = json.loads(data)
            text = mw["parts"][0]["template"]["params"]["1"]["wt"]
        except Exception:
            return ""
        text = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]*)\]\]", r"\1", text)
        return " {{" + html.escape(text) + "}}"
    return re.sub(r"<sup[^>]*?data-mw='([^']*efn[^']*)'[^>]*>.*?</sup>", sub, page, flags=re.S)


def pct(cell):
    s = str(cell)
    s = re.sub(r"\{\{.*?\}\}", "", s)
    s = re.sub(r"\[[a-z0-9]+\]", "", s)
    m = re.search(r"(\d+(?:\.\d+)?)\s*%", s)
    return float(m.group(1)) if m else None


def footnote_pairs(cell):
    """'Shawn Fain 1%, Ro Khanna with 1%, Other 6%' -> [('shawn fain', 1.0), ...]"""
    out = []
    for blob in re.findall(r"\{\{(.*?)\}\}", str(cell)):
        for part in re.split(r",|;| and ", html.unescape(blob)):
            m = re.match(r"\s*(.+?)\s+(?:with\s+|at\s+)?(\d+(?:\.\d+)?)\s*%", part.strip())
            if m:
                out.append((m.group(1), float(m.group(2))))
    return out


def parse_dates(s):
    """'October 30 – November 5, 2026', 'October 24–26, 2026', 'November 3, 2026' -> (start, end) ISO."""
    s = re.sub(r"\[[a-z0-9]+\]", "", str(s)).replace("–", "-").replace("—", "-").strip()
    s = s.replace(".", "")
    m = re.match(r"([A-Za-z]+)\s+(\d+)(?:,\s*(\d{4}))?\s*-\s*(?:([A-Za-z]+)\s+)?(\d+),\s*(\d{4})$", s)
    if m:
        m1, d1, y1, m2, d2, y2 = m.groups()
        y2 = int(y2)
        y1 = int(y1) if y1 else y2
        mo1 = MONTHS.get(m1.lower()[:3])
        mo2 = MONTHS.get((m2 or m1).lower()[:3])
        if not mo1 or not mo2:
            return None
        return date(y1, mo1, int(d1)), date(y2, mo2, int(d2))
    m = re.match(r"([A-Za-z]+)\s+(\d+),\s*(\d{4})$", s)
    if m:
        mo = MONTHS.get(m.group(1).lower()[:3])
        if not mo:
            return None
        d = date(int(m.group(3)), mo, int(m.group(2)))
        return d, d
    return None


def parse_sample(s):
    s = re.sub(r"\[[a-z0-9]+\]", "", str(s))
    n = re.search(r"([\d,]+)", s)
    p = re.search(r"\((LV|RV|A|V)\)", s)
    return (n.group(1).replace(",", "") if n else ""), (POP[p.group(1)] if p else "")


def scrape():
    import pandas as pd
    page = inline_footnotes(get(URL))
    tables = pd.read_html(io.StringIO(page))
    rows = []
    for t in tables:
        cols = [str(c) for c in t.columns]
        if not cols or not cols[0].startswith("Poll source"):
            continue
        date_col = next((c for c in cols if c.startswith("Date")), None)
        samp_col = next((c for c in cols if c.startswith("Sample")), None)
        for _, r in t.iterrows():
            src = r[cols[0]]
            if not isinstance(src, str) or not src.strip():
                continue
            dates = parse_dates(r[date_col]) if date_col else None
            if not dates:
                continue
            n, pop = parse_sample(r[samp_col]) if samp_col else ("", "")
            row = {k: "" for k in HEAD}
            pollster = re.sub(r"\[[a-z0-9]+\]", "", src).strip()
            sponsor = ""
            m = re.match(r"(.+?)\s*/\s*(.+)$", pollster)
            if m:
                pollster, sponsor = m.group(1).strip(), m.group(2).strip()
            row.update(pollster=pollster, sponsor=sponsor, field_start=dates[0].isoformat(),
                       field_end=dates[1].isoformat(), sample=n, population=pop, geography="national")
            other = 0.0
            for c in cols[3:]:
                v = pct(r[c])
                if c.startswith("Other"):
                    named = footnote_pairs(r[c])
                    rest = v or 0.0
                    for nm, x in named:
                        cid = poll_id(nm)
                        if cid and cid != "other" and row.get(cid, "") == "":
                            row[cid] = x
                            rest -= x
                    other += max(0.0, rest)
                    continue
                if c.startswith("Undecided") or v is None:
                    continue
                cid = poll_id(c)
                if cid and cid != "other":
                    row[cid] = v
                else:
                    other += v
            row["other"] = round(other, 1) if other else ""
            if any(row[i] != "" for i in IDS if i != "other"):
                rows.append(row)
    rows.sort(key=lambda r: (r["field_end"], r["pollster"]), reverse=True)
    return rows


def in_window(rows, today):
    cutoff = today - timedelta(days=WINDOW_DAYS)
    return [r for r in rows if cutoff.isoformat() <= r["field_end"] <= today.isoformat()]


def fmt(v):
    if v == "" or v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v)


def main():
    today = datetime.strptime(today_str(), "%Y-%m-%d").date()
    try:
        rows = scrape()
    except Exception as e:  # keep the last good file on any scrape failure
        warn("scrape failed, keeping the last good polls.csv: %r" % (e,))
        return
    recent = in_window(rows, today)
    if len(recent) < MIN_POLLS:
        warn("only %d national polls in the last %d days, keeping the last good polls.csv" % (len(recent), WINDOW_DAYS))
        return
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(HEAD)
    for r in rows:
        # the page splits on commas, so strip them from free text
        w.writerow([fmt(r[k]).replace(",", "") for k in HEAD])
    with open(OUT, "w") as f:
        f.write(buf.getvalue())
    print("fetch_polls: wrote %d polls (%d in the last %d days) from %s" % (len(rows), len(recent), WINDOW_DAYS, URL))


if __name__ == "__main__":
    main()
