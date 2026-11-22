# Figure sources

`chart-hand-coded` and `chart-every-count` come from the joekarlsson.com write-up's diagram scripts (`scripts/diagrams/sentence-length-semicolons-punctuation/` there), updated with the paper's numbers. `data.json` holds the 82 English-original coded marks (`paper/reanalysis.py`, `coded_marks`) and the weighted variants from `paper/*-output.md`.

To redraw: copy this folder into joekarlsson.com as `scripts/diagrams/punc-numbers/`, run `npm run diagrams -- punc-numbers` there, and copy the four SVGs from `public/images/projects/punc-numbers/` into `site/figures/`.
