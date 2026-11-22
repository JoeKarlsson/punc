#!/bin/sh
# Build the paper: draft.md -> paper.tex (arXiv source) and paper.pdf.
# Needs pandoc and tectonic (brew install pandoc tectonic). Run from anywhere.
set -eu
cd "$(dirname "$0")"
python3 cited_references.py draft.md citation_map.json
# --columns=200 keeps pipe tables at their natural widths instead of wrapping cells.
common="--from=markdown+autolink_bare_uris --metadata-file=metadata.yaml --lua-filter=paper.lua --citeproc --shift-heading-level-by=-1 --columns=200"
pandoc draft.md $common --standalone -o paper.tex
pandoc draft.md $common --pdf-engine=tectonic -o paper.pdf
echo "wrote paper.tex and paper.pdf"
