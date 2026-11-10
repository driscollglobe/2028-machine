#!/usr/bin/env python3
"""Nightly name ID: Economist/YouGov favorability for every candidate in the field.

For each candidate, finds the newest Economist/YouGov wave that asked about them and records:
  heard_of     100 minus "Don't know" among all adults (the Total column)
  net_fav_dem  (very + somewhat favorable) minus (somewhat + very unfavorable) among Democrats
               (the Dem column of the Party ID table)
Waves are found through YouGov's own document sitemap, which lists every crosstab PDF (econTabReport)
with the date it was posted. The script walks back from the newest wave, up to MAX_WAVES, until every
candidate is found or the waves run out. A candidate no wave has asked about gets a blank row, and the
model falls back to an estimate from the attention score (index.html NAMEID).

Writes nameid.csv: id, candidate, date (last field day of the wave), source (the PDF URL), heard_of,
net_fav_dem. If no wave can be read at all, the last good nameid.csv is kept and the script exits 0.

Needs pdftotext (poppler-utils). Standard library otherwise.

Usage: python3 scripts/fetch_nameid.py
       python3 scripts/fetch_nameid.py --backtest   writes backtest-2020/data/nameid_2019-12.csv from the
                                                    Dec. 1 to 3, 2019 wave for the 2020 field
"""
import csv
import os
import re
import subprocess
import sys
import tempfile
import urllib.request
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "nameid.csv")
SITEMAP = "https://yougov.com/en-us/sitemap-documents.xml"
MAX_WAVES = 40  # about nine months of weekly waves
UA = {"User-Agent": "Mozilla/5.0 (compatible; 2028-machine nightly/1.0)"}

# id -> names YouGov might print. Matching is on letters only, case-insensitive.
FIELD = {
    "newsom": ["Gavin Newsom"], "aoc": ["Alexandria Ocasio-Cortez", "AOC"], "sanders": ["Bernie Sanders"],
    "ossoff": ["Jon Ossoff"], "harris": ["Kamala Harris"], "shapiro": ["Josh Shapiro"],
    "pete": ["Pete Buttigieg"], "pritzker": ["JB Pritzker", "J.B. Pritzker"], "khanna": ["Ro Khanna"],
    "kelly": ["Mark Kelly"], "beshear": ["Andy Beshear"],
    "rahm": ["Rahm Emanuel"], "whitmer": ["Gretchen Whitmer"], "moore": ["Wes Moore"],
    "warnock": ["Raphael Warnock"], "talarico": ["James Talarico"], "elsayed": ["Abdul El-Sayed"],
    "stewart": ["Jon Stewart"], "fain": ["Shawn Fain"], "walz": ["Tim Walz"], "booker": ["Cory Booker"],
    "gallego": ["Ruben Gallego", "Rubén Gallego"], "slotkin": ["Elissa Slotkin"], "vanhollen": ["Chris Van Hollen"],
}
FIELD_2020 = {
    "biden": ["Joe Biden"], "sanders": ["Bernie Sanders"], "warren": ["Elizabeth Warren"],
    "buttigieg": ["Pete Buttigieg"], "bloomberg": ["Mike Bloomberg", "Michael Bloomberg"],
    "klobuchar": ["Amy Klobuchar"], "yang": ["Andrew Yang"], "booker": ["Cory Booker"],
    "castro": ["Julian Castro", "Julián Castro"], "steyer": ["Tom Steyer"], "gabbard": ["Tulsi Gabbard"],
}
DEC_2019 = "https://d3nkl3psvxxpe9.cloudfront.net/documents/econTabReport_YZPZ8kJ.pdf"
MONTHS = {m: i + 1 for i, m in enumerate(["January", "February", "March", "April", "May", "June", "July",
                                           "August", "September", "October", "November", "December"])}


def norm(s):
    return re.sub(r"[^a-z]", "", s.lower().replace("é", "e").replace("á", "a"))


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def waves():
    """Crosstab PDFs from YouGov's document sitemap, newest first."""
    xml = get(SITEMAP).decode("utf-8", "replace")
    rows = []
    for e in re.findall(r"<url>(.*?)</url>", xml, re.S):
        loc = re.search(r"<loc>([^<]*)", e)
        lm = re.search(r"<lastmod>([^<]*)", e)
        if loc and re.search(r"econTabReport", loc.group(1), re.I):
            rows.append(((lm.group(1) if lm else ""), loc.group(1).strip()))
    rows.sort(reverse=True)
    return [u for _, u in rows]


def pdf_text(raw):
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "t.pdf")
        open(p, "wb").write(raw)
        return subprocess.run(["pdftotext", "-layout", p, "-"], capture_output=True, text=True, check=True).stdout


def field_end(text):
    """'December 1 - 3, 2019' or 'November 29 - December 2, 2026' -> ISO date of the last field day."""
    m = re.search(r"(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s*[-–—]\s*(?:(January|February|March|April|May|June|July|August|September|October|November|December)\s+)?(\d{1,2}),\s*(\d{4})", text)
    if not m:
        return ""
    mon = m.group(3) or m.group(1)
    return date(int(m.group(5)), MONTHS[mon], int(m.group(4))).isoformat()


def nums(line):
    return [int(x) for x in re.findall(r"(\d+)%", line)]


def parse(text):
    """{normalized name: (heard_of, net_fav_dem)} for every favorability block in a crosstab report."""
    out = {}
    lines = text.split("\n")
    heads = [i for i, l in enumerate(lines) if re.match(r"^\s*\d+[A-Z]*\.\s+Favorability of .*?\s[—–-]\s+(.+?)\s*$", l) and ". . ." not in l]
    for k, i in enumerate(heads):
        name = re.match(r"^\s*\d+[A-Z]*\.\s+Favorability of .*?\s[—–-]\s+(.+?)\s*$", lines[i]).group(1)
        end = heads[k + 1] if k + 1 < len(heads) else len(lines)
        block = lines[i:end]
        dk = next((nums(l) for l in block if re.match(r"^\s*Don.t know", l)), None)
        pid = next((j for j, l in enumerate(block) if "Party ID" in l), None)
        if not dk or pid is None:
            continue
        # the column labels under the Party ID header: the Dem column's position differs by year
        lab = next((re.split(r"\s{2,}", l.strip()) for l in block[pid + 1:pid + 4] if re.search(r"\bTotal\b", l) and re.search(r"\bDem\b", l)), None)
        if not lab or "Dem" not in lab:
            continue
        col = lab.index("Dem")
        rows = {}
        for l in block[pid:pid + 16]:
            m = re.match(r"^\s*(Very favorable|Somewhat favorable|Somewhat unfavorable|Very unfavorable)\s", l)
            if m and m.group(1) not in rows and len(nums(l)) == len(lab):
                rows[m.group(1)] = nums(l)[col]
        if len(rows) < 4:
            continue
        net = rows["Very favorable"] + rows["Somewhat favorable"] - rows["Somewhat unfavorable"] - rows["Very unfavorable"]
        out[norm(name)] = (100 - dk[0], net)
    return out


def collect(field, urls, stop_when_full=True):
    found = {}
    for n, url in enumerate(urls):
        try:
            text = pdf_text(get(url))
        except Exception as e:
            print("::warning::fetch_nameid: %s unreadable: %r" % (url, e))
            continue
        got = parse(text)
        day = field_end(text)
        for cid, names in field.items():
            if cid in found:
                continue
            for nm_ in names:
                if norm(nm_) in got:
                    h, f = got[norm(nm_)]
                    found[cid] = {"id": cid, "candidate": names[0], "date": day, "source": url, "heard_of": h, "net_fav_dem": f}
                    break
        print("fetch_nameid: wave %d %s (%s): %d candidates so far" % (n + 1, day, url.rsplit("/", 1)[-1], len(found)))
        if stop_when_full and len(found) == len(field):
            break
    return found


def write(path, field, found):
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["id", "candidate", "date", "source", "heard_of", "net_fav_dem"], lineterminator="\n")
        w.writeheader()
        for cid, names in field.items():
            w.writerow(found.get(cid) or {"id": cid, "candidate": names[0], "date": "", "source": "", "heard_of": "", "net_fav_dem": ""})


def main():
    if "--backtest" in sys.argv:
        found = collect(FIELD_2020, [DEC_2019])
        write(os.path.join(ROOT, "backtest-2020", "data", "nameid_2019-12.csv"), FIELD_2020, found)
        print("fetch_nameid: wrote backtest-2020/data/nameid_2019-12.csv (%d of %d)" % (len(found), len(FIELD_2020)))
        return
    try:
        urls = waves()[:MAX_WAVES]
    except Exception as e:
        print("::warning::fetch_nameid: sitemap unreadable, keeping the last nameid.csv: %r" % (e,))
        return
    found = collect(FIELD, urls)
    if not found:
        print("::warning::fetch_nameid: no wave read, keeping the last nameid.csv")
        return
    write(OUT, FIELD, found)
    missing = [c for c in FIELD if c not in found]
    print("fetch_nameid: wrote nameid.csv, %d of %d found; no YouGov entry for %s" % (len(found), len(FIELD), ", ".join(missing) or "nobody"))


if __name__ == "__main__":
    main()
