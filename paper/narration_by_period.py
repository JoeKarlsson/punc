"""Median words between stops (. ? ! ; :) by 50-year period, all text against narration alone (double-quoted
text removed), on the deduplicated books that still have a local text. Unweighted, as in the blog's narration chart.

Usage: python3 paper/narration_by_period.py analysis/books.csv texts/
"""
import gzip
import os
import statistics
import sys

from fulltext_checks import measure
from reanalysis import dedupe, load_books, period
from textmeasures import fold


def between_stops(c):
    return c["words"] / (c["stops"] + c["semi"] + c["colon"])


def main(books_path, texts_dir):
    deduped, _ = dedupe(load_books(books_path))
    rows = []
    for b in deduped:
        path = os.path.join(texts_dir, b["slug"] + ".txt.gz")
        if os.path.exists(path):
            m = measure(fold(gzip.open(path, "rt", encoding="utf-8").read()))
            # Check: the local text gives books.csv's words between stops for this book.
            assert abs(between_stops(m["all"]) - b["words"] / (b["stops"] + b["semis"] + b["colons"])) < 0.05, b["slug"]  # books.csv stores rounded rates
            rows.append((period(b["year"]), between_stops(m["all"]), between_stops(m["narr"])))
    print(f"Deduplicated books with a local text: {len(rows)} of {len(deduped)}")
    print("period | books | all text, words between stops | narration only, words between stops")
    for p in range(1600, 2000, 50):
        g = [r for r in rows if r[0] == p]
        print(f"{p}-{p + 49 if p < 1950 else 1974} | {len(g)} | {statistics.median(r[1] for r in g):.1f} | {statistics.median(r[2] for r in g):.1f}")


if __name__ == "__main__":
    main(*sys.argv[1:3])
