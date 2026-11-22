"""Full-text checks for the paper (review-log NeedsNewWork items 4 and 5), on the deduplicated 1600-1974 books.

1. Asserts the local texts reproduce books.csv's per-book counts before anything is stripped.
2. Strips editorial apparatus where it can be detected (bracketed footnotes and illustration notes, footnote
   paragraphs, transcriber and producer notes, sections headed as an editor's or translator's introduction, a
   preface or introduction credited on the title page to someone else, and end matter headed notes, index or
   glossary), then rebuilds words between periods (P), between stops (S) and between weighted stops.
3. Reruns the strict splitter, dashes-as-stops and narration-only variants on both versions of the text,
   unweighted and weighted, with bootstrap intervals (books, and for weighted, the coded marks too).
4. Measures single-quote dialogue in 1900-1949 books, which narration-only (double quotes only) misses.

Books that have left Punc's shelf since books.csv was made have no local text and are left out; the base row
reports the share on the same books from books.csv's own numbers, so every row compares like with like.

Usage: python3 fulltext_checks.py ../analysis/books.csv ../analysis/sample-coded.md ../texts
"""
import csv
import gzip
import os
import random
import re
import statistics
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "analysis"))
from textmeasures import WORD, counts, dash_runs, fold, split_quotes, strict_stops  # noqa: E402
from list_sample_books import book_for, sample_items  # noqa: E402
from reanalysis import TRANSLATED_SAMPLE_BOOKS, dedupe, glue_rates, load_books, period
from reanalysis import share as csv_share  # noqa: E402

GLUE = (36 / 50, 19 / 32)  # English-original glue rates for ; and : (reanalysis.py)

# --- apparatus -------------------------------------------------------------------------------------------
NOTE_SPAN = re.compile(r"\[(?:foot-?note|note|illustration|sidenote|transcriber|editor|ed\.|greek|hebrew|pg|page|errata|blank page)"
                       r"\b[^\[\]]{0,6000}?\]", re.I)
MARKER = re.compile(r"\[(?:\d{1,3}|[A-Za-z]|[*†‡§]+)\]|\{\d{1,3}\}")
FOOTNOTE_PARA = re.compile(r"^\s*(?:\[(?:\d{1,3}|[A-Za-z]|[*†‡§]+)\]|\{\d{1,3}\}|foot-?note\b)", re.I)
PRODUCER_PARA = re.compile(r"transcriber|produced by|distributed proofread|this e-?text|e-?text prepared|project gutenberg|scanned by|html version", re.I)
EDITORIAL_HEAD = re.compile(r"^(?:(?:editor|translator|publisher|transcriber)'?s'?\s+(?:introduction|preface|note|notes|foreword)"
                            r"|introduction,?\s+by\s+(?!the author)|(?:introductory|prefatory|biographical|bibliographical|critical)\s+"
                            r"(?:note|notes|sketch|introduction|essay|memoir)|memoir of|life of the author)", re.I)
END_HEAD = re.compile(r"^(?:foot-?notes|notes|endnotes|explanatory notes|notes and illustrations|(?:editor|translator)'?s'? notes"
                      r"|(?:general )?index|glossary|glossarial index|glossary of [a-z ]+)$", re.I)
START_HEAD = re.compile(r"^(?:chapter|chap\b|book|part|letter|act|section|sect\b|canto|epistle|volume|vol\b|preface|the preface"
                        r"|author'?s'? preface|introduction|dedication|to the reader|advertisement|prologue|the author)\b", re.I)
PREFACE_HEAD = re.compile(r"^(?:preface|introduction|foreword|memoir|biographical)\b", re.I)
CREDIT = re.compile(r"\b(?:preface|introduction|memoir|biographical (?:sketch|note)|critical (?:introduction|essay)|foreword)s?,?"
                    r"(?:\s+and\s+[a-z ]+?)?\s+by\s+(?!the author)([A-Z][\w.'-]*(?:\s+[A-Z][\w.'-]*)*)")


def heading(para):
    """The paragraph's text if it reads as a heading (one or two short lines), else None."""
    lines = [ln.strip() for ln in para.strip().splitlines() if ln.strip()]
    if not lines or len(lines) > 2 or len(" ".join(lines)) > 80:
        return None
    return re.sub(r"[.:]+$", "", " ".join(lines)).strip()


def cut_section(paras, i, total_words):
    """Index of the next main-text heading after paragraph i, or None if the section would run past 30% of the book."""
    used = 0
    for j in range(i + 1, len(paras)):
        h = heading(paras[j])
        if h and used and START_HEAD.match(h) and not PREFACE_HEAD.match(h) and not EDITORIAL_HEAD.match(h):
            return j
        used += len(WORD.findall(paras[j]))
        if used > 0.3 * total_words:
            return None
    return len(paras)


def strip_apparatus(text, author):
    """The text without detectable editorial apparatus, and the words removed by each rule."""
    removed = dict(brackets=0, footnote_paras=0, producer=0, front=0, end=0)
    total = len(WORD.findall(text))
    for rx in (NOTE_SPAN, MARKER):
        removed["brackets"] += sum(len(WORD.findall(m)) for m in rx.findall(text))
        text = rx.sub(" ", text)
    paras = re.split(r"\n\s*\n", text)
    drop = [False] * len(paras)
    for i, p in enumerate(paras):
        if FOOTNOTE_PARA.match(p):
            drop[i], removed["footnote_paras"] = True, removed["footnote_paras"] + len(WORD.findall(p))
        elif PRODUCER_PARA.search(p):
            drop[i], removed["producer"] = True, removed["producer"] + len(WORD.findall(p))
    surname = author.split()[-1].lower() if author else ""
    credit = CREDIT.search(text[:3000])
    credited = credit and surname not in credit.group(1).lower()
    seen, i = 0, 0
    while i < len(paras):
        h = heading(paras[i])
        front = seen < 0.4 * total
        kind = None
        if h and front and EDITORIAL_HEAD.match(h):
            kind = "front"
        elif h and front and credited and PREFACE_HEAD.match(h):
            kind, credited = "front", False  # only the first preface or introduction is the credited one
        elif h and seen > 0.5 * total and END_HEAD.match(h):
            kind = "end"
        if kind:
            j = cut_section(paras, i, total)
            if j is not None:
                for k in range(i, j):
                    if not drop[k]:
                        drop[k], removed[kind] = True, removed[kind] + len(WORD.findall(paras[k]))
                seen += sum(len(WORD.findall(p)) for p in paras[i:j])
                i = j
                continue
        seen += len(WORD.findall(paras[i]))
        i += 1
    return "\n\n".join(p for p, d in zip(paras, drop) if not d), removed


# --- single quotes ---------------------------------------------------------------------------------------
ELISION = r"(?:tis|twas|twere|twill|em|im|er|ere|cause|bout|n|ll|ve|re|d|s|t|un|ud|round|nuff|kin|ow|appen|ope|ome|alf|ead|eart|orse|ouse)\b"
SQ_OPEN = re.compile(r"(?:(?<=^)|(?<=[\s(\-]))'(?!" + ELISION + r")(?=[A-Za-z0-9])", re.I | re.M)
SQ_CLOSE = re.compile(r"(?<=[.,!?\-])'(?=\s|$|[)\-;:])|(?<=[A-Za-z])'(?=[,.;:!?](?:\s|$))", re.M)
DQ_CLOSE = re.compile(r'[.,!?\-]"(?=\s|$)', re.M)


def single_quoted(text):
    """Text inside single-quote dialogue (an opening quote paired with the next closing one in its paragraph), and the rest."""
    inside, outside = [], []
    for para in re.split(r"\n\s*\n", text):
        pos = 0
        while (o := SQ_OPEN.search(para, pos)) and (c := SQ_CLOSE.search(para, o.end())):
            outside.append(para[pos:o.start()])
            inside.append(para[o.end():c.start()])
            pos = c.end()
        outside.append(para[pos:])
    return "\n".join(inside), "\n".join(outside)


# --- shares ----------------------------------------------------------------------------------------------
def p_len(c, stops):
    return c["words"] / stops


def s_len(c, stops, ws, wc, extra=0):
    return c["words"] / (stops + ws * c["semi"] + wc * c["colon"] + extra)


VARIANTS = {
    "base": lambda m, ws, wc: (p_len(m["all"], m["all"]["stops"]), s_len(m["all"], m["all"]["stops"], ws, wc)),
    "strict splitter": lambda m, ws, wc: (p_len(m["all"], m["strict"]), s_len(m["all"], m["strict"], ws, wc)),
    "dashes count as stops": lambda m, ws, wc: (p_len(m["all"], m["all"]["stops"]), s_len(m["all"], m["all"]["stops"], ws, wc, m["dashes"])),
    "narration only": lambda m, ws, wc: (p_len(m["narr"], m["narr"]["stops"]), s_len(m["narr"], m["narr"]["stops"], ws, wc)),
    "narration only, strict": lambda m, ws, wc: (p_len(m["narr"], m["narr_strict"]), s_len(m["narr"], m["narr_strict"], ws, wc)),
    "narration only, single quotes too": lambda m, ws, wc: (p_len(m["narr1"], m["narr1"]["stops"]), s_len(m["narr1"], m["narr1"]["stops"], ws, wc)),
}


def share(books, variant, ws, wc, start=1700):
    vals = {p: [VARIANTS[variant](b, ws, wc) for b in books if period(b["year"]) == p] for p in (start, 1900)}
    drop_p = statistics.median(v[0] for v in vals[start]) - statistics.median(v[0] for v in vals[1900])
    drop_s = statistics.median(v[1] for v in vals[start]) - statistics.median(v[1] for v in vals[1900])
    return 1 - drop_s / drop_p


def interval(books, variant, marks, start=1700, draws=1000, seed=7):
    rng = random.Random(seed)
    a = [b for b in books if period(b["year"]) == start]
    z = [b for b in books if period(b["year"]) == 1900]
    semis = [x for x in marks if x[0] == ";"]
    colons = [x for x in marks if x[0] == ":"]
    values = sorted(share(rng.choices(a, k=len(a)) + rng.choices(z, k=len(z)), variant,
                          *((1, 1) if not marks else glue_rates(rng.choices(semis, k=len(semis)) + rng.choices(colons, k=len(colons)))),
                          start) for _ in range(draws))
    return values[int(0.025 * draws)], values[int(0.975 * draws)]


def measure(text):
    _, outs = split_quotes(text)
    _, outs1 = single_quoted(outs)
    return dict(all=counts(text), strict=strict_stops(text), dashes=dash_runs(text), narr=counts(outs),
                narr_strict=strict_stops(outs), narr1=counts(outs1),
                dq_close=len(DQ_CLOSE.findall(text)), sq_close=len(SQ_CLOSE.findall(text)))


def main(books_path, sample_path, texts_dir):
    deduped, _ = dedupe(load_books(books_path))
    by_slug = {b["slug"]: b for b in csv.DictReader(open(books_path))}
    english_marks = [(mark, code == "GLUE") for _, mark, code, prefix in sample_items(sample_path)
                     if book_for(prefix, by_slug)["slug"] not in TRANSLATED_SAMPLE_BOOKS]
    assert len(english_marks) == 82 and glue_rates(english_marks) == GLUE, glue_rates(english_marks)

    books, missing = [], []
    for b in deduped:
        path = os.path.join(texts_dir, b["slug"] + ".txt.gz")
        if not os.path.exists(path):
            missing.append(b)
            continue
        text = fold(gzip.open(path, "rt", encoding="utf-8").read())
        raw = measure(text)
        # Check: the local text reproduces books.csv's numbers for this book.
        csv_row = by_slug[b["slug"]]
        assert raw["all"]["words"] == int(csv_row["words"]), b["slug"]
        assert abs(raw["all"]["words"] / raw["all"]["stops"] - float(csv_row["words_between_periods"])) < 0.006, b["slug"]
        assert abs(1000 * raw["all"]["semi"] / raw["all"]["words"] - float(csv_row["semicolons_per_1000"])) < 0.006, b["slug"]
        assert abs(1000 * raw["all"]["colon"] / raw["all"]["words"] - float(csv_row["colons_per_1000"])) < 0.006, b["slug"]
        stripped_text, removed = strip_apparatus(text, b["author"])
        books.append(dict(slug=b["slug"], year=b["year"], author=b["author"], raw=raw, stripped=measure(stripped_text), removed=removed))

    out = print
    out("# Full-text checks (review-log items 4 and 5)\n")
    out(f"Generated by `paper/fulltext_checks.py` on the {len(deduped)} deduplicated 1600-1974 books. "
        f"{len(books)} have a local text; {len(missing)} have left Punc's shelf since books.csv was made and are left out of every row:")
    for p in range(1600, 2000, 50):
        n_missing = sum(period(b["year"]) == p for b in missing)
        if n_missing:
            out(f"- {p}-{p + 49 if p < 1950 else 1974}: {n_missing} ({', '.join(b['slug'] for b in missing if period(b['year']) == p)[:300]})")
    out("\nEvery remaining book's words, words between periods, semicolons and colons per 1,000 match books.csv exactly (asserted).\n")

    out("## Apparatus removed\n")
    out("| Period | Books | Books with any removed | Median % of words removed (books with any) | Brackets and markers | Footnote paragraphs | Producer notes | Front matter | End matter |")
    out("|---|---:|---:|---:|---:|---:|---:|---:|---:|")
    for p in range(1600, 2000, 50):
        g = [b for b in books if period(b["year"]) == p]
        hit = [b for b in g if sum(b["removed"].values())]
        pct = statistics.median(100 * sum(b["removed"].values()) / b["raw"]["all"]["words"] for b in hit) if hit else 0
        kinds = [sum(bool(b["removed"][k]) for b in g) for k in ("brackets", "footnote_paras", "producer", "front", "end")]
        out(f"| {p}-{p + 49 if p < 1950 else 1974} | {len(g)} | {len(hit)} | {pct:.1f} | " + " | ".join(map(str, kinds)) + " |")
    out("\nThe last five columns count books where each rule removed something. Front matter: sections headed as an editor's or translator's "
        "introduction, preface, note or memoir, or a preface or introduction credited on the title page to someone other than the author. "
        "End matter: sections in the second half headed notes, footnotes, index or glossary, up to the next chapter-style heading.")
    biggest = sorted(books, key=lambda b: -sum(b["removed"].values()) / b["raw"]["all"]["words"])[:8]
    out("\nLargest removals: " + "; ".join(f"{b['slug']} ({b['year']}) {100 * sum(b['removed'].values()) / b['raw']['all']['words']:.0f}%" for b in biggest) + ".\n")

    out("## Words between periods and stops, apparatus removed\n")
    out("| Period | Books | P as is | P stripped | S stripped | Weighted S stripped |")
    out("|---|---:|---:|---:|---:|---:|")
    for p in range(1600, 2000, 50):
        g = [b for b in books if period(b["year"]) == p]
        med = lambda f: statistics.median(f(b) for b in g)
        out(f"| {p}-{p + 49 if p < 1950 else 1974} | {len(g)} | {med(lambda b: VARIANTS['base'](b['raw'], 1, 1)[0]):.1f} "
            f"| {med(lambda b: VARIANTS['base'](b['stripped'], 1, 1)[0]):.1f} | {med(lambda b: VARIANTS['base'](b['stripped'], 1, 1)[1]):.1f} "
            f"| {med(lambda b: VARIANTS['base'](b['stripped'], *GLUE)[1]):.1f} |")

    out("\n## Share of the 1700-1749 to 1900-1949 drop that is punctuation\n")
    out("Weighted: each semicolon and colon counts at its English-original glue rate (36/50 and 19/32); dashes count in full. "
        "Intervals: 1,000 bootstrap draws of books within each period, and for weighted rows the 82 coded marks too.\n")
    out("| Text | Variant | Books (start/end) | Unweighted | Weighted |")
    out("|---|---|---|---:|---:|")
    results = {}
    for version in ("raw", "stripped"):
        rows = [dict(year=b["year"], **b[version]) for b in books]
        for variant in VARIANTS:
            for start in (1700, 1750):
                n = f"{sum(period(r['year']) == start for r in rows)}/{sum(period(r['year']) == 1900 for r in rows)}"
                u, w = share(rows, variant, 1, 1, start), share(rows, variant, *GLUE, start)
                (ulo, uhi), (wlo, whi) = interval(rows, variant, [], start), interval(rows, variant, english_marks, start)
                results[(version, variant, start)] = w
                label = "as is" if version == "raw" else "apparatus removed"
                out(f"| {label} | {variant}{'' if start == 1700 else ', from 1750'} | {n} | {u:.0%} ({ulo:.0%}-{uhi:.0%}) | {w:.0%} ({wlo:.0%}-{whi:.0%}) |")
    # Check: the base row on these books is books.csv's own number (the same counts, so the same share).
    csv_rows = [b for b in deduped if b not in missing]
    assert abs(csv_share(csv_rows, *GLUE) - results[("raw", "base", 1700)]) < 0.005
    out(f"\nOn all {len(deduped)} deduplicated books (books.csv), the weighted base share is {csv_share(deduped, *GLUE):.0%}; "
        f"on the {len(books)} with a local text it is {results[('raw', 'base', 1700)]:.0%}.\n")

    out("## Single-quoted text\n")
    out("A book's quote style is whichever closing quote (after . , ! ? or a dash, or a single quote after a word and before punctuation) is "
        "more common, when there are at least 2 per 1,000 words. Narration only removes text in double quotes; the single-quote row also "
        "removes text between an opening single quote (not an elision like 'tis or 'em) and the next closing one in its paragraph. This catches scare quotes as well as speech: philosophy books such as Pragmatism count as single-quote books through quoted terms.\n")
    out("| Period | Books | Mostly double quotes | Mostly single quotes | Little dialogue | Median words in single quotes (single-quote books) | Narration P, double only | Narration P, single too |")
    out("|---|---:|---:|---:|---:|---:|---:|---:|")
    for p in (1700, 1750, 1800, 1850, 1900):
        g = [b["raw"] for b in books if period(b["year"]) == p]
        style = lambda m: ("little" if max(m["dq_close"], m["sq_close"]) < 2 * m["all"]["words"] / 1000
                           else "single" if m["sq_close"] > m["dq_close"] else "double")
        single = [m for m in g if style(m) == "single"]
        sq_share = statistics.median(1 - m["narr1"]["words"] / m["narr"]["words"] for m in single) if single else 0
        out(f"| {p}-{p + 49} | {len(g)} | {sum(style(m) == 'double' for m in g)} | {len(single)} | {sum(style(m) == 'little' for m in g)} "
            f"| {sq_share:.0%} | {statistics.median(VARIANTS['narration only'](m, 1, 1)[0] for m in g):.1f} "
            f"| {statistics.median(VARIANTS['narration only, single quotes too'](m, 1, 1)[0] for m in g):.1f} |")
    singles_1900 = sorted((b for b in books if period(b["year"]) == 1900 and b["raw"]["sq_close"] > b["raw"]["dq_close"]
                           and b["raw"]["sq_close"] >= 2 * b["raw"]["all"]["words"] / 1000), key=lambda b: b["slug"])
    out("\n1900-1949 books mostly in single quotes: " + ", ".join(b["slug"] for b in singles_1900) + ".")

    moved = [(k, v) for k, v in results.items() if abs(v - results[("raw", "base", 1700)]) > 0.03]
    out("\n## Rows more than 3 points from the as-is weighted base\n")
    for (version, variant, start), v in moved:
        out(f"- {version}, {variant}, from {start}: {v:.0%}")


if __name__ == "__main__":
    main(*sys.argv[1:4])
