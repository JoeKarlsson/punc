# /// script
# dependencies = ["matplotlib"]
# ///
"""Figure 1: median words between periods, between stops, and between weighted stops, by period (duplicates removed).

Usage (from paper/): uv run figure1.py ../analysis/books.csv
Writes figure1.pdf and figure1.png next to this script.
"""
import statistics
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

from reanalysis import between, dedupe, load_books, period

# English-original glue rates from the first coder: 36 of 50 semicolons, 19 of 32 colons.
SEMICOLON_RATE, COLON_RATE = 36 / 50, 19 / 32
PERIODS = range(1600, 2000, 50)

books, _ = dedupe(load_books(sys.argv[1]))
rows = []
for p in PERIODS:
    group = [b for b in books if period(b["year"]) == p]
    rows.append(dict(
        midpoint=1962 if p == 1950 else p + 25, books=len(group),
        periods=statistics.median(b["words"] / b["stops"] for b in group),
        stops=statistics.median(between(b, 1, 1) for b in group),
        weighted=statistics.median(between(b, SEMICOLON_RATE, COLON_RATE) for b in group)))

# Must match Table 2 in reanalysis-output.md.
assert [r["books"] for r in rows] == [20, 12, 17, 44, 91, 284, 445, 25], [r["books"] for r in rows]
assert [round(r["periods"], 1) for r in rows][2] == 31.1 and round(rows[6]["weighted"], 1) == 13.6

plt.rcParams.update({"font.family": "serif", "font.size": 9, "axes.spines.top": False, "axes.spines.right": False})
fig, ax = plt.subplots(figsize=(6.5, 3.8))
x = [r["midpoint"] for r in rows]
series = (("periods", "Words between periods (. ? !)", "-", "o", "black"),
          ("weighted", "Words between weighted stops", "--", "s", "0.35"),
          ("stops", "Words between stops (. ? ! ; :)", ":", "^", "0.55"))
for key, label, style, marker, color in series:
    y = [r[key] for r in rows]
    ax.plot(x, y, linestyle=style, marker=marker, color=color, linewidth=1.5, markersize=5, label=label)
for r in rows:
    ax.annotate(f"n={r['books']}", (r["midpoint"], r["periods"]), textcoords="offset points", xytext=(0, 7),
                ha="center", fontsize=7, color="0.3")
ax.set_xticks(x, [f"{p}–{p + 49 if p < 1950 else 1974}" for p in PERIODS], rotation=30, ha="right")
ax.set_xlabel("Period of first publication")
ax.set_ylabel("Median words per sentence-ending mark")
ax.set_ylim(0, 35)
ax.grid(axis="y", color="0.9", linewidth=0.6)
ax.legend(frameon=False, loc="upper right")
fig.tight_layout()
out = Path(__file__).parent
fig.savefig(out / "figure1.pdf")
fig.savefig(out / "figure1.png", dpi=300)
print("\n".join(f"{r['midpoint']} n={r['books']} {r['periods']:.1f} {r['stops']:.1f} {r['weighted']:.1f}" for r in rows))
