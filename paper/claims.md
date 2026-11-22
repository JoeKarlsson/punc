# Claims ledger

Every number in `draft.md`, with its source. `R` = `analysis/RESULTS.md` (ledger of 2026-11-10, Punc commit 66982de). `T1` = output of `python3 paper/corpus_table.py analysis/books.csv`. `blog` = the published post, where the number was computed in the original analysis session but isn't in R.

| Number | Where in draft | Source |
|---|---|---|
| 954 dated books 1600-1974 | Title, abstract, 3 | R "Other numbers": 1,073 dated, 114 before 1600; sum of Table 2 book counts = 954 |
| 30.3 -> 14.5 words between periods | Abstract, 5.1, Table 2 | R "Sentence length" table, 1700-49 and 1900-49 |
| 21.6 -> 13.3 words between stops | Abstract, 5.1 | R same table |
| 47% unweighted, 38-60% | Abstract, 5.1, Table 3 | R "base 47% [38, 60]" |
| 15.8 and 8.3 word declines | 5.1 | Derived: 30.3-14.5, 21.6-13.3 |
| 72% (43/60), 58% (23/40) | Abstract, 4, 5.1 | R "Hand-coded sample" |
| 38% (28-48%) weighted | Abstract, 1, 5.1, Table 3 | R "WEIGHTED ... 38% [28, 48]" |
| 38-58% across variants | Abstract, 1, 5.2 | R "Range across all variants" |
| 95/100, kappa 0.89; 41/60, 22/40 | 5.1 | R "Second coder", set A |
| 37/60 (62%), 7/40 (18%) | 5.1 | R "Second coder", set B |
| 37% (26-47), 38% (28-48) era rates | 5.1 | R "Second coder" weighted estimates |
| Table 3 rows (42 [29,50]; 42 [32,55]; 43; 48; 48; 49 [40,64]; 52 [40,63]; 54; 58 [50,61]) | 5.2 | R "Share of the 1700-49 -> 1900-49 drop" list |
| Colons only 13% | 5.2 | R same list |
| 13 English-original books 1700-49 | 5.2 | R "(n=13)" |
| 5% -> 28% dialogue; 1.9 -> 5.3 question marks | 5.3 | R "Semicolons and other marks by 25-yr period" |
| Narration 21.9 -> 14.5; 7.4 vs 8.3 | Abstract, 1, 5.3 | R "Narration still shortens"; derived 21.9-14.5 |
| Semicolons 10.1, 12.6, 8.6, 4.6, 1.8 per 1,000 | Abstract, 1, 5.4 | R "Semicolons ... by 25-yr period" |
| -0.75 per decade, 854 books | 5.4 | R "Least-squares since 1800" |
| 6.0% -> 0.8% share of marks | 5.4 | R "Other numbers" |
| Commas 85.9 -> 63.1 | 5.4 | R 25-yr periods |
| 17 authors, 8 down, 9 up, median 0.01 | 5.5 | R "Careers and generations" |
| 748 books; -3.1 [-5.9,-0.5]; -3.7 [-6.2,-1.1]; -6.6 each; R² .273/.275; 456 authors, -6.2 to -0.02, -6.7 to -0.7 | 5.5 | R "Careers and generations" |
| 1,959 books; 2.5% of ~80,000 | 3 | blog "How I counted" |
| 1,073 dated; 114 before 1600; 67 after 1930 | 3, 7 | R "Other numbers" |
| Table 1 (all cells) | 3 | T1 (asserts its book counts equal Table 2's) |
| 9 of 21 plays, 11 prose books, median 42.3 | 4 | books.csv, 1600-1649, checked 2026-11-22 (plays 9, poetry 1, rest 11, median words_between_periods 42.32) |
| Plays 8.5 words a sentence | 4 | R "Genres" |
| Download rank correlation -0.19 | 3 | R "Popularity: question -0.189" |
| 100 marks, 49 books, seed 42; 382 books, seed 1900 | 4 | R "Hand-coded sample", "Second coder" |
| 1,000-2,000 resamples | 4 | R header |
| Sherman 41.4 Hooker, 22.5 Macaulay | 1, 4 | Sherman1893 p. 259 (blog figure) |
| Underwood 54.7%, 10,830 works | 2 | Underwood2022 abstract |
| Lewis "at least one-half in three hundred years" | 1 | Lewis1894 (quoted in blog) |

## Added in draft 2 (after review round 1)

`RA` = `paper/reanalysis-output.md`, produced by `python3 paper/reanalysis.py analysis/books.csv analysis/sample-coded.md analysis/second-coder-codes.json` (reproduces the original 47% and 38% from books.csv before anything else, as an assert).

| Number | Where in draft | Source |
|---|---|---|
| 16 duplicate works; 18->17 (1700-49), 48->44 (1750-99) | 3 | RA "Duplicate works dropped" |
| P 31.1 -> 14.5; weighted S 23.6 -> 13.6 (deduplicated) | Abstract, 5.1, 6 | RA last two lines |
| 40% (24-51%) headline | Abstract, 1, 5.1, Table 3 | RA table, "Duplicate works removed", weighted |
| 18 translated marks; 82 English-original marks (50 ;, 32 :) | Abstract, 4, 5.1 | RA first lines |
| 36/50 (72%), 19/32 (59%) first coder; 68%, 56% second coder | Abstract, 5.1 | RA "Glue rates, English originals"; counts checked 2026-11-22 |
| UNSURE 5 (1700s), 7 (1900s) | 4 | analysis/second-coder-codes.json "unsure" lists (checked 2026-11-22) |
| Table 3 rows and intervals; 37% semicolons only; 39-47% weighted range; 8-12 point weighting effect | 5.2 | RA table; differences computed from it |
| Prose-only P: 1600-49 37.6 (10 books), 1700-49 32.4 (16) | 4, 7 | RA "Prose-only words between periods" |
| Spearman -0.26 (1700-1799, 61 books), -0.05 (1900-49), +0.04 semicolons | 3 | RA "Spearman correlation" |
| 5 books dated after 1974 | 3 | 1,073 - 114 - 954 |
| Dialogue 5% (1775-99), 26% (1800-24), 19-34% after | 5.3 | books.csv median dialogue_share by 25-yr period, computed 2026-11-22 (1825: 19%, 1925: 34%) |
| Strict narration 58%, fiction 48%, English originals no plays/poetry 51%, nonfiction 66% (n=6) | 5.2 | R "Share of the ... drop" list |
| -0.3 per decade implied | 5.5 | -3.1 per century / 10 |

## Added in draft 3 (after review round 2)

| Number | Where in draft | Source |
|---|---|---|
| 938 books dated 1600-1974 after deduplication | 3 | 954 - 16 |
| 16 books from 13 works | 3 | RA dropped list (Henry 2, Magic Ring 2) |
| Table 2 (deduplicated, three series); 48% unweighted; 1600-49 20.9 -> 16.2 | 5.1 | RA "Table 2, duplicates removed"; pre-dedup 20.9 from R |
| Books-only interval 23-49% | 5.1 | RA "books resampled, glue rates fixed" |
| Second coder's rates 68%/56%, share 39% (22-49%) | 5.1 | RA "Main share with the second coder's" |
| Semicolons only 37% (18-47%) | 5.2 | RA "Semicolons only" |
| Weighted variants 38-47% | 1, 5.2 | RA table, weighted column |
| Dashes 43% (34-58), narration 54% (35-63) | 5.2 | analysis/chart-data.json, lines 580-619 |
| Spearman weighted S -0.25; 1900-49 -0.05/-0.06 | 3 | RA "Spearman correlation" |
| Careers: 13 authors, 7 fall, 6 rise, median -0.06 (-0.80 to +0.47) | 5.5 | RA "Career slopes" |
