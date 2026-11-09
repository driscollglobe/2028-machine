#!/usr/bin/env python3
"""The nightly desk note. DRAFT, KEVIN REVIEWS: every template sentence below is a first pass.

Writes one 100 to 140 word paragraph from the day's data using fixed templates. No language
model is involved. Inputs are markets.json, default.json, history.csv and calls.csv. Outputs:
  notes/YYYY-MM-DD.md   the paragraph, with a title line
  notes/latest.json     {date, text} for the Desk note box on index.html and the share card
  notes/YYYY-MM-DD.x.txt  a draft post for X, only when X_API_KEY is set. Nothing is ever sent.

Voice rules the templates follow (from the anti-ai-writing house rules):
  * no em or en dashes, no "not X but Y" turns, no groups of three in rhythm
  * no rhetorical questions, no quotable kicker; the last sentence is the next thing to watch
  * numbers, names and dates first; attribute every number to the book or the model
Each slot has several phrasings. The pick is seeded by the date, so consecutive days read
as different sentences even when the numbers barely move.

Usage: python3 scripts/desk_note.py [YYYY-MM-DD]   (date defaults to markets.json)
       python3 scripts/desk_note.py --demo N        print notes for the last N history dates
"""
import csv
import hashlib
import io
import json
import os
import sys
from datetime import date, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIN_WORDS, MAX_WORDS = 100, 140

NAMES = {"newsom": "Gavin Newsom", "aoc": "Alexandria Ocasio-Cortez", "sanders": "Bernie Sanders",
         "ossoff": "Jon Ossoff", "harris": "Kamala Harris", "shapiro": "Josh Shapiro", "pete": "Pete Buttigieg",
         "pritzker": "JB Pritzker", "khanna": "Ro Khanna", "murphy": "Chris Murphy", "kelly": "Mark Kelly",
         "beshear": "Andy Beshear", "rahm": "Rahm Emanuel", "whitmer": "Gretchen Whitmer", "moore": "Wes Moore",
         "warnock": "Raphael Warnock", "talarico": "James Talarico", "elsayed": "Abdul El-Sayed",
         "stewart": "Jon Stewart", "fain": "Shawn Fain", "walz": "Tim Walz", "booker": "Cory Booker", "gallego": "Ruben Gallego", "slotkin": "Elissa Slotkin", "vanhollen": "Chris Van Hollen"}
SHORT = {"aoc": "Ocasio-Cortez", "pete": "Buttigieg", "elsayed": "El-Sayed", "vanhollen": "Van Hollen"}


def full(i):
    return NAMES.get(i, i)


def last(i):
    return SHORT.get(i) or NAMES.get(i, i).split(" ")[-1]


def f1(x):
    return "%.1f" % x


def pts(x):
    x = abs(x)
    return ("%.1f point" % x) + ("" if x == 1 else "s")


def pick(options, key, slot):
    h = int(hashlib.sha256((key + ":" + slot).encode()).hexdigest(), 16)
    return options[h % len(options)]


def read_csv(path, quoted=False):
    if not os.path.exists(path):
        return []
    with open(path, newline="") as f:
        return list(csv.DictReader(f))


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def build(today, M, D, prev, calls, note=""):
    """Return the paragraph for one day. prev is the history row before today, or None.
    note is today's structural note from history.csv, if any."""
    key = today
    ids = [i for i in M["blend"] if i != "other"]
    S = []  # (priority, sentence); lower priority numbers are kept first when trimming
    if note:
        S.append((0, "The model itself changed today (%s), so its moves since yesterday come from that rebuild as much as from the books." % note.strip().rstrip(".")))

    # 1. the largest market move and which book carried it
    mover = None
    if prev:
        moves = [(i, M["blend"][i] - num(prev.get("k_" + i))) for i in ids if num(prev.get("k_" + i)) is not None]
        moves.sort(key=lambda x: -abs(x[1]))
        if moves and abs(moves[0][1]) >= 0.1:
            mover = moves[0]
    if mover:
        i, d = mover
        up = d > 0
        S.append((0, pick([
            "%s had the biggest move in the nomination books since %s, %s %s to %s." % (full(i), prev["date"], "up" if up else "down", pts(d), f1(M["blend"][i])),
            "The largest change on the board belonged to %s, whose blended price %s %s to %s." % (full(i), "rose" if up else "fell", pts(d), f1(M["blend"][i])),
            "Traders %s %s overnight, moving the blended price %s to %s." % ("bought" if up else "sold", full(i), pts(d), f1(M["blend"][i])),
            "%s's price %s by %s overnight and now sits at %s in the blend." % (full(i), "climbed" if up else "slipped", pts(d), f1(M["blend"][i])),
        ], key, "mover")))
        k0, p0 = num(prev.get("kal_" + i)), num(prev.get("poly_" + i))
        k1, p1 = (M.get("kalshi") or {}).get(i), (M.get("polymarket") or {}).get(i)
        if None not in (k0, p0, k1, p1):
            dk, dp = k1 - k0, p1 - p0
            book, other, db, do = ("Kalshi", "Polymarket", dk, dp) if abs(dk) >= abs(dp) else ("Polymarket", "Kalshi", dp, dk)
            if abs(do) < 0.05:
                S.append((1, pick([
                    "All of it came from %s, which moved %s while %s did not move." % (book, pts(db), other),
                    "%s carried the whole move while %s held flat." % (book, other),
                ], key, "book_one")))
            else:
              S.append((1, pick([
                "Most of it came from %s, which moved %s while %s moved %s." % (book, pts(db), other, pts(do)),
                "%s did the work there. It moved %s against %s on %s." % (book, pts(db), pts(do), other),
                "The move ran through %s (%s), with %s following by %s." % (book, ("+" if db > 0 else "-") + f1(abs(db)), other, pts(do)),
              ], key, "book")))
        # what the model did with it
        m0, m1 = num(prev.get("m_" + i)), D["first"].get(i)
        if m0 is not None and m1 is not None:
            dm = m1 - m0
            if abs(dm) < 0.3:
                txt = pick([
                    "The model barely registered it. %s finishes first in %s percent of simulated primaries, against %s yesterday." % (last(i), f1(m1), f1(m0)),
                    "The machine held steady on %s at %s percent of first place finishes." % (last(i), f1(m1)),
                ], key, "model_flat")
            elif (dm > 0) == (mover[1] > 0):
                txt = pick([
                    "The model followed the books and moved %s from %s to %s percent of first place finishes." % (last(i), f1(m0), f1(m1)),
                    "The machine went the same way, taking %s from %s to %s percent of simulated wins." % (last(i), f1(m0), f1(m1)),
                ], key, "model_same")
            else:
                txt = pick([
                    "The model went the other way. %s's share of simulated wins moved from %s to %s percent." % (last(i), f1(m0), f1(m1)),
                    "The machine disagreed with the traders and moved %s from %s to %s percent of first place finishes." % (last(i), f1(m0), f1(m1)),
                ], key, "model_opp")
            S.append((1, txt))
    else:
        S.append((0, pick([
            "The nomination books were quiet overnight. No candidate's blended price moved by a tenth of a point.",
            "Kalshi and Polymarket held still overnight, with no blended price moving a tenth of a point.",
        ], key, "quiet")))

    # 2. who leads where
    mk = max(ids, key=lambda i: M["blend"][i])
    ml = D["frontrunner"]["id"]
    if mk == ml:
        S.append((2, pick([
            "%s leads both the market blend at %s and the model at %s percent." % (full(mk), f1(M["blend"][mk]), f1(D["first"][ml])),
            "The books and the machine agree on the leader. %s is at %s in the blend and wins %s percent of simulated primaries." % (full(mk), f1(M["blend"][mk]), f1(D["first"][ml])),
        ], key, "lead_same")))
    else:
        S.append((2, pick([
            "%s leads the blend at %s, while the model has %s finishing first most often, at %s percent." % (full(mk), f1(M["blend"][mk]), full(ml), f1(D["first"][ml])),
            "The market's leader is %s at %s. The model's is %s, first in %s percent of runs." % (full(mk), f1(M["blend"][mk]), full(ml), f1(D["first"][ml])),
        ], key, "lead_diff")))

    # 3. convention rate
    c = D.get("contested")
    if isinstance(c, (int, float)):
        S.append((2, pick([
            "Of the 20,000 simulated primaries, %s percent end with nobody holding a pledged majority." % f1(c),
            "The contested convention rate stands at %s percent of runs." % f1(c),
            "In %s percent of today's runs the delegate count stops short of a majority." % f1(c),
        ], key, "conv")))

    # 4. calls graded today, or the next deadline
    real = [r for r in calls if r.get("status") != "test"]
    graded = [r for r in real if r.get("resolved_date") == today]
    for r in graded[:2]:
        S.append((1, "The ledger graded a call today: %s It came out %s at %s." % (r["text"].rstrip(".") + ".", "right" if r["status"] == "true" else "wrong", r.get("resolved_value") or "no reading")))
    open_calls = sorted([r for r in real if r.get("status") == "open"], key=lambda r: r["deadline"])

    # 5. levers resolved in the last week
    week = (date.fromisoformat(today) - timedelta(days=7)).isoformat()
    res = [r for r in (D.get("resolved") or []) if week <= r["date"] <= today]
    if res:
        words = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"]
        n = words[len(res)] if len(res) < len(words) else str(len(res))
        S.append((1, "%s midterm lever%s resolved on %s and now run%s as fixed facts in every simulation." % (n, "s" if len(res) != 1 else "", res[0]["date"], "" if len(res) != 1 else "s")))

    # 6. widest gap (optional filler)
    gaps = sorted(((i, D["first"].get(i, 0) - M["blend"][i]) for i in ids), key=lambda x: -abs(x[1]))
    if gaps:
        gi, gv = gaps[0]
        S.append((3, pick([
            "The widest disagreement is on %s, where the model sits %s %s the market." % (full(gi), pts(gv), "above" if gv > 0 else "below"),
            "%s remains the biggest gap between machine and market, %s %s." % (full(gi), pts(gv), "in the model's favor" if gv > 0 else "in the market's favor"),
        ], key, "gap")))

    # 7. run market on the mover (optional filler)
    if mover and isinstance((M.get("run") or {}).get(mover[0]), (int, float)):
        S.append((3, "Kalshi's run market puts %s's chance of entering the race at %d percent." % (last(mover[0]), round(M["run"][mover[0]]))))

    # 8. close on the next thing to watch
    if open_calls:
        r = open_calls[0]
        close = "The next open call on the ledger comes due %s." % r["deadline"]
    elif mover:
        close = pick([
            "Tomorrow's run will show whether the %s move holds." % last(mover[0]),
            "The books reopen overnight, and the %s price is the one to check first." % last(mover[0]),
        ], key, "close")
    else:
        close = "The next reading lands after tomorrow morning's run."

    # fit to 100 to 140 words: keep by priority, keep source order, close always last
    def assemble(keep):
        return " ".join(s for p, s in S if p <= keep) + " " + close

    for keep in (3, 2, 1, 0):
        text = assemble(keep)
        if len(text.split()) <= MAX_WORDS:
            break
    if len(text.split()) < MIN_WORDS:
        text = assemble(3)
    return text.strip()


def load(path):
    with open(os.path.join(ROOT, path)) as f:
        return json.load(f)


def history():
    return read_csv(os.path.join(ROOT, "history.csv"))


def calls():
    return read_csv(os.path.join(ROOT, "calls.csv"))


def write(today, text):
    out = os.path.join(ROOT, "notes")
    os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, today + ".md"), "w") as f:
        f.write("Desk note, " + today + "\n\n" + text + "\n")
    with open(os.path.join(out, "latest.json"), "w") as f:
        json.dump({"date": today, "text": text, "words": len(text.split())}, f, indent=1)
        f.write("\n")
    if os.environ.get("X_API_KEY"):
        # draft only: a file for Kevin to read. No request is ever made to X from here.
        first = text.split(". ")[0].rstrip(".") + "."
        post = (first + " driscollglobe.github.io/2028-machine")[:280]
        with open(os.path.join(out, today + ".x.txt"), "w") as f:
            f.write(post + "\n")


def main():
    args = sys.argv[1:]
    H = history()
    if args and args[0] == "--demo":
        # rebuild notes for the last N history dates from history.csv alone (model shares and blend)
        n = int(args[1]) if len(args) > 1 else 3
        D0 = load("default.json")
        for idx in range(len(H) - n, len(H)):
            row, prev = H[idx], H[idx - 1]
            M = {"blend": {k[2:]: num(v) for k, v in row.items() if k.startswith("k_") and num(v) is not None},
                 "kalshi": {k[4:]: num(v) for k, v in row.items() if k.startswith("kal_") and num(v) is not None},
                 "polymarket": {k[5:]: num(v) for k, v in row.items() if k.startswith("poly_") and num(v) is not None},
                 "run": {k[4:]: num(v) for k, v in row.items() if k.startswith("run_") and num(v) is not None}}
            first = {k[2:]: num(v) for k, v in row.items() if k.startswith("m_") and num(v) is not None}
            fr = max((i for i in first if i != "other"), key=lambda i: first[i])
            D = {"first": first, "frontrunner": {"id": fr, "share": first[fr]}, "contested": D0.get("contested"), "resolved": D0.get("resolved")}
            t = build(row["date"], M, D, prev, calls())
            print("== %s (%d words)\n%s\n" % (row["date"], len(t.split()), t))
        return
    M = load("markets.json")
    D = load("default.json")
    today = args[0] if args else M["date"]
    prior = [r for r in H if r["date"] < today]
    prev = prior[-1] if prior else None
    todays = [r for r in H if r["date"] == today]
    text = build(today, M, D, prev, calls(), (todays[0].get("note") or "") if todays else "")
    write(today, text)
    print("desk_note: %s, %d words" % (today, len(text.split())))
    print(text)


if __name__ == "__main__":
    main()
