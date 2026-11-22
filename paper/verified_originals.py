"""The main share on verified English originals: 1700-1799 books checked by title page (translation-status.csv).

Other periods stay as in the main analysis. Also re-checks which of the coded 1700s marks come from translations.

Usage: python3 verified_originals.py ../analysis/books.csv ../analysis/sample-coded.md translation-status.csv
"""
import csv
import statistics
import sys

from list_sample_books import book_for, sample_items
from reanalysis import TRANSLATED_SAMPLE_BOOKS, bootstrap, dedupe, glue_rates, load_books, period, share


def main(books_path, sample_path, status_path):
    status = {r["slug"]: r["verdict"] for r in csv.DictReader(open(status_path))}
    deduped, _ = dedupe(load_books(books_path))
    in_1700s = [b for b in deduped if 1700 <= b["year"] <= 1799]
    assert {b["slug"] for b in in_1700s} == set(status), "translation-status.csv must cover exactly the deduplicated 1700-1799 books"
    print("Verdicts, 1700-1799:", {v: list(status.values()).count(v) for v in sorted(set(status.values()))})
    flag_wrong = [b["slug"] for b in in_1700s if (b["translated"] == "1") != (status[b["slug"]] == "translation")]
    print(f"Catalog translation flag disagrees with the title page for {len(flag_wrong)} books: {', '.join(flag_wrong)}")

    by_slug = {b["slug"]: b for b in csv.DictReader(open(books_path))}
    marks, old_marks, newly_translated = [], [], []
    for n, mark, code, prefix in sample_items(sample_path):
        slug = book_for(prefix, by_slug)["slug"]
        if slug not in TRANSLATED_SAMPLE_BOOKS:
            old_marks.append((mark, code == "GLUE"))
        if status.get(slug) == "translation" and slug not in TRANSLATED_SAMPLE_BOOKS:
            newly_translated.append((n, slug))
        if status.get(slug) != "translation":
            marks.append((mark, code == "GLUE"))
    old = glue_rates(old_marks)
    new = glue_rates(marks)
    print(f"Coded marks from books now found to be translations, beyond the 18 already excluded: {newly_translated or 'none'}")
    print(f"Glue rates: {len(marks)} marks, ; {new[0]:.2f} : {new[1]:.2f} (before: ; {old[0]:.2f} : {old[1]:.2f})")

    verified = [b for b in deduped if not (1700 <= b["year"] <= 1799) or status[b["slug"]] == "original"]
    print("\n| Books | 1700-1749 / 1750-1799 / 1900-1949 | Unweighted | Weighted (books and marks resampled) |")
    print("|---|---|---:|---:|")
    for name, group, start in (("Duplicates removed (main analysis)", deduped, 1700),
                               ("Verified English originals in 1700-1799", verified, 1700),
                               ("Verified English originals, from 1750-1799", verified, 1750)):
        counts = "/".join(str(sum(period(b["year"]) == p for b in group)) for p in (1700, 1750, 1900))
        lo, hi = bootstrap(group, [], start)
        wlo, whi = bootstrap(group, marks, start)
        print(f"| {name} | {counts} | {share(group, 1, 1, start):.0%} ({lo:.0%}-{hi:.0%}) "
              f"| {share(group, *new, start):.0%} ({wlo:.0%}-{whi:.0%}) |")
    for p in (1700, 1750):
        g = [b for b in verified if period(b["year"]) == p]
        print(f"Words between periods, verified originals {p}-{p + 49}: {statistics.median(b['words'] / b['stops'] for b in g):.1f} ({len(g)} books)")


if __name__ == "__main__":
    main(*sys.argv[1:4])
