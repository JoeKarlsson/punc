"""Feeding the second coder's codes through score.py must reproduce the paper's agreement and rates.
Run: python3 paper/coding/test_score.py"""
import contextlib
import io
import json
import tempfile
from pathlib import Path

import score

blind = json.load(open(score.ANALYSIS / "second-coder-codes.json"))
with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False) as f:
    f.write("id,code,unsure\n")
    for s, key in (("a", "set_a"), ("b", "set_b")):
        for n in range(1, 101):
            f.write(f"{s}{n},{blind[key][str(n)]},{int(n in blind['unsure'][key])}\n")
out = io.StringIO()
with contextlib.redirect_stdout(out):
    score.main(f.name)
Path(f.name).unlink()
text = out.getvalue()
for expected in ("Human vs first coder, 1700s: 95/100 agree (95%), kappa 0.89",
                 "English originals (82): semicolons 34/50 (68%), colons 18/32 (56%)",
                 "rates: 39% (first coder's 36/50 and 19/32 give 40%)"):
    assert expected in text, (expected, text)
print("ok")
