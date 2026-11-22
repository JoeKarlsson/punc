"""Corpus description by 50-year period, for the paper's Data section.

Usage: python3 corpus_table.py ../analysis/books.csv
"""
import csv
import statistics
import sys

PERIODS = [(1600, 1649), (1650, 1699), (1700, 1749), (1750, 1799), (1800, 1849), (1850, 1899), (1900, 1949), (1950, 1974)]
# Book counts in the main sentence-length table (analysis/RESULTS.md); the table must reproduce them.
EXPECTED_BOOKS = [21, 13, 18, 48, 96, 288, 445, 25]


def has_genre(book, *names):
    tags = book["genres"].lower()
    return any(name in tags for name in names)


def main(path):
    books = [b for b in csv.DictReader(open(path)) if b["year"]]
    print("| Period | Books | Translated | Plays | Poetry | Novels | Median words | Median download rank |")
    print("|---|---:|---:|---:|---:|---:|---:|---:|")
    for (start, end), expected in zip(PERIODS, EXPECTED_BOOKS):
        group = [b for b in books if start <= int(b["year"]) <= end]
        assert len(group) == expected, f"{start}-{end}: {len(group)} books, main table has {expected}"
        def share(test):
            return f"{sum(map(test, group)) / len(group):.0%}"
        print(f"| {start}-{end} | {len(group)} | {share(lambda b: b['translated'] == '1')} "
              f"| {share(lambda b: has_genre(b, 'plays', 'drama'))} | {share(lambda b: has_genre(b, 'poetry'))} "
              f"| {share(lambda b: has_genre(b, 'novel'))} | {statistics.median(int(b['words']) for b in group):,.0f} "
              f"| {statistics.median(int(b['download_rank']) for b in group):,.0f} |")
    print(f"\nDated books: {len(books)} of {sum(1 for _ in csv.DictReader(open(path)))}")


if __name__ == "__main__":
    main(sys.argv[1])
