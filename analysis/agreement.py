"""Agreement between the two coders on the 1700s sample, glue rates, and the weighted estimate.
python3 agreement.py second-coder-codes.json measures2.json"""
import sys, json, random, statistics as st
from punc_common import period
B = json.load(open(sys.argv[1])); M = json.load(open(sys.argv[2]))
# Joe's codes for sample.txt: these items do NOT glue two clauses (see sample-coded.md)
NOT = {9,10,14,16,17,20,25,33,36,38,39,40,47,52,54,56,60,61,62,63,64,66,67,74,75,76,79,80,83,89,92,96,99,100}
mine = {k: k not in NOT for k in range(1, 101)}; theirs = {int(k): v == 'GLUE' for k, v in B['set_a'].items()}
po = sum(mine[k] == theirs[k] for k in mine) / 100
pm, pt = sum(mine.values()) / 100, sum(theirs.values()) / 100
pe = pm * pt + (1 - pm) * (1 - pt)
print('agreement', round(po * 100), '/100, kappa', round((po - pe) / (1 - pe), 2), 'disagree', [k for k in mine if mine[k] != theirs[k]])
b = {int(k): v == 'GLUE' for k, v in B['set_b'].items()}
s17, c17 = (sum(mine[k] for k in range(1, 61)) + sum(theirs[k] for k in range(1, 61))) / 120, (sum(mine[k] for k in range(61, 101)) + sum(theirs[k] for k in range(61, 101))) / 80
s19, c19 = sum(b[k] for k in range(1, 61)) / 60, sum(b[k] for k in range(61, 101)) / 40
print('glue rates 1700s ;', round(s17, 3), ':', round(c17, 3), '| 1900s ;', round(s19, 3), ':', round(c19, 3))
rows = [r for r in M.values() if r['year'] and r['all']['stops']]
def est(bs, w):
    A = [r for r in bs if period(r['year']) == 1700]; Z = [r for r in bs if period(r['year']) == 1900]
    f = lambda r: r['all']['words'] / r['all']['stops']
    g = lambda r, ws, wc: r['all']['words'] / (r['all']['stops'] + ws * r['all']['semi'] + wc * r['all']['colon'])
    return 1 - (st.median(g(r, *w[0]) for r in A) - st.median(g(r, *w[1]) for r in Z)) / (st.median(map(f, A)) - st.median(map(f, Z)))
for name, w in [("Joe's rates", ((.72, .58), (.72, .58))), ('both coders, 1700s rates', ((s17, c17), (s17, c17))), ('era-specific rates', ((s17, c17), (s19, c19)))]:
    random.seed(4); A = [r for r in rows if period(r['year']) == 1700]; Z = [r for r in rows if period(r['year']) == 1900]
    v = sorted(est([random.choice(A) for _ in A] + [random.choice(Z) for _ in Z], w) for _ in range(1000))
    print(name, f"{est(rows, w):.0%} [{v[25]:.0%}, {v[975]:.0%}]")
