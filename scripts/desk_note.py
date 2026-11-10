#!/usr/bin/env python3
"""The nightly desk note: a short morning brief built from fixed templates.

Writes one 100 to 140 word paragraph from the day's data using fixed templates. No language
model is involved. Inputs are markets.json, default.json, history.csv and calls.csv. Outputs:
  notes/YYYY-MM-DD.md   the paragraph, with a title line
  notes/latest.json     {date, text} for the Desk note box on index.html and the share card
  notes/YYYY-MM-DD.x.txt  a draft post for X, only when X_API_KEY is set. Nothing is ever sent.

Voice rules the templates follow (anti-ai-writing house rules, and the publication pass of Nov. 9, 2026):
  * lead with the story: who moved, how far, on which book. Never open with the model's internals
  * never name a parameter (anchor, lane crowding, ballots, levers) and never quote the history.csv note
  * a structural change is never mentioned here; the What moved strip on the page carries that notice, once
  * the run count (50,000) is said once on the page, in the hero, so the note never repeats it
  * editorial dates (Nov. 9), contractions allowed, varied openings
  * no em or en dashes, no "not X but Y" turns, no groups of three in rhythm, no rhetorical questions,
    no quotable kicker; the last sentence is the next thing to watch
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
MAX_WORDS = 140

NAMES = {"newsom": "Gavin Newsom", "aoc": "AOC", "sanders": "Bernie Sanders",
         "ossoff": "Jon Ossoff", "harris": "Kamala Harris", "shapiro": "Josh Shapiro", "pete": "Pete Buttigieg",
         "pritzker": "JB Pritzker", "khanna": "Ro Khanna", "kelly": "Mark Kelly",
         "beshear": "Andy Beshear", "rahm": "Rahm Emanuel", "whitmer": "Gretchen Whitmer", "moore": "Wes Moore",
         "warnock": "Raphael Warnock", "talarico": "James Talarico", "elsayed": "Abdul El-Sayed",
         "stewart": "Jon Stewart", "fain": "Shawn Fain", "walz": "Tim Walz", "booker": "Cory Booker", "gallego": "Ruben Gallego", "slotkin": "Elissa Slotkin", "vanhollen": "Chris Van Hollen"}
SHORT = {"aoc": "AOC", "pete": "Buttigieg", "elsayed": "El-Sayed", "vanhollen": "Van Hollen"}


def full(i):
    return NAMES.get(i, i)


def last(i):
    return SHORT.get(i) or NAMES.get(i, i).split(" ")[-1]


def f0(x):
    """A level (price, share, rate) as a whole number, so the note matches the hero and the cards.
    Moves keep one decimal (pts). Rounds half up: 26.5 -> 27."""
    return "%d" % int(x + 0.5) if x >= 0 else "-%d" % int(-x + 0.5)


def pts(x):
    x = abs(x)
    return ("%.1f point" % x) + ("" if x == 1 else "s")


def pick(options, key, slot, rotate=False):
    if rotate:
        # walk the options in order by calendar day, so back-to-back notes never open the same way
        return options[date.fromisoformat(key).toordinal() % len(options)]
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


AP_MON = ["Jan.", "Feb.", "March", "April", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."]
WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"]


def ed(iso, year=True):
    """Editorial date for readers: 2026-11-09 -> Nov. 9, 2026 (or Nov. 9)."""
    d = date.fromisoformat(iso)
    return "%s %d" % (AP_MON[d.month - 1], d.day) + (", %d" % d.year if year else "")


def since(today, prev_date):
    gap = (date.fromisoformat(today) - date.fromisoformat(prev_date)).days
    if gap == 1:
        return "overnight"
    return "since " + ed(prev_date, year=False)


def build(today, M, D, prev, calls, note="", changes=None):
    """Return (text, link) for one day. prev is the history row before today, or None.
    note is today's structural note from history.csv. It is never quoted or mentioned; on a structural
    day the note simply skips the model-movement sentence. link is always None now (kept for callers)."""
    key = today
    ids = [i for i in M["blend"] if i != "other"]
    S = []  # (priority, sentence); lower numbers survive trimming
    when = since(today, prev["date"]) if prev else "overnight"
    structural = bool(note and note.strip())

    # 1. the lead: who moved, how far, and on which book
    mover = None
    if prev:
        moves = [(i, M["blend"][i] - num(prev.get("k_" + i))) for i in ids if num(prev.get("k_" + i)) is not None]
        moves.sort(key=lambda x: -abs(x[1]))
        if moves and abs(moves[0][1]) >= 0.1:
            mover = moves[0]
    if mover:
        i, d = mover
        up = d > 0
        p = f0(M["blend"][i])
        S.append((0, pick([
            "%s had the biggest move in the nomination markets %s, %s %s to %s." % (full(i), when, "up" if up else "down", pts(d), p),
            "Traders %s %s %s, pushing the blended price %s %s to %s." % ("bought" if up else "sold", full(i), when, "up" if up else "down", pts(d), p),
            "Nobody moved more %s than %s, who %s %s and now trades at %s." % (when, full(i), "gained" if up else "lost", pts(d), p),
            "%s, %s's price %s %s to %s, the largest change on the board." % (when[0].upper() + when[1:], full(i), "climbed" if up else "slid", pts(d), p),
        ], key, "lead", rotate=True)))
        k0, p0 = num(prev.get("kal_" + i)), num(prev.get("poly_" + i))
        k1, p1 = (M.get("kalshi") or {}).get(i), (M.get("polymarket") or {}).get(i)
        if None not in (k0, p0, k1, p1):
            dk, dp = k1 - k0, p1 - p0
            book, other, db, do = ("Kalshi", "Polymarket", dk, dp) if abs(dk) >= abs(dp) else ("Polymarket", "Kalshi", dp, dk)
            if abs(do) < 0.05:
                S.append((1, pick([
                    "All of it happened on %s; %s didn't budge." % (book, other),
                    "The move was all %s, with %s holding flat." % (book, other),
                ], key, "book_one")))
            elif (db > 0) == (do > 0):
                S.append((1, pick([
                    "Most of that came on %s, which moved %s, while %s went the same way by %s." % (book, pts(db), other, pts(do)),
                    "Both books agreed on the direction, with %s moving %s and %s %s." % (book, pts(db), other, pts(do)),
                ], key, "book_same")))
            else:
                S.append((1, "The two books split on it: %s moved %s one way and %s %s the other." % (book, pts(db), other, pts(do))))

    # 2. a run-odds story the price board would miss: a big swing in the odds of entering at all
    if prev:
        runs = [(i, M["run"][i] - num(prev.get("run_" + i))) for i in ids
                if isinstance((M.get("run") or {}).get(i), (int, float)) and num(prev.get("run_" + i)) is not None]
        runs.sort(key=lambda x: -abs(x[1]))
        if runs and abs(runs[0][1]) >= 4:
            ri, rd = runs[0]
            flat = prev and num(prev.get("k_" + ri)) is not None and abs(M["blend"][ri] - num(prev.get("k_" + ri))) < 0.5
            tail = (" even though %s's nomination price barely moved" % last(ri)) if flat else ""
            S.append((1, pick([
                "Kalshi's market on whether %s runs at all %s %d points, to %d percent,%s." % (last(ri), "jumped" if rd > 0 else "dropped", round(abs(rd)), round(M["run"][ri]), tail),
                "The odds that %s enters the race %s %d points on Kalshi, to %d percent,%s." % (full(ri), "rose" if rd > 0 else "fell", round(abs(rd)), round(M["run"][ri]), tail),
            ], key, "run").replace(",.", ".")))

    if not mover and not any(p == 1 for p, _ in S):
        S.append((0, pick([
            "A quiet night. No candidate's nomination price moved a tenth of a point on Kalshi or Polymarket.",
            "The books barely ticked %s; no blended price moved by a tenth of a point." % when,
        ], key, "quiet")))

    # 3. what the simulations did with it (skipped when the model itself changed; see the last sentence)
    if mover and not structural:
        i = mover[0]
        m0, m1 = num(prev.get("m_" + i)), D["first"].get(i)
        if m0 is not None and m1 is not None:
            dm = m1 - m0
            if abs(dm) < 0.5:
                txt = pick([
                    "Our simulations hardly noticed; %s still wins %s percent of them." % (last(i), f0(m1)),
                    "It didn't change much in the model, where %s finishes first in %s percent of runs." % (last(i), f0(m1)),
                ], key, "model_flat")
            elif (dm > 0) == (mover[1] > 0):
                txt = pick([
                    "The model went along, and %s now wins %s percent of simulated primaries, against %s the day before." % (last(i), f0(m1), f0(m0)),
                    "In the simulations %s went from %s to %s percent of first-place finishes." % (last(i), f0(m0), f0(m1)),
                ], key, "model_same")
            else:
                txt = pick([
                    "The model moved the other way, taking %s from %s to %s percent of simulated wins." % (last(i), f0(m0), f0(m1)),
                    "Our simulations disagreed with the traders: %s went from %s to %s percent of first-place finishes." % (last(i), f0(m0), f0(m1)),
                ], key, "model_opp")
            S.append((1, txt))

    # 4. who leads where. When first and second are within 2 points (default.json two_way, the same rule the
    # hero and the share card use), the note names both with their ranges and calls nobody the leader.
    mk = max(ids, key=lambda i: M["blend"][i])
    ml = D["frontrunner"]["id"]
    rng = D.get("range") or {}
    order = [i for i in sorted(D["first"], key=lambda i: -D["first"][i]) if i != "other"]
    two = D.get("two_way")
    if two is None and "two_way" not in D and len(order) > 1:
        two = order[:2] if D["first"][order[0]] - D["first"][order[1]] < 2 else None
    m2 = two[1] if two else (order[1] if len(order) > 1 else None)
    if two:
        ml = two[0]
    r1, r2 = rng.get(ml), rng.get(m2) if m2 else None
    overlap = bool(two)

    def rr(r):
        return ("likely %d to %d" % (round(r[0]), round(r[1]))) if r else ""

    def share(i, r):
        return "%s percent%s" % (f0(D["first"][i]), (" (" + rr(r) + ")") if r else "")

    if overlap:
        S.append((2, pick([
            "The model calls it a two-way race: %s wins %s of simulated primaries and %s %s. %s leads the markets at %s." % (full(ml), share(ml, r1), full(m2), share(m2, r2), last(mk), f0(M["blend"][mk])),
            "In our simulations it's a two-way race, too close to name a leader: %s at %s and %s at %s. The betting favorite is %s at %s." % (full(ml), share(ml, r1), full(m2), share(m2, r2), last(mk), f0(M["blend"][mk])),
        ], key, "two_way")))
    elif mk == ml:
        S.append((2, pick([
            "%s leads both the markets, at %s, and the model, winning %s percent of simulated primaries." % (full(mk), f0(M["blend"][mk]), f0(D["first"][ml])),
            "Markets and model agree on the leader: %s, at %s in the blend and first in %s percent of our runs." % (full(mk), f0(M["blend"][mk]), f0(D["first"][ml])),
        ], key, "lead_same")))
    else:
        S.append((2, pick([
            "%s leads the markets at %s, but the model likes %s, who wins %s percent of simulated primaries." % (full(mk), f0(M["blend"][mk]), full(ml), f0(D["first"][ml])),
            "The markets have %s on top at %s. In our simulations it's %s, first in %s percent of runs." % (full(mk), f0(M["blend"][mk]), full(ml), f0(D["first"][ml])),
            "%s wins the most simulated primaries, %s percent, though the betting favorite is %s at %s." % (full(ml), f0(D["first"][ml]), full(mk), f0(M["blend"][mk])),
        ], key, "lead_diff")))

    # 5. the convention
    c = D.get("contested")
    if isinstance(c, (int, float)):
        S.append((3, pick([
            "In %s percent of those runs nobody reaches the convention with a pledged majority." % f0(c),
            "About %d in 100 simulated primaries end without a pledged majority, which sends the fight to the convention floor." % round(c),
        ], key, "conv")))

    # 6. calls graded today
    real = [r for r in calls if r.get("status") != "test"]
    for r in [r for r in real if r.get("resolved_date") == today][:2]:
        S.append((1, "One of our calls came due today. %s It was %s." % (r["text"].rstrip(".") + ".", "right" if r["status"] == "true" else "wrong")))

    # 7. races settled in the past week
    week = (date.fromisoformat(today) - timedelta(days=7)).isoformat()
    res = [r for r in (D.get("resolved") or []) if week <= r["date"] <= today]
    if res and not structural:
        n = WORDS[len(res)].lower() if len(res) < len(WORDS) else str(len(res))
        S.append((3, "The %s midterm results from %s now count as settled in every run." % (n, ed(res[0]["date"], year=False))))

    # 8. close on the next thing to watch
    if mover:
        close = pick([
            "Tonight's prices will show whether the %s move holds." % last(mover[0]),
            "Watch the %s price first when the books update tonight." % last(mover[0]),
        ], key, "close")
    else:
        open_calls = sorted([r for r in real if r.get("status") == "open"], key=lambda r: r["deadline"])
        close = ("The next call on our ledger comes due %s." % ed(open_calls[0]["deadline"])) if open_calls else "The next update lands tomorrow morning."

    link = None
    tail = ""

    def assemble(keep):
        return " ".join(s for p, s in S if p <= keep) + " " + close + tail

    for keep in (3, 2, 1, 0):
        text = assemble(keep)
        if len(text.split()) <= MAX_WORDS:
            break
    return text.strip(), link


def load(path):
    with open(os.path.join(ROOT, path)) as f:
        return json.load(f)


def history():
    return read_csv(os.path.join(ROOT, "history.csv"))


def calls():
    return read_csv(os.path.join(ROOT, "calls.csv"))


def changes():
    path = os.path.join(ROOT, "notes", "changes.json")
    return json.load(open(path)) if os.path.exists(path) else {}


def write(today, text, link=None):
    out = os.path.join(ROOT, "notes")
    os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, today + ".md"), "w") as f:
        f.write("Desk note, " + ed(today) + "\n\n" + text + "\n")
    with open(os.path.join(out, "latest.json"), "w") as f:
        out_obj = {"date": today, "text": text, "words": len(text.split())}
        if link:
            out_obj["link"] = link
        json.dump(out_obj, f, indent=1)
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
        # rebuild notes from history.csv alone (model shares, blend, books, run odds). Pass dates, or a count
        # for the last N days. The convention rate and settled races come from today's default.json.
        D0 = load("default.json")
        dates = [a for a in args[1:] if "-" in a]
        if dates:
            idxs = [i for i, r in enumerate(H) if r["date"] in dates]
        else:
            n = int(args[1]) if len(args) > 1 else 3
            idxs = list(range(len(H) - n, len(H)))
        for idx in idxs:
            row, prev = H[idx], H[idx - 1]
            M = {"blend": {k[2:]: num(v) for k, v in row.items() if k.startswith("k_") and num(v) is not None},
                 "kalshi": {k[4:]: num(v) for k, v in row.items() if k.startswith("kal_") and num(v) is not None},
                 "polymarket": {k[5:]: num(v) for k, v in row.items() if k.startswith("poly_") and num(v) is not None},
                 "run": {k[4:]: num(v) for k, v in row.items() if k.startswith("run_") and num(v) is not None}}
            first = {k[2:]: num(v) for k, v in row.items() if k.startswith("m_") and num(v) is not None}
            fr = max((i for i in first if i != "other"), key=lambda i: first[i])
            D = {"first": first, "frontrunner": {"id": fr, "share": first[fr]}, "contested": D0.get("contested"), "resolved": D0.get("resolved")}
            t, link = build(row["date"], M, D, prev, calls(), row.get("note") or "", changes())
            print("== %s (%d words)\n%s%s\n" % (ed(row["date"]), len(t.split()), t, (" [" + link["text"] + "](" + link["href"] + ")") if link else ""))
        return
    M = load("markets.json")
    D = load("default.json")
    today = args[0] if args else M["date"]
    prior = [r for r in H if r["date"] < today]
    prev = prior[-1] if prior else None
    todays = [r for r in H if r["date"] == today]
    text, link = build(today, M, D, prev, calls(), (todays[0].get("note") or "") if todays else "", changes())
    write(today, text, link)
    print("desk_note: %s, %d words" % (today, len(text.split())))
    print(text)


if __name__ == "__main__":
    main()
