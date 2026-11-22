"""Write the draft's References section: the lines of references.md for sources the draft cites.

Usage: python3 cited_references.py draft.md citation_map.json references.md
"""
import json
import re
import sys

draft_path, map_path, refs_path = sys.argv[1:4]
draft = open(draft_path).read()
citation_map = json.load(open(map_path))
cited = {k for k in citation_map if re.search(rf"\b{k}\b", draft.split("## References")[0])}
lines = [line for line in open(refs_path) if line.startswith("- ")]
kept = [line for line in lines if any(citation_map[k]["title"] in line for k in cited)]
assert len(kept) == len(cited), f"{len(kept)} reference lines for {len(cited)} cited keys"
body, _ = draft.split("## References")
open(draft_path, "w").write(body + "## References\n\n" + "".join(kept))
print(f"{len(kept)} references")
