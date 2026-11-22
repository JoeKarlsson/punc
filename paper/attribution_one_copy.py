"""The authorship test from the blog post, rerun with one copy of each work.

Volumes of one work and second editions match each other almost by construction, so they can
inflate the leave-one-out score. This keeps the most-downloaded copy of each work per author
(titles matched as in reanalysis.py, ignoring year) and reruns analysis/attribution.py's test.

Usage (from the repo root, after npm run site:build at commit 5a2b926, the last 1,959-book shelf;
the live shelf has since grown, so the check against 241 of 708 fails on a newer build):
  python3 paper/attribution_one_copy.py site-dist/numbers.json [analysis/books.csv]
With books.csv it also prints the genre-shuffled baseline, English originals only, where Dickens's books
went and the leave-one-mark-out scores, for the full shelf and one copy per work.
"""
import os
import collections
import csv
import random
import statistics
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "analysis"))
from punc_common import MARKS, NOT_AUTHOR, authors_with_works, guess_authors, load  # noqa: E402
from reanalysis import work_key  # noqa: E402


def one_copy_per_work(books):
    kept = []
    for b in sorted(books, key=lambda b: b.get("rank") or 10**6):
        key = work_key(b["title"])
        twin = not NOT_AUTHOR.match(b["author"]) and any(
            k["author"] == b["author"] and key and (key in work_key(k["title"]) or work_key(k["title"]) in key) for k in kept)
        if not twin:
            kept.append(b)
    return kept


def genre_shuffled(authors, runs=10, seed=11):
    """Shuffle author labels only among books with the same genre set (analysis/attribution_genre.py)."""
    pool = [b for group in authors.values() for b in group]
    label_of = {id(b): a for a, group in authors.items() for b in group}
    strata = {}
    for b in pool:
        strata.setdefault(tuple(sorted(b["genres"])), []).append(b)
    random.seed(seed)
    rates = []
    for _ in range(runs):
        by_label = {}
        for group in strata.values():
            labels = [label_of[id(b)] for b in group]
            random.shuffle(labels)
            for b, a in zip(group, labels):
                by_label.setdefault(a, []).append(b)
        runs_ = guess_authors(by_label)
        rates.append(sum(actual == guess for _, actual, guess in runs_) / len(runs_))
    return statistics.mean(rates), max(rates)


def details(books, translated):
    """The rest of the blog's authorship and Dickens charts: genre-shuffled baseline, English originals only,
    where Dickens's books went, and the score with each mark left out."""
    authors = authors_with_works(books, 3)
    guesses = guess_authors(authors)
    mean, top = genre_shuffled(authors)
    print(f"  genre-preserving shuffle (10 runs): mean {mean:.1%}, max {top:.1%}")
    english = {a: [b for b in group if not translated[b["slug"]]] for a, group in authors.items()}
    english = {a: group for a, group in english.items() if len(group) >= 3}
    eg = guess_authors(english)
    print(f"  English originals only (catalog flag): {len(english)} authors, {len(eg)} books, "
          f"{sum(a == g for _, a, g in eg) / len(eg):.1%}")
    went = collections.Counter(g for _, a, g in guesses if a == "Charles Dickens" and g != a)
    print("  Dickens's books went to: " + ", ".join(f"{a} {n}" for a, n in went.most_common()))
    print("  Dickens's titles by guess: " + "; ".join(f"{b['title']} -> {g}" for b, a, g in guesses if a == "Charles Dickens"))
    for name in ("Plato", "Oscar Wilde", "William Shakespeare", "Mark Twain"):
        mine = [(a, g) for _, a, g in guesses if a == name]
        print(f"  {name}: {sum(a == g for a, g in mine)} of {len(mine)}")
    for i, mark in enumerate(MARKS):
        kept = guess_authors(authors, [j for j in range(len(MARKS)) if j != i])
        print(f"  without {mark}: {sum(a == g for _, a, g in kept) / len(kept):.1%}")


def report(label, books):
    authors = authors_with_works(books, 3)
    guesses = guess_authors(authors)
    right = sum(actual == guess for _, actual, guess in guesses)
    random.seed(1)
    pool = [b for group in authors.values() for b in group]
    labels = [a for a, group in authors.items() for _ in group]
    shuffled = []
    for _ in range(20):
        random.shuffle(labels)
        by_label = {}
        for b, a in zip(pool, labels):
            by_label.setdefault(a, []).append(b)
        runs = guess_authors(by_label)
        shuffled.append(sum(actual == guess for _, actual, guess in runs) / len(runs))
    dickens = [(actual, guess) for _, actual, guess in guesses if actual == "Charles Dickens"]
    print(f"{label}: {len(books)} books; {len(authors)} authors with 3+ works; {right} of {len(guesses)} named ({right / len(guesses):.1%}); "
          f"chance {1 / len(authors):.2%}; shuffled labels mean {statistics.mean(shuffled):.1%}, max {max(shuffled):.1%}; "
          f"Dickens {sum(a == g for a, g in dickens)} of {len(dickens)}")
    return right, len(guesses)


if __name__ == "__main__":
    books = load(sys.argv[1])
    # Check: the full shelf reproduces the published 241 of 708.
    assert report("All books", books) == (241, 708)
    report("One copy per work", one_copy_per_work(books))
    if len(sys.argv) > 2:
        translated = {r["slug"]: r["translated"] == "1" for r in csv.DictReader(open(sys.argv[2]))}
        for label, group in (("All books", books), ("One copy per work", one_copy_per_work(books))):
            print(f"{label}, details:")
            details(group, translated)
