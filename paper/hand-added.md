# Books added to the shelf by hand

**Answer: none of the analyzed books is on the shelf only because it was added by hand.**

The shelf is Gutenberg's top 2,000 English texts by downloads in the last 30 days, plus three books listed by hand in `EXTRA_IDS` in `site/scripts/fetch-books.mjs`:

```js
// Books kept on the shelf even when they drop out of the top list
const EXTRA_IDS = ['1079', '12242', '67138'];
```

That line has not changed since the shelf was created (`git log -G"EXTRA_IDS =" -- site/scripts/fetch-books.mjs` returns only bef83cc, 2026-11-05). In `analysis/books.csv`, the snapshot the paper uses, all three were inside the top 2,000 on their own, so they would have been included anyway:

| Gutenberg id | Book | Year | Period | `download_rank` in books.csv |
| --- | --- | ---: | --- | ---: |
| 1079 | Tristram Shandy | 1759 | 1750-1799 | 436 |
| 12242 | Emily Dickinson, Poems | 1890 | 1850-1899 | 357 |
| 67138 | The Sun Also Rises | 1926 | 1900-1949 | 768 |

The highest rank in books.csv is 2,000 (1,959 rows, after the filters below), which fits a shelf drawn from the top list alone.

## Hand-made exclusions and dates

What the shelf does by hand is mostly removal:

- `REPEAT_EDITIONS`: 13 Gutenberg ids dropped as other editions or parts of books already on the shelf. The 16 duplicates that `paper/reanalysis.py` removes are ones this list missed.
- `NOT_PROSE`: 1 id (302, a list of Fibonacci numbers).
- `SKIP_SHELVES`: Gutenberg bookshelves matching Encyclopedias, Dictionaries, Reference, or Language & Communication are skipped by rule.
- `PUBLISHED`: first-publication years for some books were set by hand, checked against Wikidata or the title page. Other books take Wikidata's date or have none. This affects which period a book falls in, not whether it is on the shelf.

Found by reading `site/scripts/fetch-books.mjs`, `site/catalog.json` (ids to slugs) and `analysis/books.csv`.
