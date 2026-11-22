"""Reanalysis for the paper after review round 1, from analysis/books.csv alone.

- Reproduces the published 47% (base) and 38% (weighted) from books.csv first, as a check.
- Removes duplicate works (the same work twice, or several volumes of one work) within each author and year.
- Recomputes the clause-joining ("glue") rates without the 18 coded marks taken from translations.
- Bootstraps the weighted share resampling both books and coded marks, so the interval includes coding uncertainty.
- Reports the weighted version of every variant books.csv can compute.

Usage: python3 reanalysis.py ../analysis/books.csv ../analysis/sample-coded.md ../analysis/second-coder-codes.json
"""
import csv
import json
import random
import re
import statistics
import sys

from list_sample_books import book_for, sample_items

# Coded 1700s marks from translations, by book slug (authors writing in French, German, Danish/Latin, or Ovid in Fielding's English).
TRANSLATED_SAMPLE_BOOKS = {
    "a-discourse-upon-the-origin-and-the-foundation-of-the-inequality-among-mankind",
    "the-confessions-of-jean-jacques-rousseau", "emile", "candide",
    "kants-prolegomena-to-any-future-metaphysics", "a-journey-to-the-world-under-ground", "the-lovers-assistant",
}
VOLUME = re.compile(r"\b(vol(ume)?\.?|v\.)\s*[0-9ivx]+.*$|\(of \d+\)|\bseries (one|two|\d+)\b", re.I)


def period(year):
    return 1950 if year >= 1950 else year // 50 * 50


def load_books(path):
    books = []
    for b in csv.DictReader(open(path)):
        if not b["year"] or not 1600 <= int(b["year"]) <= 1974 or not b["words_between_periods"]:
            continue
        words = int(b["words"])
        books.append(dict(b, year=int(b["year"]), rank=int(b["download_rank"]), words=words,
                          stops=words / float(b["words_between_periods"]),
                          semis=float(b["semicolons_per_1000"]) * words / 1000,
                          colons=float(b["colons_per_1000"]) * words / 1000))
    return books


def work_key(title):
    title = VOLUME.sub("", title.lower())
    return re.sub(r"[^a-z ]", "", title).replace("the ", "").strip()


def dedupe(books):
    """Keep the most-downloaded book of each work: same author and year, one title contained in the other."""
    kept, dropped = [], []
    for b in sorted(books, key=lambda b: b["rank"]):
        key = work_key(b["title"])
        # "Various" is magazines and anthologies: separate issues, not volumes of one work.
        twin = b["author"] != "Various" and next((k for k in kept if k["author"] == b["author"] and k["year"] == b["year"]
                     and key and (key in work_key(k["title"]) or work_key(k["title"]) in key)), None)
        (dropped if twin else kept).append(b)
    return kept, dropped


def between(b, ws, wc):
    return b["words"] / (b["stops"] + ws * b["semis"] + wc * b["colons"])


def share(books, ws, wc, start=1700, end=1900):
    a = [b for b in books if period(b["year"]) == start]
    z = [b for b in books if period(b["year"]) == end]
    drop_periods = statistics.median(b["words"] / b["stops"] for b in a) - statistics.median(b["words"] / b["stops"] for b in z)
    drop_stops = statistics.median(between(b, ws, wc) for b in a) - statistics.median(between(b, ws, wc) for b in z)
    return 1 - drop_stops / drop_periods


def glue_rates(marks):
    semis = [g for m, g in marks if m == ";"]
    colons = [g for m, g in marks if m == ":"]
    return sum(semis) / len(semis), sum(colons) / len(colons)


def bootstrap(books, marks, start=1700, draws=2000, seed=7):
    """95% interval resampling books within each period and, when marks are given, the coded marks too."""
    rng = random.Random(seed)
    a = [b for b in books if period(b["year"]) == start]
    z = [b for b in books if period(b["year"]) == 1900]
    semis = [x for x in marks if x[0] == ";"]
    colons = [x for x in marks if x[0] == ":"]
    values = []
    for _ in range(draws):
        sample = rng.choices(a, k=len(a)) + rng.choices(z, k=len(z))
        ws, wc = (1, 1) if not marks else glue_rates(rng.choices(semis, k=len(semis)) + rng.choices(colons, k=len(colons)))
        values.append(share(sample, ws, wc, start))
    values.sort()
    return values[int(0.025 * draws)], values[int(0.975 * draws)]


def coded_marks(books_path, sample_path, second_path):
    """The 100 coded 1700s marks with both coders' codes and whether the mark's book is a translation."""
    by_slug = {b["slug"]: b for b in csv.DictReader(open(books_path))}
    second_coder = json.load(open(second_path))
    second, unsure = second_coder["set_a"], {int(n) for n in second_coder["unsure"]["set_a"]}
    coded = []
    for n, mark, code, prefix in sample_items(sample_path):
        slug = book_for(prefix, by_slug)["slug"]
        coded.append(dict(n=n, mark=mark, first=code == "GLUE", second=second[str(n)] == "GLUE",
                          unsure=n in unsure, translated=slug in TRANSLATED_SAMPLE_BOOKS))
    return coded


def main(books_path, sample_path, second_path):
    books = load_books(books_path)
    # Check: books.csv reproduces the published base (47%) and weighted (38%) shares.
    assert round(share(books, 1, 1), 2) in (0.47, 0.48), share(books, 1, 1)
    assert round(share(books, 0.72, 0.58), 2) in (0.37, 0.38, 0.39), share(books, 0.72, 0.58)

    coded = coded_marks(books_path, sample_path, second_path)
    english = [c for c in coded if not c["translated"]]
    print(f"Coded marks from translations: {len(coded) - len(english)} (items {[c['n'] for c in coded if c['translated']]})")
    rates = {}
    for label, group in (("all 100", coded), ("English originals", english)):
        first = glue_rates([(c["mark"], c["first"]) for c in group])
        second_rates = glue_rates([(c["mark"], c["second"]) for c in group])
        sure = glue_rates([(c["mark"], c["second"]) for c in group if not c["unsure"]])
        n_semis = sum(c["mark"] == ";" for c in group)
        print(f"Glue rates, {label} ({n_semis} ; and {len(group) - n_semis} :): first coder {first[0]:.2f} / {first[1]:.2f}; "
              f"second coder {second_rates[0]:.2f} / {second_rates[1]:.2f}, "
              f"without its {sum(c['unsure'] for c in group)} unsure items {sure[0]:.2f} / {sure[1]:.2f}")
        rates[label] = first
        rates[label + ", second coder"] = second_rates
    english_marks = [(c["mark"], c["first"]) for c in english]
    ws, wc = rates["English originals"]

    deduped, dropped = dedupe(books)
    print(f"\nDuplicate works dropped (1600-1974): {len(dropped)}")
    for b in sorted(dropped, key=lambda b: b["year"]):
        print(f"  {b['year']} {b['author']}: {b['title']}")
    for p in (1700, 1750, 1900):
        print(f"  books in {p}-{p + 49}: {sum(period(b['year']) == p for b in books)} -> {sum(period(b['year']) == p for b in deduped)}")

    def no_plays_poetry(b):
        return not re.search(r"plays|drama|poetry", b["genres"], re.I)

    variants = [
        ("All books", books, 1700),
        ("Duplicate works removed", deduped, 1700),
        ("Duplicates removed, no plays or poetry", [b for b in deduped if no_plays_poetry(b)], 1700),
        ("Duplicates removed, translation flag 0", [b for b in deduped if b["translated"] == "0"], 1700),
        ("Duplicates removed, from 1750-1799", deduped, 1750),
    ]
    print("\n| Variant | Books (start/end) | Unweighted | Weighted, English-original glue rates (books and marks resampled) |")
    print("|---|---|---:|---:|")
    for name, group, start in variants:
        n_a = sum(period(b["year"]) == start for b in group)
        n_z = sum(period(b["year"]) == 1900 for b in group)
        lo, hi = bootstrap(group, [], start)
        wlo, whi = bootstrap(group, english_marks, start)
        print(f"| {name} | {n_a}/{n_z} | {share(group, 1, 1, start):.0%} ({lo:.0%}-{hi:.0%}) "
              f"| {share(group, ws, wc, start):.0%} ({wlo:.0%}-{whi:.0%}) |")
    semis_only = share(deduped, ws, 0)
    # One non-gluing colon stands in for "colons count zero" so the bootstrap's colon rate is always 0.
    lo, hi = bootstrap(deduped, [m for m in english_marks if m[0] == ";"] + [(":", False)])
    print(f"\nSemicolons only (colons not counted), duplicates removed, weighted: {semis_only:.0%} ({lo:.0%}-{hi:.0%})")
    second_ws, second_wc = rates["English originals, second coder"]
    lo, hi = bootstrap(deduped, [(c["mark"], c["second"]) for c in english])
    print(f"Main share with the second coder's English-original rates: {share(deduped, second_ws, second_wc):.0%} ({lo:.0%}-{hi:.0%})")
    rng_books = random.Random(11)
    a = [b for b in deduped if period(b["year"]) == 1700]
    z = [b for b in deduped if period(b["year"]) == 1900]
    books_only = sorted(share(rng_books.choices(a, k=len(a)) + rng_books.choices(z, k=len(z)), ws, wc) for _ in range(2000))
    print(f"Main weighted share, books resampled, glue rates fixed: {books_only[int(0.025 * 2000)]:.0%}-{books_only[int(0.975 * 2000)]:.0%}")

    print("\nTable 2, duplicates removed: period | books | words between periods | words between stops (all ; and :) | weighted words between stops")
    for p in range(1600, 2000, 50):
        g = [b for b in deduped if period(b["year"]) == p]
        print(f"| {p}-{p + 49 if p < 1950 else 1974} | {len(g)} | {statistics.median(b['words'] / b['stops'] for b in g):.1f} "
              f"| {statistics.median(between(b, 1, 1) for b in g):.1f} | {statistics.median(between(b, ws, wc) for b in g):.1f} |")

    # Careers: a period effect would show up within authors' careers.
    english_deduped = [b for b in deduped if b["translated"] == "0"]
    by_author = {}
    for b in english_deduped:
        by_author.setdefault(b["author"], []).append(b)
    slopes = []
    for author, group in by_author.items():
        years = [b["year"] for b in group]
        if len(group) >= 5 and max(years) - min(years) >= 20 and author != "Various":
            fit = statistics.linear_regression(years, [float(b["semicolons_per_1000"]) for b in group])
            slopes.append((author, fit.slope * 10))
    rng = random.Random(13)
    medians = sorted(statistics.median(rng.choices([s for _, s in slopes], k=len(slopes))) for _ in range(2000))
    print(f"\nCareer slopes, English originals, duplicates removed ({len(slopes)} authors with 5+ dated books over 20+ years): "
          f"median {statistics.median(s for _, s in slopes):+.2f} semicolons per 1,000 per decade (95% {medians[int(0.025 * 2000)]:+.2f} to {medians[int(0.975 * 2000)]:+.2f}); "
          f"{sum(s < 0 for _, s in slopes)} fall, {sum(s > 0 for _, s in slopes)} rise")

    # Prose only (no plays or poetry), duplicates removed: is 1700-1749 still the peak?
    print("\nProse-only words between periods by period (books):",
          ", ".join(f"{p}: {statistics.median(b['words'] / b['stops'] for b in g):.1f} ({len(g)})"
                    for p in range(1600, 2000, 50) if (g := [b for b in deduped if period(b['year']) == p and no_plays_poetry(b)])))

    # Selection within periods: does download rank track the measures among the books of one era?
    print("\nSpearman correlation of download rank with each measure, within periods (duplicates removed):")
    for start, end in ((1700, 1799), (1900, 1949)):
        group = [b for b in deduped if start <= b["year"] <= end]
        ranks = [b["rank"] for b in group]
        measures = {"words between periods": [b["words"] / b["stops"] for b in group],
                    "weighted words between stops": [between(b, ws, wc) for b in group],
                    "semicolons per 1,000": [float(b["semicolons_per_1000"]) for b in group]}
        print(f"  {start}-{end} ({len(group)} books): " + ", ".join(
            f"{name} {statistics.correlation(ranks, values, method='ranked'):+.2f}" for name, values in measures.items()))

    # Medians of the weighted unit, duplicates removed (for the Discussion's 'about 22 to about 13').
    for p in (1700, 1900):
        group = [b for b in deduped if period(b["year"]) == p]
        print(f"Weighted words between stops {p}-{p + 49}: {statistics.median(between(b, ws, wc) for b in group):.1f}; "
              f"words between periods {statistics.median(b['words'] / b['stops'] for b in group):.1f}")


if __name__ == "__main__":
    main(*sys.argv[1:4])
