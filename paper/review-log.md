# Review log

Rounds with the `paper-reviewer` agent. A revision is kept only if Overall didn't drop, no sub-score dropped by 2 or more, and no claim lost its source.

## Process notes (draft 1, 2026-11-22)

- Journal of Cultural Analytics' site refuses automated fetches, so the draft follows a generic article structure (abstract, introduction, background, data, methods, results, discussion, limitations, data availability). Word limit, citation style and required statements still need checking against JCA's guidelines.
- Reference checks: OpenAlex's free daily quota ran out mid-run, so seven books were checked against Open Library records instead (author and year match; Open Library stores main titles only). Calhoun's 2016 Medium essay couldn't be fetched and isn't cited. McIntosh 1998 and a guessed Royal Society Corpus paper were dropped.
- `verify_refs.py` keys Bruthiaux 1995 as `BRUTHlAUX1995` (OpenAlex's OCR'd surname); it was renamed by hand in `citation_map.json` and `references.md`, and a rerun would bring the bad key back.
- The authorship results from the blog post are left out to keep the paper on one question. They could be a separate short paper.

## Round 1: draft 1 -> draft 2 (kept)

Scores before: Soundness 2, Presentation 3, Contribution 3, Originality 3, Quality 2, Clarity 3, Significance 3, **Overall 5**.
Scores after (round 2's review of draft 2): Soundness 3, Quality 3, others 3, **Overall 6**. Kept.

The reviewer found problems in the data, not the arithmetic (every headline number matched RESULTS.md):
- 16 duplicate books (13 works) on the shelf, despite "repeat editions removed": two editions of Gulliver, Wealth of Nations, Franklin's Autobiography and others, plus extra volumes of one work.
- 18 of the 100 "English-original" coded marks came from translations (Rousseau, Voltaire, Kant, Holberg, Fielding's Ovid); the sample pool used only the catalog translator flag.
- The books.csv `translated` flag errs both ways (misses Candide and Rousseau; flags Otranto, The Monk, Opticks, Wollstonecraft).
- The weighted interval held the glue rates fixed.
- Framing: "40% is the lower end", "every variant 38-58%" (nonfiction 66% was omitted), a misquote of Underwood2022, Babbel2025 cited for a claim it doesn't make, several citations stretched beyond their abstracts.

Changes: `paper/reanalysis.py` (from books.csv; asserts it reproduces the original 47% and 38% first) removes duplicates, recomputes glue rates on the 82 English-original marks, bootstraps books and marks together, and computes weighted variants, a prose-only series and within-period selection checks. Headline moved from 38% (28-48%) to 40% (24-51%). All framing and citation fixes applied.

## Round 2: draft 2 -> draft 3 (kept)

Scores after (round 3's review of draft 3): all sub-scores 3, **Overall 6** (no drop). Kept.

Changes: Table 2 rebuilt on the deduplicated corpus with a weighted column; share under the second coder's rates (39%, 22-49%) and books-only interval (23-49%: the width is the 17 early books, not the coding); career slopes rerun on English originals with an interval (median -0.06, -0.80 to +0.47: can't decide period vs cohort); semicolons-only reported as a decomposition with an interval; selection implication stated; dead UNSURE code in reanalysis.py fixed; duplicate wording ("16 books from 13 works").

## Round 3: final fixes (not re-reviewed; text only)

Stale pre-deduplication counts in Methods and Limitations, Darmon2020 attributed to its full text, the age-effect caveat on career slopes, one percentile convention in reanalysis.py. References list cut to the 30 cited sources.

## NeedsNewWork (for Joe; not acted on)

1. **A human coder**, ideally a historical linguist, coding both 100-mark samples blind. The 1900s sample has a single (model) coder. This is the step most likely to move Overall above 6.
2. **Verified translation status** for the 61 deduplicated books of 1700-1799 (title pages), then the share on verified English originals. Largest remaining validity threat.
3. **Editions pilot:** collate a few 18th-century Gutenberg texts against first editions (e.g. ECCO) to size the editions effect. The one known case (Wealth of Nations) pushes the share up.
4. Strip editorial apparatus (footnotes, glossaries, modern prefaces) and rebuild the per-book counts; rerun strict splitter, narration and dashes deduplicated and weighted. Needs the full texts (`npm run site:build`).
5. Single-quote dialogue share in 1900-1949 books (full texts).
6. A larger coded sample stratified by book and genre.
7. Clause or T-unit parsing on a sample.
8. Replication on a non-Gutenberg corpus (ECCO-TCP, ARCHER, COHA) and past 1930.

## Left for Joe (small)

- A figure: P, S and weighted S by period from Table 2 (the blog's chart, redrawn on the deduplicated data).
- Page references for Darmon2020's "less noticeably" and dating by author lifetime.
- How many books were added to the shelf by hand, and in which periods.
- JCA's author guidelines (word limit, citation style, required statements): the site refuses automated fetches. Reference entries need a formatting pass to that style (some book entries lack publishers).
- The published blog post's numbers (38%, "38-58%", "954 books", 43 of 60 / 23 of 40) predate the duplicate and translation fixes. The headline "about 40%" still holds.

## Follow-up checks (draft 3 -> draft 4, 2026-11-22)

Done from the NeedsNewWork and Left-for-Joe lists:
- Item 2, translation status: title pages of all 61 books 1700-1799 read (`translation-status.csv`). 19 translations, 42 originals; the catalog flag was wrong for 11. Share on verified originals 45% (29-53%). The main estimate stays on all books, since 1900-1949 isn't verified.
- Items 4 and 5, full texts: apparatus stripped by rule; strict splitter, dashes, narration and single-quote variants rerun weighted and deduplicated (`fulltext_checks.py`, Table 4). All weighted full-text variants 35-49%. 55 books have left the shelf since books.csv, so these use 883.
- Figure 1 (`figure1.py`), hand-added books (none analyzed only by hand: `hand-added.md`).
- A blind coding page and scorer for a human coder (`paper/coding/`).
- The PDF and arXiv LaTeX build (`build.sh`), Chicago author-date via citeproc.

Still open: item 1 (a human coder: the page is ready, the coder isn't), 3 (editions pilot), 6-8 (larger sample, parsing, replication), Darmon page references, JCA's guidelines, the blog charts.

## Round 4: draft 4 (kept), then fixes

Scores: all sub-scores 3, **Overall 6** (no drop). Kept. Every new number matched its source.
Fixed from its weaknesses: the main-estimate defense now says 40% is conservative with respect to translations (they carry later punctuation at the early end) and calls 45% the better estimate for English-original prose; abstract's 45% rests on 13 books, not 42; ranges (35-49%, 8-15 points, up to 12 from 1750); dialogue summary leads with the weighted figures and the abstract says "about a tenth"; era-specific glue rates added (41%, 25-53%; `era_rates.py`); stale interval cross-reference and Table 3 caption; 5.4-5.5 marked as original-analysis and catalog-flag based; snapshot date and shelf drift; Discussion scoped to these texts and to later editors.
Not acted on (need Joe or new work): page references for Darmon2020 and Rudnicka2018/Westin2002; translation dates for the 19 eighteenth-century translations (keep period-era translations); 1800-1849 translation pass (Swiss Family Robinson is flagged 0); jackknife on the 13-book verified start; the human coder.
