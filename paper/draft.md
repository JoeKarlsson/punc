---
title: "How much of the decline in English sentence length is punctuation? Evidence from dated Project Gutenberg books, 1600-1974"
author: Joe Karlsson (independent researcher)
target: Journal of Cultural Analytics (article); arXiv preprint (cs.CL)
status: draft 3, 2026-11-22 (after review rounds 1-3)
---

## Abstract

English sentences are said to have shortened by half since the Elizabethans, and linguists have long suspected that part of the decline is a change in punctuation: writers who once joined clauses with semicolons and colons began ending them with periods. This paper measures how large that part is. In Project Gutenberg books with a known first-publication date, after removing duplicate works, the median number of words between sentence-final marks (. ? !) falls from 31.1 in 1700-1749 to 14.5 in 1900-1949. A sample of 100 eighteenth-century semicolons and colons was coded for whether each joins two clauses that could stand as sentences; on the 82 marks from English originals, 72% of semicolons and 59% of colons do. Counting each mark as a stop at that rate, the median falls from 23.6 to 13.6 words, so 40% of the decline disappears (95% interval 24-51%, resampling both books and coded marks). Weighted variants that drop plays and poetry, flagged translations, or start at 1750 give 39-47%. Removing quoted speech leaves the remaining decline almost unchanged. The semicolon falls from a median of 10.1 to 1.8 per 1,000 words between 1775-1799 and 1950-1974; publication year and author birth year fit that fall equally well and cannot be separated here. The coding was done by a large language model and checked by a second, blind model run; a human coder is the main outstanding check. Code, per-book data and coded samples are public.

## 1. Introduction

In 1894 Edwin Lewis concluded that "the English sentence has decreased in average length at least one-half in three hundred years" (Lewis1894). A year earlier Lucius Sherman had tallied 41.4 words per sentence in Richard Hooker against 22.5 in Macaulay (Sherman1893).

The standard objection is about units. A sentence, as most of these studies count it, runs from one period, question mark or exclamation mark to the next. Eighteenth-century writers often joined independent clauses with semicolons and colons where later writers would put a period. If they did, part of the decline is the same prose cut into more pieces. The objection is widely repeated (Fahnestock2011 and Biber2009, as reviewed in Rudnicka2018; Liberman2022; Oliver2025), but I have found no study that measures how much of the decline it explains across the eighteenth and nineteenth centuries, when the semicolon was common. The one direct test I know of, Westin's comparison of the two ways of counting in twentieth-century British newspaper editorials (Westin2002, as summarized in Rudnicka2018), found almost no difference, which is consistent with the punctuation explanation if the semicolon had already become rare by then, as Bruthiaux1995 suggests it may have.

This paper makes that measurement. It compares two units on the same books: words between sentence-final marks, and words between stops, where semicolons and colons also end a unit. If punctuation explains part of the decline, the two series should be far apart before 1800 and converge as the semicolon disappears. The share of the decline that vanishes under the second unit is the punctuation share. A semicolon can also separate list items or subordinate clauses, and a colon can introduce a quotation, so a coded sample gives the rate at which each mark joins clauses that could stand alone (its *glue rate*), and the estimate counts each mark at that rate.

The corpus is Punc, an art project that strips the words from books and keeps the punctuation, which holds 1,959 Project Gutenberg books. Section 3 describes what that origin means for the corpus.

In brief:

1. About 40% of the decline from 1700-1749 to 1900-1949 is punctuation (95% interval 24-51%; 38-47% across weighted variants).
2. The rest is not dialogue. Narration with every quoted passage removed falls by 7.4 words between stops, against 8.3 for the full text.
3. The semicolon falls from 10.1 to 1.8 per 1,000 words between 1775-1799 and 1950-1974, steepest after 1825. Publication year and author birth year fit this equally well.

All analyses were chosen after the data were available; none was pre-registered. Section 4 lists the choices made after the first results were seen, including the corrections made after review.

## 2. Background

**Punctuation's history.** Punctuation moved from marking pauses for reading aloud toward marking grammatical structure (Parkes1992). In a grammatical account, the semicolon and colon separate units at the level of the clause (Nunberg1990). Bruthiaux1995 traces four centuries of semicolon use in one genre and argues that "after flourishing in the seventeenth and eighteenth centuries, the semicolon may have become a marginal component of the English punctuation system." Watson2019 gives the mark's cultural history.

**Sentence length over time.** Rudnicka2018 tests the assumption of a steady decline in the Corpus of Historical American English and links changes in sentence length to syntactic change. In the full text it reviews the punctuation objection and reports "a dramatic decrease in the frequency of use of semicolons happening between 1810 and 1900." Liberman2022 asks whether the perceived trend would be better titled "Historical trends in English punctuation practices." Register studies complicate the picture: Biber1989 traces fiction, essays and letters along dimensions running between 'oral' and 'literate' styles over four centuries, and Biber2015 shows that grammatical complexity in academic writing moved from embedded clauses into phrases, so a shorter sentence need not be a simpler one. Linguists' alternative unit, the T-unit, is a main clause plus whatever is attached to it (Hunt1965); words between stops is a crude version of it.

**Punctuation as data.** In narrative texts, punctuation marks follow the same statistical laws as words (Kulig2016), and the spacing between marks follows regular distributions whose parameters differ by language (Stanisz2023). Darmon2020 uses punctuation sequences from Project Gutenberg for authorship and genre analysis. None of this work connects the change in punctuation to the sentence-length trend.

**Generations.** Underwood2022 finds, in 10,830 works of fiction from 1880 to 1999, that "slightly more than half (54.7 percent) of the variance explained by time is explained better by an author's year of birth than by a book's year of publication," the cohort-succession mechanism described by Ryder1965. Whether the semicolon's decline follows writers' generations has not been tested.

**Dialogue.** Muzny2017 models the dialogic character of narration and quotation in 1,100 novels, and in its full text reports more quotation over time. Since speech is short, more dialogue alone would shorten the average sentence; Section 5.3 removes it.

## 3. Data

**Corpus.** Punc's shelf holds Project Gutenberg's 2,000 most-downloaded English books as of November 2026, minus dictionaries, encyclopedias, books with no plain text and some repeat editions, plus a few books added by hand: 1,959 books. Gutenberg's license header and footer are removed at the `*** START` and `*** END` lines; editorial matter inside the text (modern prefaces, editors' footnotes and glossaries) is not removed (Section 7). Gerlach2020 warns that studies built on hand-picked Gutenberg subsets risk bias and are hard to reproduce; this subset is defined by a public ranking on a stated date, and the book list is published with the data.

**Duplicate works.** Among the dated books, 16 were duplicates of 13 works: a second edition of the same work (*Gulliver's Travels*, *The Wealth of Nations*, Franklin's *Autobiography*, *On the Origin of Species*, *The Adventures of Sherlock Holmes*, Emerson's *Essays*, *The Practice of the Presence of God*) or a further volume of one work (*Don Quixote*, David Henry's 1774 *Historical Account of All the Voyages Round the World*, *The Magic Ring* and others). Each work is kept once, as its most-downloaded copy (`paper/reanalysis.py`). This leaves 938 books dated 1600-1974, removing 1 book from 1700-1749 and 4 from 1750-1799. Table 1 shows the corpus before deduplication; Table 2 and every share in Section 5.1 and 5.2 use the deduplicated corpus. The rule matches only books with the same author and year, so volumes published in different years (such as *Don Quixote* Part II, 1615) are kept.

**Dates.** Each book's first-publication year comes from Wikidata (Vrandecic2014), with a hand-checked override list. Translations take the original's year, which matters here because a translation's punctuation is the translator's (Section 7). 1,073 of the 1,959 books have a year: 114 before 1600 (excluded from all analyses over time), 954 between 1600 and 1974, and 5 after 1974. Only 67 dated books appeared after 1930, because Gutenberg carries works in the US public domain, which mostly means works published before 1931 (Domain2026). The trend therefore ends in the mid-twentieth century.

**Composition.** Table 1 describes the dated books by period. The early periods are small (13 to 48 books before 1800), translations are common before 1850, and plays make up 43% of 1600-1649.

Table 1. Dated books by 50-year period, before deduplication. Translated: flagged by Gutenberg's catalog or by the word "translated" on the title page. This flag errs both ways: it misses Voltaire's *Candide* and Rousseau's *Discourse* and *Confessions*, and flags English originals such as Walpole's *Castle of Otranto*. Plays, poetry and novels: Punc's genre tags (a book can have several or none).

| Period | Books | Translated | Plays | Poetry | Novels | Median words | Median download rank |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1600-1649 | 21 | 29% | 43% | 5% | 19% | 23,619 | 618 |
| 1650-1699 | 13 | 31% | 0% | 8% | 8% | 58,695 | 317 |
| 1700-1749 | 18 | 28% | 0% | 6% | 56% | 103,398 | 578 |
| 1750-1799 | 48 | 31% | 2% | 10% | 29% | 71,590 | 462 |
| 1800-1849 | 96 | 24% | 1% | 8% | 44% | 127,067 | 522 |
| 1850-1899 | 288 | 22% | 3% | 3% | 41% | 85,542 | 558 |
| 1900-1949 | 445 | 11% | 2% | 2% | 43% | 68,343 | 645 |
| 1950-1974 | 25 | 4% | 0% | 0% | 32% | 48,511 | 621 |

**Selection.** The shelf reflects what readers download now, not what was printed then. If readers today prefer eighteenth-century books that read like modern ones, the early periods would understate their sentence length. Within 1700-1799 (61 deduplicated books), the Spearman correlation between download rank and words between periods is -0.26, and with weighted words between stops -0.25: the more-downloaded books (lower rank numbers) have longer sentences. Within 1900-1949 both are -0.05 or -0.06. Rank and the semicolon rate are uncorrelated in both (+0.04). So the shelf does not make the eighteenth century look more modern. If the same pattern holds below the top 2,000, it may overstate eighteenth-century sentence length instead; because P and the weighted S move together, the effect on the share is likely smaller than on either series, but with 61 books this is not settled.

## 4. Methods

**Counting.** Curly quotes and long dashes are folded into their plain forms. Punc ends a sentence at any run of `.`, `?` or `!`. Rates are per 1,000 words. Dialogue is the share of words inside double quotation marks. A stricter splitter, used as a check, does not end sentences at abbreviations such as "Mr.", initials, ellipses or dialogue tags (`"Help!" he cried`).

**Two units.** For each book, *words between periods* (P) is words divided by sentence-final marks, and *words between stops* (S) is words divided by sentence-final marks plus semicolons and colons.

**The punctuation share.** For a start period *a* and end period *z*, with medians of per-book values, the punctuation share is 1 - (S_a - S_z)/(P_a - P_z): the fraction of the decline in P that does not appear in S. The main comparison is 1700-1749 to 1900-1949. Table 2's P series peaks in 1700-1749, but that peak is partly an artifact of genre: 9 of the 21 books from 1600-1649 (before deduplication) are plays, which have a median of 8.5 words a sentence across the shelf, and the 10 deduplicated prose books from 1600-1649 have a median P of 37.6, above 1700-1749's prose median of 32.4. Ten books are too few to measure from, so the comparison starts at 1700, and Section 5.2 reports a start at 1750.

**Glue rates.** 100 marks (60 semicolons, 40 colons) were drawn at random (seed 42) from prose books dated 1700-1799 that Gutenberg's catalog does not list as translations. That check missed some translations: 18 of the 100 marks come from Rousseau, Voltaire, Kant, Holberg, and Fielding's version of Ovid. The glue rates used here come from the other 82 marks (50 semicolons, 32 colons). Each mark was coded for one question: could the text after the mark stand as its own sentence? The first coder's rule allowed *and*, *but* and *for* as openers; the second coder's prompt also allowed *nor*, *yet*, *so*, *however* and *therefore*. The weighted S counts each semicolon as w_s stops and each colon as w_c stops, where w is the glue rate. A second sample of 100 marks from 382 prose books dated 1900-1949 (seed 1900) tests whether the marks' jobs changed.

**Coders.** The first pass was coded by Claude (Opus 5.5) during the analysis, by the same session that had computed the unweighted share, so the coder knew the hypothesis and the result. A second Claude agent, given only the contexts and the coding rule (the prompt is published), coded both samples blind to the first codes, and listed the items it was unsure of (5 of the 1700s sample, 7 of the 1900s sample). The 1900s sample was coded only by the second agent, so it has no agreement statistic. Agreement is reported as Cohen's kappa (Cohen1960). Language-model annotation has matched or beaten crowd workers on some tasks (Gilardi2023; Tornberg2023), but those tasks were not grammatical coding of historical prose, and two runs of one model family are not independent in the way two people are. The glue rates are provisional until a human coder checks them.

**Intervals.** Medians of per-book values are used throughout. 95% intervals are percentile bootstrap intervals (Efron1979). For the punctuation share, each of 2,000 draws resamples the books within each period and, for weighted shares, resamples the coded marks and recomputes the glue rates, so the interval includes the sampling error of the coding. It treats the coded marks as independent, although they were drawn from 49 books, and it uses the first coder's rates; Section 5.1 reports the share under the second coder's rates. Intervals reported from the original analysis (Section 5.2, marked) resample books only. For the generations model, books by one author are not independent, so intervals from resampling authors are the primary ones.

**Generations.** Semicolons per 1,000 words are regressed by least squares on publication year and author birth year (from Gutenberg's catalog) for 748 English-original books dated 1750-1974 whose author was 15 to 90 at publication.

**Decisions made after seeing results.** The analysis began with the unweighted share. The weighting, the second coder, the 1900-1949 sample, the stricter splitter, the narration-only counts and the author-resampled intervals were added after the first estimate. After review, duplicate works were removed, the glue rates were recomputed without the marks from translations, the coded marks were added to the bootstrap, and the weighted versions of the variants were computed. The headline estimate moved from 38% (28-48%) to 40% (24-51%).

## 5. Results

### 5.1 About 40% of the decline is punctuation

Table 2 gives the three series on the deduplicated corpus. Words between periods fall from 31.1 in 1700-1749 to 14.5 by 1900-1949. Counting every semicolon and colon as a stop, the series falls from 21.9 to 13.3, so 48% of the decline disappears (47% before deduplication). By 1950-1974 all three series nearly meet (12.4 to 12.5), as the punctuation explanation predicts once the semicolon has become rare. The small early periods are fragile: removing one volume of *Don Quixote* moves the 1600-1649 median from 20.9 to 16.2.

Table 2. Median words between periods, between stops (every semicolon and colon counted) and between weighted stops (each mark counted at its glue rate), by period, duplicates removed.

| Period | Books | Words between periods | Words between stops | Words between weighted stops |
|---|---:|---:|---:|---:|
| 1600-1649 | 20 | 16.2 | 11.8 | 13.4 |
| 1650-1699 | 12 | 25.4 | 16.4 | 19.7 |
| 1700-1749 | 17 | 31.1 | 21.9 | 23.6 |
| 1750-1799 | 44 | 26.7 | 19.3 | 21.1 |
| 1800-1849 | 91 | 21.2 | 16.3 | 17.6 |
| 1850-1899 | 284 | 17.9 | 15.0 | 15.8 |
| 1900-1949 | 445 | 14.5 | 13.3 | 13.6 |
| 1950-1974 | 25 | 12.5 | 12.4 | 12.4 |

Not every mark joins clauses. In the 82 English-original marks, 36 of 50 semicolons (72%) and 19 of 32 colons (59%) joined clauses that could stand alone. The others separated parallel *that*-clauses or relative clauses, introduced quotations or lists, or sat in headings and footnotes. On all 100 marks, the blind second coder agreed with the first on 95 (kappa 0.89); its rates on the 82 English-original marks were 68% and 56%.

With duplicate works removed, P falls from 31.1 to 14.5 and the weighted S from 23.6 to 13.6. The punctuation share is 40% (95% interval 24-51%). Almost all of the interval's width comes from the 17 books of 1700-1749: resampling books with the glue rates fixed gives 23-49%. Under the second coder's rates (68% and 56%) the share is 39% (22-49%).

The 1900-1949 sample shows the marks partly changing jobs. Semicolons still mostly joined clauses (37 of 60, 62%), but colons rarely did (7 of 40, 18%): by then a colon mostly introduced a list or a quotation.

### 5.2 Robustness

Table 3 gives the share under the variants that the per-book table supports, unweighted and weighted, with duplicates removed and intervals from resampling books and coded marks.

Table 3. The punctuation share by variant, duplicates removed (`paper/reanalysis.py`).

| Variant | Books (start/end) | Unweighted | Weighted |
|---|---|---:|---:|
| 1700-1749 to 1900-1949 (main) | 17/445 | 48% (33-61) | 40% (24-51) |
| No plays or poetry | 16/426 | 52% (36-60) | 41% (26-50) |
| Translation flag removed | 12/395 | 59% (51-64) | 47% (37-53) |
| From 1750-1799 | 44/445 | 50% (39-74) | 39% (29-56) |
| All books, no deduplication | 18/445 | 47% (39-60) | 38% (29-50) |

The weighted variants range from 38% to 47%. Counting semicolons alone at their glue rate, with colons ignored, gives 37% (18-47%); this is a decomposition rather than a variant, since colons that join clauses are part of the change. Weighting lowers each variant by 8 to 12 points, because the unweighted share counts marks that join nothing. The translation-flag variant is the highest, but the flag both misses translations and removes English originals (Table 1), so it does not isolate the effect of translation.

The original analysis also computed variants that need the full texts, unweighted and before deduplication, with intervals from resampling books only: a strict sentence splitter 52% (40-63), dashes counted as stops 43% (34-58), narration only 54% (35-63), strict narration 58%, fiction only 48%, English originals without plays or poetry 51%, and nonfiction alone 66%, from a 1700-1749 baseline of 6 books. Colons alone account for 13 points. If the weighting acts on these as it does in Table 3, it would be expected to lower each by roughly 8-12 points; that has not been computed.

### 5.3 The remaining decline is not dialogue

The share of words inside quotation marks rises from 5% in 1775-1799 to 26% in 1800-1824 and then stays between 19% and 34% through 1974. Question marks rise from 1.9 to 5.3 per 1,000 words between 1775-1799 and 1950-1974. With every quoted passage removed, median words between stops in narration still fall from 21.9 (1700-1749) to 14.5 (1900-1949), a fall of 7.4 words against 8.3 for the full text (both unweighted, before deduplication). On these figures, removing dialogue accounts for roughly a tenth of the decline in words between stops.

Two biases pull in opposite directions. Many eighteenth-century novels do not mark speech with quotation marks, which leaves short spoken lines in the early narration and understates narration's fall. Many British books of 1900-1949 use single quotation marks, which leaves dialogue in the late narration and overstates its fall. The net direction is unknown.

### 5.4 The semicolon's decline

Counting only 25-year periods with at least 20 books, the median book has 10.1 semicolons per 1,000 words in 1775-1799, 12.6 in 1800-1824, 8.6 in 1850-1874, 4.6 in 1900-1924 and 1.8 in 1950-1974. Across 854 books dated from 1800, the least-squares slope is -0.75 semicolons per 1,000 words per decade. As a share of all marks, the semicolon falls from 6.0% to 0.8% over the same periods. Commas fall less, from 85.9 to 63.1 per 1,000 words. The steepest fall, after 1825, matches Rudnicka2018's American finding.

Darmon2020, also working with Project Gutenberg, describes the semicolon's fall as less pronounced in its full text. Measured as a share of all marks, the fall is steep here too, so a per-word versus per-mark difference does not explain the gap. In that full text, Darmon2020 dates each work by its author's lifetime, since Gutenberg does not record publication dates, and draws on a different slice of the library; these data cannot say which difference matters.

### 5.5 Generations or publication dates

If the semicolon's fall were a period effect, it should show up within careers, unless authors' own habits changed with age in the other direction. Among English originals with duplicates removed, 13 authors have five or more dated books spanning 20 or more years. Seven use fewer semicolons over their careers and six use more; the median slope is -0.06 per 1,000 words per decade (95% interval over authors -0.80 to +0.47). A pure period effect at the joint model's rate (below) would imply about -0.3 per decade. The interval includes both that and zero, so careers cannot decide between the explanations.

Across 748 English-original books from 1750 to 1974, publication year alone and birth year alone fit about equally well (each -6.6 semicolons per 1,000 words per century; R² 0.273 and 0.275). In a joint model the coefficients are -3.1 per century for publication year and -3.7 for birth year. With intervals from resampling 456 authors, they are -6.2 to -0.02 and -6.7 to -0.7. Holding birth year fixed, publication year is also author age, so this is the age-period-cohort identification problem: the two predictors are nearly collinear and the model cannot apportion the decline between them. A cohort effect of the kind Underwood2022 found for fiction is consistent with the data, and so is a period effect.

## 6. Discussion

Between 1700-1749 and 1900-1949, the median stretch of prose between sentence-final marks fell by more than half, from 31.1 words to 14.5. Counting the semicolons and colons that join independent clauses as boundaries, the median unit fell from 23.6 words to 13.6, a drop of about two fifths. About 40% of the famous decline is a change in where writers and printers put periods. The rest is a real shortening of the units between stops, and it holds up when dialogue is removed. Neither unit splits independent clauses joined by a comma and a conjunction, so the residual is not shown to be a shortening of clauses.

These results are consistent with Westin2002's finding, as summarized in Rudnicka2018, that the two ways of counting barely differ in twentieth-century editorials: by then there are too few semicolons left to separate them. They also suggest that comparisons of sentence length across centuries should report a stop-based unit alongside the orthographic sentence, or at least the semicolon rate.

Who moved the periods is a separate question. The career slopes, which cannot exclude either a period effect or none, and the equal fit of birth year and publication year allow both a generational explanation (writers trained later used fewer semicolons) and a publishing one (houses and later editors repunctuated). Greg1950's distinction between a text's substantive readings and its accidentals is a reminder that punctuation is exactly what printers and editors felt free to change, which is the first limitation below.

## 7. Limitations

- **Editions.** Gutenberg texts are often later editions, and editors change punctuation. Gutenberg's *Wealth of Nations* reads "hurtful to the landlord; it is frequently hurtful to the tenant; and it is always hurtful to the community," where the 1776 first edition has a period after "landlord" and a comma after "tenant" (Smith1776). That semicolon is item 5 of the coded sample. In this one documented case the later edition added a semicolon where the original had a period, which would raise early semicolon counts and inflate the punctuation share. Its size and direction across the corpus are unknown.
- **Translations dated by the original.** A translation keeps the original's year but carries a translator's punctuation, often from a much later century. The translation flag is unreliable in both directions (Table 1), so translations cannot be cleanly removed, and their effect on the share is unknown.
- **Editorial apparatus.** Modern prefaces, editors' footnotes and glossaries are counted as period text; the coded sample includes some (an editor's footnote in Franklin, a glossary in *Gulliver's Travels*).
- **Model coding.** Both coders are runs of one model family; the first knew the hypothesis and the result; the 1900s sample has a single coder. A human coder, ideally a historical linguist, coding both samples blind is the most important check this paper lacks.
- **One glue rate for all books.** Each mark's rate comes from a pooled sample of 82 marks; it does not vary by book, author or genre.
- **Small early periods.** After deduplication, the 50-year periods before 1800 have 12 to 44 books, and the intervals are wide.
- **Start period.** 1700-1749 is the peak of P for the whole shelf but not for prose alone, where the 10 books from 1600-1649 run longer.
- **No recent books.** Only 67 dated books appeared after 1930.
- **Half the shelf is undated.** 1,073 of 1,959 books have a first-publication year; whether undated books differ is untested.
- **Today's taste.** The shelf is chosen by current download counts (Section 3).
- **Dialogue means double quotes.** Single-quote dialogue and plays are undercounted (Section 5.3).
- **Correlation only.** Nothing here establishes why writers or printers changed.

## 8. Data and code availability

Punc's counting code (TypeScript) and site are at https://github.com/JoeKarlsson/punc. The Python analysis scripts (standard library only), the per-book table (`analysis/books.csv`), both coded samples, the second coder's prompt and a ledger of every number from the original analysis (`analysis/RESULTS.md`) are in the repository's `analysis/` folder. The deduplication, the recomputed glue rates and Table 3 come from `paper/reanalysis.py` (its output is `paper/reanalysis-output.md`), and Table 1 from `paper/corpus_table.py`. The analysis used Punc at commit 66982de and Gutenberg's catalog downloaded 2026-11-10. A Zenodo deposit with a DOI will accompany submission.

## References

- Biber, D. and Conrad, S. (2009). Register, Genre, and Style. _Cambridge University Press eBooks_. [doi:10.1017/cbo9780511814358](https://doi.org/10.1017/cbo9780511814358)
- Biber, D. and Finegan, E. (1989). Drift and the Evolution of English Style: A History of Three Genres. _Language_. [doi:10.2307/415220](https://doi.org/10.2307/415220)
- Biber, D. and Gray, B. (2015). Grammatical Complexity in Academic English: Linguistic Change in Writing. _Cambridge University Press eBooks_. [doi:10.1017/cbo9780511920776](https://doi.org/10.1017/cbo9780511920776)
- Bruthiaux, P. (1995). The Rise and Fall of the Semicolon: English Punctuation Theory and English Teaching Practice. _Applied Linguistics_. [doi:10.1093/applin/16.1.1](https://doi.org/10.1093/applin/16.1.1)
- Cohen, J. (1960). A Coefficient of Agreement for Nominal Scales. _Educational and Psychological Measurement_. [doi:10.1177/001316446002000104](https://doi.org/10.1177/001316446002000104)
- Darmon, A. N. M. et al. (2020). Pull out all the stops: Textual analysis via punctuation sequences. _European Journal of Applied Mathematics_. [doi:10.1017/s0956792520000157](https://doi.org/10.1017/s0956792520000157)
- Domain, D. C. f. t. S. o. t. P. (2026). [Public Domain Day 2026](https://cspd.law.duke.edu/publicdomainday/2026). Retrieved 2026-11-21.
- Efron, B. (1979). Bootstrap Methods: Another Look at the Jackknife. _The Annals of Statistics_. [doi:10.1214/aos/1176344552](https://doi.org/10.1214/aos/1176344552)
- Fahnestock, J. (2011). Rhetorical Style: The Uses of Language in Persuasion. _Oxford University Press eBooks_. [doi:10.1093/acprof:oso/9780199764129.001.0001](https://doi.org/10.1093/acprof:oso/9780199764129.001.0001)
- Gerlach, M. and Font-Clos, F. (2020). A Standardized Project Gutenberg Corpus for Statistical Analysis of Natural Language and Quantitative Linguistics. _Entropy_. [doi:10.3390/e22010126](https://doi.org/10.3390/e22010126)
- Gilardi, F., Alizadeh, M. and Kubli, M. (2023). ChatGPT outperforms crowd workers for text-annotation tasks. _Proceedings of the National Academy of Sciences_. [doi:10.1073/pnas.2305016120](https://doi.org/10.1073/pnas.2305016120)
- Greg (1950). The Rationale of Copy-Text. _Studies in Bibliography 3, 19-36_.
- Hunt (1965). Grammatical Structures Written at Three Grade Levels.
- Kulig, A. et al. (2016). In narrative texts punctuation marks obey the same statistics as words. _Information Sciences_. [doi:10.1016/j.ins.2016.09.051](https://doi.org/10.1016/j.ins.2016.09.051)
- Lewis (1894). [The History of the English Paragraph](https://archive.org/stream/historyenglishp00lewigoog/historyenglishp00lewigoog_djvu.txt). Retrieved 2026-11-21.
- Liberman (2022). [Historical trends in English sentence length and syntactic complexity](https://languagelog.ldc.upenn.edu/myl/LibermanSHEL12.pdf). _Talk, SHEL 12 (Studies in the History of the English Language)_. Retrieved 2026-11-22.
- Muzny, G., Algee‐Hewitt, M. and Jurafsky, D. (2017). Dialogism in the novel: A computational model of the dialogic nature of narration and quotations. _Digital Scholarship in the Humanities_. [doi:10.1093/llc/fqx031](https://doi.org/10.1093/llc/fqx031)
- Nunberg (1990). The Linguistics of Punctuation.
- Oliver (2025). [The triumph of logical English](https://worksinprogress.co/issue/the-logical-triumph-of-english/). Retrieved 2026-11-21.
- Parkes (1992). Pause and Effect.
- Rudnicka, K. (2018). Variation of sentence length across time and genre: Influence on syntactic usage in English. _Studies in corpus linguistics_. [doi:10.1075/scl.85.10rud](https://doi.org/10.1075/scl.85.10rud)
- Ryder, N. B. (1965). The Cohort as a Concept in the Study of Social Change. _American Sociological Review_. [doi:10.2307/2090964](https://doi.org/10.2307/2090964)
- Sherman (1893). [Analytics of Literature: A Manual for the Objective Study of English Prose and Poetry](https://archive.org/details/analyticsofliter00sheruoft). Retrieved 2026-11-21.
- Smith (1776). [An inquiry into the nature and causes of the wealth of nations](https://archive.org/details/inquiryintonatur02smit_0). Retrieved 2026-11-22.
- Stanisz, T., Drożdż, S. and Kwapień, J. (2023). Universal versus system-specific features of punctuation usage patterns in major Western languages. _Chaos Solitons & Fractals_. [doi:10.1016/j.chaos.2023.113183](https://doi.org/10.1016/j.chaos.2023.113183)
- Törnberg (2023). [ChatGPT-4 outperforms experts and crowd workers in annotating political Twitter messages with zero-shot learning](https://arxiv.org/abs/2304.06588). Retrieved 2026-11-21.
- Underwood, T. et al. (2022). Cohort Succession Explains Most Change in Literary Culture. _Sociological Science_. [doi:10.15195/v9.a8](https://doi.org/10.15195/v9.a8)
- Vrandečić, D. and Krötzsch, M. (2014). Wikidata: a free collaborative knowledgebase. _Communications of the ACM_. [doi:10.1145/2629489](https://doi.org/10.1145/2629489)
- Watson (2019). Semicolon.
- Westin, I. (2002). Language Change in English Newspaper Editorials. _BRILL_. [doi:10.1163/9789004334007](https://doi.org/10.1163/9789004334007)
