# Literature review: punctuation and the decline of English sentence length

Cites only keys in `citation_map.json`. Marks: **[abstract]** checked against the abstract only; **[full text]** checked in the full text; **[secondary]** known only through another source's summary, cited as such; **[record]** a book or page whose existence is verified but whose content is described from general knowledge or the project's earlier reading. Claims marked [record] or [secondary] should be checked against the source before submission.

## Context

**The claim.** Counting words per sentence by hand, Sherman1893 found much longer sentences in Elizabethan prose than in Macaulay [full text: the 1893 table, p. 259, read for the blog post], and Lewis1894 put the decline at "at least one-half in three hundred years" [full text, quoted in the blog post]. The claim has been repeated since and was revived with Google Books data by Babbel2025 [record: press release], an instance of the Ngram-style trend reading that Michel2010 introduced [abstract].

**Punctuation's own history.** Punctuation moved over these centuries from marking pauses for reading aloud toward marking grammatical structure (Parkes1992 [record]; Nunberg1990 [record] gives the grammatical account in which the semicolon and colon separate clause-level units). Bruthiaux1995 traces four hundred years of semicolon use in one genre and argues that "after flourishing in the seventeenth and eighteenth centuries, the semicolon may have become a marginal component of the English punctuation system" [abstract]. Watson2019 gives a cultural history of the mark and its rules [record].

**Editors.** Since Greg1950, textual scholars have distinguished a text's "accidentals" (spelling, punctuation) from its substantive readings, and expected printers and later editors to change the accidentals freely [record]. Any corpus built from modern digital editions inherits that problem.

**The corpus.** Project Gutenberg is the most-used free corpus for statistical work on English, but studies usually rest on small hand-picked subsets with varied preprocessing, which Gerlach2020 identifies as a reproducibility problem [abstract]. Underwood2019 shows what two centuries of literary change look like when measured at the scale of thousands of volumes [record].

## R1. Measuring the decline in sentence length

**What is known.** Rudnicka2018 tests "a widely held assumption that sentence length in written English has been steadily decreasing" in the Corpus of Historical American English [abstract], and reviews the objection that part of the trend is punctuation, citing Fahnestock2011's suggestion that it may be "a by-product of changing punctuation conventions" and Biber2009's note on "a much more extensive use of colons and semicolons in earlier historical periods" [secondary, both via Rudnicka2018's full text]. Rudnicka also reports "a dramatic decrease in the frequency of use of semicolons happening between 1810 and 1900" [full text]. Westin2002, studying British newspaper editorials 1900-1993 [abstract], counted sentences with and without semicolons and colons as boundaries and found nearly the same trend [secondary, via Rudnicka2018]. Liberman2022 asks whether the perceived trend should instead be titled "Historical trends in English punctuation practices" [full text: the talk's abstract]. Oliver2025 makes the same argument for a general audience [full text]. Register studies put the decline in a larger frame: Biber1989 traces fiction, essays and letters from a relatively oral seventeenth century to a literate eighteenth and back toward oral styles [abstract], and Biber2015 shows that the complexity of written English moved from clauses to phrases, so shorter sentences need not mean simpler prose [abstract]. Hunt1965's T-unit, a main clause with what hangs off it, is the linguist's alternative to the orthographic sentence [record].

**The gap.** Everyone names punctuation as a confound; nobody has measured how much of the decline it accounts for over 1700-1900, when semicolons were common. Westin's test covers the twentieth century, when, by Bruthiaux1995's account, the semicolon was already marginal, so a null result there is what the punctuation explanation predicts.

**This project.** Two units on the same 954 dated books: words between sentence-final marks and words between stops (adding semicolons and colons, a crude T-unit). The gap between them over time is the punctuation share, and a hand-coded sample of marks corrects for semicolons and colons that don't join independent clauses.

## R2. Punctuation as data

**What is known.** Kulig2016 shows that in narrative texts punctuation marks behave statistically like the most frequent words [record: arXiv summary]. Stanisz2023 finds that the spacing between punctuation marks follows a discrete Weibull distribution with language-specific parameters [record: arXiv summary]. Darmon2020 treats punctuation sequences as a stylometric signal across Project Gutenberg [abstract] and, in the full text, reports that semicolon use falls "less noticeably" than other changes in their sample [full text, read for the blog post].

**The gap.** This work describes how punctuation is distributed or uses it as a feature; none of it connects the change in punctuation to the sentence-length trend.

**This project.** Per-book semicolon and colon rates feed the sentence-length decomposition directly, and the disagreement with Darmon2020 about the semicolon's decline is examined (units, dating by author lifetime, corpus slice).

## R3. Style, generations and dialogue

**What is known.** Authorship attribution from function-word rates goes back to Mosteller1964 [record]; Burrows2002's Delta made most-frequent-word distance standard [abstract]; Stamatatos2008 surveys the field [abstract]. Underwood2022 finds that in 10,830 works of fiction 1880-1999, "slightly more than half (54.7 percent) of the variance explained by time is explained better by an author's year of birth than by a book's year of publication" [abstract], extending Ryder1965's account of cohort succession as a mechanism of social change [record]. Muzny2017 measures dialogue in 1,100 novels and finds it rising [abstract mentions the corpus; the trend is from the full text, read for the blog post]. Allison2013 shows how hard sentence-level style is to measure, opening with its authors' disagreement [full text].

**The gap.** Cohort-versus-period analysis hasn't been applied to punctuation, and the rise in dialogue is a ready alternative explanation for shorter sentences that sentence-length studies rarely remove.

**This project.** Narration-only counts with every quoted passage removed; a joint model of semicolon rate on publication year and author birth year with author-level resampling.

## Tools and methods

Dates from Wikidata (Vrandecic2014 [abstract]); bootstrap intervals (Efron1979 [abstract]); Cohen's kappa (Cohen1960 [record]). The marks were coded by a large language model. Gilardi2023 found ChatGPT's zero-shot annotation more accurate than crowd workers on four tasks [abstract], and Tornberg2023 reports the same against experts for political tweets [record: title]. Neither covers grammatical coding of historical prose, so this paper treats the model coding as provisional until checked against a human coder.

## Precursors (art)

Rougeux2016's posters of novels reduced to their punctuation [record] preceded Punc. Calhoun's 2016 essay "Punctuation in novels" also did, but its page couldn't be fetched by the checker, so it isn't cited until verified.
