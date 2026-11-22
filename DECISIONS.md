# Decisions

Joe's verdicts on Punc's design and data, newest first. Read before changing what they cover.

## 2026-11-22: modern books on the main shelf and the numbers page (option A)

- **One shelf.** Modern books sit on the main shelf with the Gutenberg books; "Most read" takes turns between the two lists, each in its own order (Gutenberg downloads, Wikipedia languages). A "From" menu narrows to Project Gutenberg or 1930 on. Chosen over a separate "Since 1930" row below the Gutenberg shelf (option B).
- **The numbers page shows the modern books' data**: a faint dot per modern book on the over-time charts behind the pink decade line, and modern books in compare any two, the full table, authors and records. The map, the twins, and the written findings and the paper's numbers stay Gutenberg only.

## 2026-11-22: every matched modern novel, not just the best known

- **The modern shelf takes every Wikidata novel from 1930–2010 that matched a HathiTrust volume well** (6,388), not only the best known (2,927). More books steady the decade line; the shelf is no longer only famous books. Same rules: no late editions, nothing under 20,000 words, one page per scanned volume.

## 2026-11-22: fingerprints for modern books

- **Modern books get fingerprints and all ten marks.** Counted character by character the way Punc counts a text (brackets decoded from -LRB-/-RRB-, `` and '' as quotes), a novel's HathiTrust fingerprint is typically 18% of the gap between two shelf books from its Punc fingerprint, and finds its own book first of 2,456 for 10 of 17 test novels. Dashes run about a fifth high (cause not confirmed). Twins and the map stay off: the error is often bigger than the gap to a book's twin, and the map spot moves more than 10% for 7 of 17.

## 2026-11-22: the modern shelf (HathiTrust)

- **Modern books get their own book page, cut to what the counts support** (option A of the round 1 mockup, over a numbers-page table only). The page has words per sentence, the marks the counts support (all ten since the fingerprint verdict above), a page-by-page chart, a table against both shelves' medians, a typographic cover (real covers are copyrighted) and a note that Punc never had the text. No score, spiral, Pages view or twins.
- **Modern books stay off the map.** A book's spot needs colons and dashes, which OCR garbles; for 7 of 17 test novels the spot moved more than 10%.
- **Only books with a good match:** skip HathiTrust matches whose only edition came 15+ years after first publication, and books under 20,000 words.
- **The numbers page gets two decade charts** (semicolons per 1,000 words and words per sentence, Gutenberg to the 1920s, HathiTrust from the 1930s).

## 2026-11-21: marks, not texts

- Book texts never go in git or on the site. Each book is analyzed once at import into `site/marks/`; the site ships only marks and measures. `site/books` was purged from history on 2026-11-22.
