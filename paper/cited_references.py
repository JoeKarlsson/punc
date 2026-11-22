"""Check that every citation in the draft ([@Key], @Key, [-@Key]) is a verified source in the citation map.
Pandoc's citeproc builds the reference list from the cited keys, so nothing uncited is listed.

Usage: python3 cited_references.py draft.md citation_map.json
"""
import json
import re
import sys

draft_path, map_path = sys.argv[1:3]
cited = set(re.findall(r"@([A-Za-z]+\d{4})\b", open(draft_path).read()))
missing = cited - set(json.load(open(map_path)))
assert not missing, f"cited but not in the citation map: {sorted(missing)}"
print(f"{len(cited)} cited sources, all in the citation map")
