# Search plan: punctuation and the decline of English sentence length

Target: Journal of Cultural Analytics (article), with an arXiv preprint. Cutoff: 2026-11.

Paper question: how much of the measured decline in English sentence length (1700-1949) is a change in punctuation, i.e. periods taking over the clause-joining job of semicolons and colons?

## Context (10-20 sources)

- **The sentence-length claim, historically.** Sherman 1893, Lewis 1894; how far the "sentences got shorter" story travels.
  - "Lucius Sherman Analytics of Literature sentence length"; "Edwin Lewis History of the English Paragraph"; "eighteenth century English prose style sentence length"
- **History and theory of punctuation.** Rhetorical (elocutionary) vs grammatical (syntactic) punctuation; the semicolon's history.
  - "Parkes Pause and Effect history of punctuation"; "Bruthiaux rise and fall of the semicolon"; "Nunberg linguistics of punctuation"; "Watson Semicolon history"
- **Editing and accidentals.** Editors and printers change punctuation; copy-text theory.
  - "Greg rationale of copy-text accidentals"
- **Cultural analytics and the corpus.** Project Gutenberg as a research corpus; large-scale literary measurement.
  - "Standardized Project Gutenberg Corpus"; "Underwood Distant Horizons"; "Michel 2011 culturomics Google Books"

## Related work (3 clusters, 30-50 sources overall)

### R1. Measuring diachronic change in sentence length
- Find: corpus studies of sentence length over time in English (COHA, newspapers, scientific prose, presidential addresses), and the T-unit as an alternative unit.
- Limitation hypothesis: they count orthographic sentences (ending at . ? !), name punctuation as a confound, but don't measure how much of the decline it explains, especially 1700-1900, when semicolons peaked.
- Queries: "Rudnicka sentence length across time and genre"; "Westin newspaper editorials"; "Biber Finegan drift English style"; "Biber Gray grammatical complexity historical"; "dependency length Royal Society Corpus"; "Hunt T-unit"
- Bridge: two units (words between periods vs between stops) over the same 954 books; the gap between them is the measured punctuation share, weighted by hand-coded rates of clause-joining.

### R2. Quantitative study of punctuation
- Find: statistical properties of punctuation; punctuation frequency over time (Ngram); punctuation across languages and translation.
- Limitation hypothesis: describes distributions or uses punctuation as a feature; doesn't connect punctuation change to the sentence-length trend.
- Queries: "Darmon pull out all the stops punctuation sequences"; "Stanisz punctuation Weibull major Western languages"; "Kulig punctuation statistics words"; "semicolon frequency decline Ngram"
- Bridge: per-book semicolon and colon rates linked directly to the sentence-length decomposition.

### R3. Style, authorship, cohort and dialogue
- Find: stylometry with function words and punctuation; cohort vs period explanations of cultural change; the rise of dialogue in fiction.
- Limitation hypothesis: punctuation-based attribution uses rich features (sequences); cohort analyses haven't been applied to punctuation.
- Queries: "Mosteller Wallace Federalist"; "Burrows Delta"; "Stamatatos survey authorship attribution"; "Underwood cohort succession literary culture"; "Ryder cohort concept social change"; "Muzny dialogism in the novel"
- Bridge: a ten-mark share fingerprint as a floor for what punctuation alone carries; birth year vs publication year for the semicolon.

## Tools and data

- Project Gutenberg; Wikidata (Vrandečić and Krötzsch 2014)
- Bootstrap (Efron 1979); Cohen's kappa (Cohen 1960); Hellinger distance; Spearman rank correlation
- LLM-assisted annotation and its reliability (the coding was done by Claude): Gilardi et al. 2023; Törnberg 2023; later caveats

## Named sources (already cited in the blog post)

Sherman 1893; Lewis 1894; Fahnestock 2011; Biber and Conrad 2009; Rudnicka 2018; Westin 2002; Hunt 1965; Babbel 2025; Oliver 2025; Smith 1776; Muzny et al. 2017; Darmon et al. 2021; Underwood et al. 2022; Mosteller and Wallace 1964; Burrows 2002; Stanford Literary Lab Pamphlet 5; Calhoun 2016; Rougeux; Duke CSPD 2026.
