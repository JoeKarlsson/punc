"""Weighted share with era-specific glue rates: the 1700s English-original rates for 1700-1749 books, the 1900s sample's rates for 1900-1949.

Usage: python3 era_rates.py ../analysis/books.csv ../analysis/sample-coded.md ../analysis/second-coder-codes.json ../analysis/sample-1900s.txt
The 1900s sample has only the second (blind) coder.
"""
import json
import random
import re
import statistics
import sys

import reanalysis as ra


def between_era(b, early, late):
    ws, wc = early if ra.period(b["year"]) < 1850 else late
    return ra.between(b, ws, wc)


def share_era(books, early, late, start=1700):
    a = [b for b in books if ra.period(b["year"]) == start]
    z = [b for b in books if ra.period(b["year"]) == 1900]
    drop_p = statistics.median(b["words"] / b["stops"] for b in a) - statistics.median(b["words"] / b["stops"] for b in z)
    drop_s = statistics.median(between_era(b, early, late) for b in a) - statistics.median(between_era(b, early, late) for b in z)
    return 1 - drop_s / drop_p


def main(books_path, sample_path, second_path, late_path):
    books, _ = ra.dedupe(ra.load_books(books_path))
    early_marks = [(c["mark"], c["first"]) for c in ra.coded_marks(books_path, sample_path, second_path) if not c["translated"]]
    marks_b = re.findall(r"^\s*(\d+) ([;:]) ", open(late_path).read(), re.M)
    codes_b = json.load(open(second_path))["set_b"]
    late_marks = [(m, codes_b[n] == "GLUE") for n, m in marks_b]
    assert len(late_marks) == 100, len(late_marks)
    early, late = ra.glue_rates(early_marks), ra.glue_rates(late_marks)
    assert (round(early[0], 2), round(early[1], 2)) == (0.72, 0.59), early
    assert ra.period(1700) == 1700 and ra.period(1925) == 1900
    print(f"Glue rates: 1700s {early[0]:.2f} / {early[1]:.2f}; 1900s {late[0]:.2f} / {late[1]:.2f}")
    assert round(share_era(books, early, early), 2) == 0.40  # pooled rates reproduce the main share
    rng = random.Random(7)
    a = [b for b in books if ra.period(b["year"]) == 1700]
    z = [b for b in books if ra.period(b["year"]) == 1900]
    split = lambda ms: ([m for m in ms if m[0] == ";"], [m for m in ms if m[0] == ":"])
    (es, ec), (ls, lc) = split(early_marks), split(late_marks)
    draws = []
    for _ in range(2000):
        sample = rng.choices(a, k=len(a)) + rng.choices(z, k=len(z))
        e = ra.glue_rates(rng.choices(es, k=len(es)) + rng.choices(ec, k=len(ec)))
        l = ra.glue_rates(rng.choices(ls, k=len(ls)) + rng.choices(lc, k=len(lc)))
        draws.append(share_era(sample, e, l))
    draws.sort()
    print(f"Main share, era-specific rates, duplicates removed: {share_era(books, early, late):.0%} "
          f"({draws[50]:.0%}-{draws[1949]:.0%}); books and both samples' marks resampled")


if __name__ == "__main__":
    main(*sys.argv[1:5])
