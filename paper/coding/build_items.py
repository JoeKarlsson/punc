"""Builds the blind coding page's items from the two samples: items.json, and the same list inlined in index.html.

Ids: a1-a100 are the 1700s sample (analysis/sample.txt), b1-b100 the 1900s sample (analysis/sample-1900s.txt).
The page shows only the passage, in a fixed shuffled order; no book, era label or model code.
Usage (from anywhere): python3 paper/coding/build_items.py
"""
import json
import random
import re
from pathlib import Path

HERE = Path(__file__).parent
ANALYSIS = HERE.parent.parent / "analysis"
LINE = re.compile(r"^\s*(\d+) ([;:]) \S+\s*\| ?(.*?) \[([;:])\] ?(.*)$")
START, END = "<!-- items:start -->", "<!-- items:end -->"


def read(path, prefix):
    items = []
    for line in path.read_text().splitlines()[1:]:
        n, mark, before, shown, after = LINE.match(line).groups()
        assert mark == shown, line
        items.append(dict(id=f"{prefix}{n}", mark=mark, before=before, after=after))
    assert [i["id"] for i in items] == [f"{prefix}{n}" for n in range(1, 101)], prefix
    return items


items = read(ANALYSIS / "sample.txt", "a") + read(ANALYSIS / "sample-1900s.txt", "b")
random.Random(2026).shuffle(items)
(HERE / "items.json").write_text(json.dumps(items, ensure_ascii=False, indent=1) + "\n")

page = HERE / "index.html"
html = page.read_text()
inline = json.dumps([[i["id"], i["mark"], i["before"], i["after"]] for i in items], ensure_ascii=False).replace("</", "<\\/")
html = re.sub(f"{START}.*?{END}", lambda _: f'{START}<script id="items" type="application/json">{inline}</script>{END}', html, flags=re.S)
page.write_text(html)
print(f"{len(items)} items written")
