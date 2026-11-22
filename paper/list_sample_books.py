"""Which books the coded 1700s marks come from, with author, year and translation flag.

Usage: python3 list_sample_books.py ../analysis/sample-coded.md ../analysis/books.csv
"""
import collections
import csv
import re
import sys


def sample_items(path):
    """(item number, mark, first coder's code, book slug prefix) for each coded mark."""
    text = open(path).read()
    return [(int(n), mark, code, prefix.rstrip("-"))
            for n, mark, code, prefix in re.findall(r"^(\d+)\. `(.)` \*\*(GLUE|NOT)\b[^*]*\*\* - _([^_]+)_", text, re.M)]


def book_for(prefix, books):
    if prefix in books:
        return books[prefix]
    matches = [b for slug, b in books.items() if slug.startswith(prefix)]
    # The sample keeps only the first 28 characters of a slug, so volumes of one work share a prefix.
    assert matches and len({(b["author"], b["year"]) for b in matches}) == 1, f"{prefix}: {len(matches)} books match"
    return matches[0]


if __name__ == "__main__":
    items = sample_items(sys.argv[1])
    assert len(items) == 100, len(items)
    books = {b["slug"]: b for b in csv.DictReader(open(sys.argv[2]))}
    counts = collections.Counter()
    for _, _, _, prefix in items:
        b = book_for(prefix, books)
        counts[(b["slug"], b["author"], b["year"], b["translated"])] += 1
    for (slug, author, year, translated), n in counts.most_common():
        print(f"{n:3} {translated} {year} {author:30} {slug}")
