# Punc research: number ledger (2026-11-10)

Data: Punc commit 66982de (site-dist/numbers.json and site-dist/books/*.txt.gz) and Gutenberg's pg_catalog.csv downloaded 2026-11-10. See README.md for how to rerun each script. Medians of per-book values; bootstrap = 1,000-2,000 resamples of books within each period.

## Sentence length (sentence_units.py, robustness.py, weighted_and_translations.py)

| 50-yr period | n | words between periods | words between stops (. ? ! ; :) |
|---|---|---|---|
| 1600-49 | 21 | 20.9 | 13.9 |
| 1650-99 | 13 | 24.3 | 16.6 |
| 1700-49 | 18 | 30.3 | 21.6 |
| 1750-99 | 48 | 27.3 | 19.8 |
| 1800-49 | 96 | 21.4 | 16.4 |
| 1850-99 | 288 | 17.9 | 15.0 |
| 1900-49 | 445 | 14.5 | 13.3 |
| 1950-74 | 25 | 12.5 | 12.4 |

Share of the 1700-49 -> 1900-49 drop that disappears when ; and : count as stops:
- base 47% [38, 60]; from 1750: 49% [40, 64]
- semicolons only 42% [32, 55]; colons only 13%
- dashes also count 43%; strict splitter (abbreviations, initials, ellipses, dialogue tags) 52% [40, 63]
- narration only (outside double quotes) 54%; strict narration 58%
- no plays/poetry 48%; fiction only 48%; nonfiction 66% (n=6 baseline)
- English originals (catalog translator flag) 48%; English originals no plays/poetry 51%
- English originals with title-page translation check too: 58% [50, 61] from 1700 (n=13), 49% from 1750
- WEIGHTED by hand-coded glue rates (0.72 per ;, 0.58 per :): 38% [28, 48]; from 1750 38% [28, 51]
- weighted + strict: 42% [29, 50]; from 1750 38%
- Range across all variants: 38% to 58%. Conservative headline: about 40%.

Narration still shortens: words between stops in narration 21.9 (1700-49) -> 14.5 (1900-49). Dialogue is not "the other half."

## Hand-coded sample (sample_marks.py, sample.txt; seed 42)

100 random marks from 49 English-original prose books dated 1700-1799. Test: could what follows stand as its own sentence (incl. and/but/for openers)?
- Semicolons: 43 of 60 glue two clauses (72%). Others: series of that-clauses, relative/subordinate clauses, lists of names.
- Colons: 23 of 40 (58%). Others: introduce a quotation, open a list, headings, footnotes, glosses.
- One coder (Claude, in this session), not blind. Codes are in sample.txt order: ; L = 9,10,14,16,17,20,25,33,36,38,39,40,47,52,54,56,60. : L = 61,62,63,64,66,67,74,75,76,79,80,83,89,92,96,99,100.

## Semicolons and other marks by 25-yr period (timeseries.py), periods with 20+ books quoted

1775-99 (32 books): ; 10.1, comma 85.9, ? 1.9, ! 0.8, dialogue 5%. 1800-24: ; 12.6. 1850-74: 8.6. 1900-24: 4.6. 1925-49: 2.6, dialogue 34%. 1950-74 (25): ; 1.8, comma 63.1, ? 5.3, dialogue 28%. 1600-24 has 16 books (14.9 ;), not quoted.
Least-squares since 1800: -0.75 semicolons per 1,000 words per decade (854 books).
Babbel check: 1 per 90 words in 1781 = 11.1 per 1,000; Punc 1775-99 median 10.1.

## Careers and generations (rest.py, cohort.py)

17 authors with 5+ dated books over 20+ years: 8 down, 9 up, median slope 0.01 per decade. Dickens -1.8 (11.4 -> 8.4 per notes), Henry James -2.3, Austen +3.4 (juvenilia first), Twain +1.3, Chesterton +1.6.
Joint model, 748 English-original books 1750-1974, author aged 15-90 at publication: semicolons per century: publication year -3.1 [-5.9, -0.5], birth year -3.7 [-6.2, -1.1]. Alone: pub -6.6 (R2 .273), birth -6.6 (R2 .275). Reading: both move it, about evenly.

## Authorship (attribution.py, attribution_genre.py)

132 authors with 3+ works, 708 books: 241 right (34.0%). Chance 1/132 = 0.76%. Always-guess-Dickens 2.8%.
Shuffled labels (20 runs): mean 0.8%, max 2.0%. Genre-preserving shuffle (10 runs): mean 4.2%, max 6.2%.
English originals only (catalog flag): 104 authors, 546 books, 35.0% (chance 1.0%).
Plato 12/18, Shakespeare 11/18, Christie 10/14, Nietzsche 10/13, Conan Doyle 8/12, Twain 5/18, Dickens 0/20 (Howard 7, Dumas 3, Dostoyevsky 2, then 1 each Verne, Stevenson, Homer, Poe, Jacob Grimm, Tolstoy, Milton, Russell), Wilde 0/14, Chesterton 2/13.
Leave one mark out: , 31.4  . 30.9  " 33.8  ' 32.1  ; 32.3  : 31.4  - 32.3  ? 32.1  ! 32.6  ( 32.3.

## Genres (rest.py): as in punc-findings.md section 7. Popularity: question -0.189, exclaim -0.144, dialogue -0.123, semicolon 0.026, comma 0.046, colon 0.04, dash 0.006, marks -0.01, wps 0.023 (1,959 books). Top 200 vs bottom 200: ? 4.27 vs 1.75; ! 3.07 vs 1.23; dialogue 26% vs 14%.

## Openings (arc.py): 1,727 books of 20,000+ words, ? + ! per 1,000 words by tenth: 3.3, 4.5, 4.8, 4.7, 4.7, 4.8, 4.8, 4.6, 4.7, 4.3. Cut at first chapter heading (1,108 books): 3.5, 4.5, 4.8, 4.7, 4.6, 4.8, 4.7, 4.7, 4.7, 4.3. (My tokenizer; notes had 3.2 first tenth.)

## Translations: Gutenberg catalog lists a translator for 368 shelf books; a title-page check ("translated", "translation", "rendered into English") flags 140 more (508). Candide and Rousseau's Discourse still slip through both.

## Second coder and a 1900s sample (blind/, agreement.py output 2026-11-10)

A Claude agent, given only the contexts (blind/set-a.txt = sample.txt, blind/set-b.txt = sample-1900s.txt, seed 1900, 382 English-original prose books 1900-1949) and the coding rule, coded both sets (blind/codes-b2.json).
- Set A agreement with Joe's codes: 95 of 100, Cohen's kappa 0.89. Disagreements: 21, 55, 74, 77, 94. Agent: ; 41/60, : 22/40.
- Set B (1900-49): ; 37/60 glue (62%), : 7/40 (18%).
- Weighted estimate with both coders' 1700s rates (; .70, : .5625) at both ends: 37% [26, 47]. With era-specific rates (1700s for 1700-49, 1900s for 1900-49): 38% [28, 48]. Headline stays about 40%.
