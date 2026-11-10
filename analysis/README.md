# Analysis behind "Are English sentences getting shorter?"

The scripts, samples and numbers behind the blog post [Are English sentences getting shorter? About 40% of the drop is punctuation](https://www.joekarlsson.com/blog/sentence-length-semicolons-punctuation/). Every number in the post is in `RESULTS.md`, and `books.csv` has one row per book.

Python 3 standard library only. The data is Punc's own build output plus Project Gutenberg's catalog:

```bash
npm run site:build                     # writes site-dist/numbers.json and site-dist/books/*.txt.gz
cd analysis
curl -O https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv   # translators and author birth years
```

The post used Punc at commit `66982de` and the Gutenberg catalog downloaded 2026-11-10.

| Script | What it does |
|---|---|
| `sentence_units.py ../site-dist/numbers.json` | Words between periods and words between stops by 50-year period (the main table) |
| `textmeasures.py ../site-dist/numbers.json ../site/catalog.json pg_catalog.csv ../site-dist/books measures.json` | Per-book counts from the full texts: a stricter sentence splitter, narration only, translator flag, author birth year |
| `weighted_and_translations.py measures.json ../site-dist/books` | Adds a title-page translation check (writes `measures2.json`) and the weighted estimate |
| `robustness.py measures.json` | The share of the drop that disappears, every way of counting, with bootstrap intervals |
| `timeseries.py ../site-dist/numbers.json` | 25-year medians: semicolons, commas, dialogue, question marks; genre subsets |
| `cohort.py measures.json ../site-dist/numbers.json` | Semicolons on publication year and author birth year |
| `cohort_by_author.py measures.json ../site-dist/numbers.json` | The same model with intervals from resampling authors (the ones the post reports) |
| `rest.py ../site-dist/numbers.json` | Career slopes, popularity correlations, genre medians |
| `attribution.py ../site-dist/numbers.json` | Punc's author test, a shuffled-label baseline, leave one mark out |
| `attribution_genre.py ../site-dist/numbers.json measures2.json` | The genre-preserving baseline and English originals only |
| `arc.py ../site-dist/numbers.json ../site-dist/books` | Question and exclamation marks by tenth of a book |
| `sample_marks.py measures.json ../site-dist/books`, `sample_marks_1900s.py measures2.json ../site-dist/books` | The hand-coded samples (seeds 42 and 1900) |
| `agreement.py second-coder-codes.json measures2.json` | Agreement between the two coders and the weighted estimate with each era's rates |
| `make_csv.py ../site-dist/numbers.json measures2.json > books.csv` | The per-book table |

`sample-coded.md` has the first-pass codes for the 1700s sample (Claude, in the analysis session). `second-coder-codes.json` has the blind second coder's codes (a Claude agent given only the contexts and the rule) for both samples, and `second-coder-prompt.md` is the exact prompt. `chart-data.json` holds the numbers the post's charts are drawn from.
