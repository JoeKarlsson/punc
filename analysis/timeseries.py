import sys, random, statistics as st
from punc_common import *
books = [b for b in load(sys.argv[1]) if b.get('wps')]
def unit(b): return 1000 / (1000 / b['wps'] + b['semicolon'] + b['colon'])
def share_explained(bs, a=1700, z=1900):
    A = [b for b in bs if period(b['year']) == a]; Z = [b for b in bs if period(b['year']) == z]
    if len(A) < 3 or len(Z) < 3: return None, len(A), len(Z)
    dw = st.median(b['wps'] for b in A) - st.median(b['wps'] for b in Z)
    du = st.median(unit(b) for b in A) - st.median(unit(b) for b in Z)
    return 1 - du / dw, len(A), len(Z)
def boot(bs, n=2000):
    random.seed(7); A = [b for b in bs if period(b['year']) == 1700]; Z = [b for b in bs if period(b['year']) == 1900]
    vals = []
    for _ in range(n):
        s = [random.choice(A) for _ in A] + [random.choice(Z) for _ in Z]
        v, *_ = share_explained(s); vals.append(v)
    vals.sort(); return vals[int(.025*n)], vals[int(.975*n)]
sets = {
 'all': books,
 'no plays/poetry': [b for b in books if not {'Plays','Poetry'} & set(b['genres'])],
 'fiction only (no plays/poetry/philosophy/history)': [b for b in books if not {'Plays','Poetry','Philosophy and ideas','History and lives'} & set(b['genres'])],
 'nonfiction only': [b for b in books if {'Philosophy and ideas','History and lives'} & set(b['genres'])],
}
for k, bs in sets.items():
    v, na, nz = share_explained(bs)
    ci = boot(bs) if v is not None and na >= 5 else None
    print(f"{k}: explained {v:.0%} (n {na} vs {nz}) CI {ci[0]:.0%}..{ci[1]:.0%}" if v is not None and ci else f"{k}: {v} n {na} {nz}")
# alternate baseline 1750-99 -> 1900-49 (bigger early group)
for k, bs in sets.items():
    v, na, nz = share_explained(bs, 1750, 1900); print('from 1750', k, f"{v:.0%}" if v else v, na, nz)
print('\n25-yr medians: n, semicolon/1k, semicolon share of marks, comma/1k, marks/1k, dialogue, ?/1k, !/1k')
rows = {}
for b in books:
    p = period(b['year'], 25)
    if p is not None: rows.setdefault(p, []).append(b)
for p in sorted(rows):
    r = rows[p]; m = lambda f: st.median(f(b) for b in r)
    print(p, len(r), round(m(lambda b: b['semicolon']),1), f"{m(lambda b: b['shares'][4]):.3f}", round(m(lambda b: b['comma']),1), round(m(lambda b: b['marks']),1), f"{m(lambda b: b['dialogue']):.0%}", round(m(lambda b: b['question']),1), round(m(lambda b: b['exclaim']),1))
# least-squares slope of semicolons since 1800 per decade
xs = [(b['year'], b['semicolon']) for b in books if b['year'] and 1800 <= b['year'] <= 1974]
mx = st.mean(x for x,_ in xs); my = st.mean(y for _,y in xs)
print('slope/decade since 1800', round(10*sum((x-mx)*(y-my) for x,y in xs)/sum((x-mx)**2 for x,_ in xs),2), 'n', len(xs))
