# Prompt given to the second coder

A Claude agent (Claude Opus 5.5) got this prompt and two files: `sample.txt` (renamed set-a) and `sample-1900s.txt` (renamed set-b). It could not see Joe's codes. Its answers are in `second-coder-codes.json`.

> You are an independent coder for a small linguistics check. Do not look at any other files except the two below, and do not search for anyone else's codes.
>
> Each line: item number, the mark (; or :), the book slug, then about 110 characters of text before and after, with the mark itself shown as [;] or [:]. The first line of each file is a header, skip it.
>
> The question for every item: does this mark GLUE two clauses that could each stand alone as a sentence (so a modern writer could replace the mark with a period and start a new sentence)? Count a clause after the mark as standalone even if it opens with a coordinating word like and, but, for, nor, yet, so, or with however/therefore. Code NOT when what follows is: an item in a list or series (including a series of "that ..." clauses), a relative or subordinate clause or phrase (which, whose, because, when, if, even if, as often as), a fragment or participle phrase, a quotation the mark introduces, a list the mark introduces, or a heading, footnote, gloss, citation, ratio or other non-prose. If the context is too short to tell, make your best call and mark it UNSURE as well.
>
> Work carefully, item by item. Write your codes as {"set_a": {"1": "GLUE"|"NOT", ...}, "set_b": {...}, "unsure": {"set_a": [ids], "set_b": [ids]}} with all 100 items in each set.
