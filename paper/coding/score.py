"""Scores a human coder's export from the coding page against both model coders.

Prints agreement and Cohen's kappa against the first coder (1700s sample only) and the blind second coder (both samples),
the human's glue rates, and the main punctuation share recomputed with the human's English-original rates.
Usage: python3 paper/coding/score.py punc-codes-YYYY-MM-DD.csv
"""
import csv
import json
import sys
from pathlib import Path

HERE = Path(__file__).parent
ANALYSIS = HERE.parent.parent / "analysis"
sys.path[:0] = [str(HERE.parent)]
from list_sample_books import book_for, sample_items  # noqa: E402
from reanalysis import TRANSLATED_SAMPLE_BOOKS, dedupe, glue_rates, load_books, share  # noqa: E402


def kappa(x, y):
    """Cohen's kappa for two lists of booleans."""
    n = len(x)
    observed = sum(a == b for a, b in zip(x, y)) / n
    px, py = sum(x) / n, sum(y) / n
    expected = px * py + (1 - px) * (1 - py)
    return observed, (observed - expected) / (1 - expected)


def compare(label, human, model, ids):
    ids = [i for i in ids if i in human]
    observed, k = kappa([human[i] for i in ids], [model[i] for i in ids])
    disagree = [i for i in ids if human[i] != model[i]]
    print(f"{label}: {round(observed * len(ids))}/{len(ids)} agree ({observed:.0%}), kappa {k:.2f}; disagree on {', '.join(disagree) or 'none'}")


def main(codes_path):
    rows = list(csv.DictReader(open(codes_path)))
    human = {r["id"]: r["code"] == "GLUE" for r in rows if r["code"]}
    unsure = [r["id"] for r in rows if r["unsure"] == "1"]
    print(f"{len(human)} of {len(rows)} passages coded; {len(unsure)} marked unsure ({', '.join(unsure) or 'none'})")

    items = {i["id"]: i for i in json.load(open(HERE / "items.json"))}
    books = {b["slug"]: b for b in csv.DictReader(open(ANALYSIS / "books.csv"))}
    first, translated = {}, set()
    for n, _, code, prefix in sample_items(ANALYSIS / "sample-coded.md"):
        first[f"a{n}"] = code == "GLUE"
        if book_for(prefix, books)["slug"] in TRANSLATED_SAMPLE_BOOKS:
            translated.add(f"a{n}")
    blind = json.load(open(ANALYSIS / "second-coder-codes.json"))
    second = {f"{s}{n}": v == "GLUE" for s, key in (("a", "set_a"), ("b", "set_b")) for n, v in blind[key].items()}

    a_ids = [f"a{n}" for n in range(1, 101)]
    b_ids = [f"b{n}" for n in range(1, 101)]
    print()
    compare("Human vs first coder, 1700s", human, first, a_ids)
    compare("Human vs second coder, 1700s", human, second, a_ids)
    compare("Human vs second coder, 1900s", human, second, b_ids)

    def rates(ids):
        marks = [(items[i]["mark"], human[i]) for i in ids if i in human]
        semis, colons = (sum(1 for m, _ in marks if m == mark) for mark in ";:")
        ws, wc = glue_rates(marks)
        glued_s = sum(g for m, g in marks if m == ";")
        glued_c = sum(g for m, g in marks if m == ":")
        return ws, wc, f"semicolons {glued_s}/{semis} ({ws:.0%}), colons {glued_c}/{colons} ({wc:.0%})"

    english = [i for i in a_ids if i not in translated]
    print()
    print("Human glue rates, 1700s all 100:", rates(a_ids)[2])
    ws, wc, text = rates(english)
    print(f"Human glue rates, 1700s English originals ({len(english)}):", text)
    print("Human glue rates, 1900s:", rates(b_ids)[2])

    deduped, _ = dedupe(load_books(ANALYSIS / "books.csv"))
    print(f"\nPunctuation share with the human's English-original rates: {share(deduped, ws, wc):.0%} "
          f"(first coder's 36/50 and 19/32 give {share(deduped, 36 / 50, 19 / 32):.0%})")


if __name__ == "__main__":
    main(sys.argv[1])
