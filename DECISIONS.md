# Decisions

Joe's verdicts on Punc's design and data, newest first. Read before changing what they cover.

## 2026-11-22: the modern shelf (HathiTrust)

- **Modern books get their own book page, cut to what the counts support** (option A of the round 1 mockup, over a numbers-page table only). The page has the five reliable marks (commas, periods, semicolons, question marks, exclamation marks), words per sentence, a page-by-page chart, a table against both shelves' medians, a typographic cover (real covers are copyrighted) and a note that Punc never had the text. No score, spiral, Pages view or twins.
- **Modern books stay off the map.** A book's spot needs colons and dashes, which OCR garbles; for 7 of 17 test novels the spot moved more than 10%.
- **Only books with a good match:** skip HathiTrust matches whose only edition came 15+ years after first publication, and books under 20,000 words.
- **The numbers page gets two decade charts** (semicolons per 1,000 words and words per sentence, Gutenberg to the 1920s, HathiTrust from the 1930s).

## 2026-11-21: marks, not texts

- Book texts never go in git or on the site. Each book is analyzed once at import into `site/marks/`; the site ships only marks and measures. `site/books` was purged from history on 2026-11-22.
