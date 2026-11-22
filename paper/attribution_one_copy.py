"""The authorship test from the blog post, rerun with one copy of each work.

Volumes of one work and second editions match each other almost by construction, so they can
inflate the leave-one-out score. This keeps the most-downloaded copy of each work per author
(titles matched as in reanalysis.py, ignoring year) and reruns analysis/attribution.py's test.

Usage (from the repo root, after npm run site:build):
  python3 paper/attribution_one_copy.py site-dist/numbers.json
"""
import os
import random
import statistics
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "analysis"))
from punc_common import NOT_AUTHOR, authors_with_works, guess_authors, load  # noqa: E402
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
