"""The generations model with intervals from resampling authors, not books (an author's books aren't independent).
python3 cohort_by_author.py measures.json ../site-dist/numbers.json"""
import sys, json, random, collections
M = json.load(open(sys.argv[1])); N = {b['slug']: b for b in json.load(open(sys.argv[2]))}
rows = [(r['year'], r['birth'], N[s]['semicolon'], r['author']) for s, r in M.items()
        if r['year'] and r['birth'] and not r['translated'] and 1750 <= r['year'] <= 1974 and 15 <= r['year'] - r['birth'] <= 90]
def ols(X, y):
    k = len(X[0]); A = [[sum(x[i] * x[j] for x in X) for j in range(k)] for i in range(k)]; b = [sum(x[i] * v for x, v in zip(X, y)) for i in range(k)]
    for i in range(k):
        p = A[i][i]; A[i] = [a / p for a in A[i]]; b[i] /= p
        for r in range(k):
            if r != i:
                f = A[r][i]; A[r] = [a - f * c for a, c in zip(A[r], A[i])]; b[r] -= f * b[i]
    return b
by = collections.defaultdict(list)
for r in rows: by[r[3]].append(r)
authors = list(by); fit = ols([[1, p / 100, bi / 100] for p, bi, _, _ in rows], [x for *_, x, _ in rows])
print('books', len(rows), 'authors', len(authors), 'per century: publication', round(fit[1], 2), 'birth', round(fit[2], 2))
random.seed(5); bp, bb = [], []
for _ in range(1000):
    s = [r for a in (random.choice(authors) for _ in authors) for r in by[a]]
    b = ols([[1, p / 100, bi / 100] for p, bi, _, _ in s], [x for *_, x, _ in s]); bp.append(b[1]); bb.append(b[2])
bp.sort(); bb.sort(); print('95% resampling authors: publication', round(bp[25], 2), round(bp[975], 2), '| birth', round(bb[25], 2), round(bb[975], 2))
