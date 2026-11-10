import sys, json, random, statistics as st
M = json.load(open(sys.argv[1])); N = {b['slug']: b for b in json.load(open(sys.argv[2]))}
rows = [(r['year'], r['birth'], N[s]['semicolon']) for s, r in M.items()
        if r['year'] and r['birth'] and not r['translated'] and 1750 <= r['year'] <= 1974 and 15 <= r['year'] - r['birth'] <= 90]
print('books', len(rows))
def ols(X, y):
    # tiny normal-equations solver
    import itertools
    k = len(X[0]); XtX = [[sum(x[i]*x[j] for x in X) for j in range(k)] for i in range(k)]; Xty = [sum(x[i]*yy for x, yy in zip(X, y)) for i in range(k)]
    for i in range(k):
        p = XtX[i][i]
        for j in range(k): XtX[i][j] /= p
        Xty[i] /= p
        for r in range(k):
            if r != i:
                f = XtX[r][i]
                for j in range(k): XtX[r][j] -= f * XtX[i][j]
                Xty[r] -= f * Xty[i]
    return Xty
def r2(X, y, b):
    my = st.mean(y); pred = [sum(bi*xi for bi, xi in zip(b, x)) for x in X]
    return 1 - sum((a-p)**2 for a, p in zip(y, pred)) / sum((a-my)**2 for a in y)
y = [s for _, _, s in rows]
for name, X in [('pub year', [[1, p/100] for p, _, _ in rows]), ('birth year', [[1, b/100] for _, b, _ in rows]), ('both', [[1, p/100, b/100] for p, b, _ in rows])]:
    b = ols(X, y); print(f"{name:10} coef/century {[round(c,2) for c in b[1:]]} R2 {r2(X, y, b):.3f}")
# bootstrap the joint coefficients
random.seed(5); bp, bb = [], []
for _ in range(1000):
    s = [random.choice(rows) for _ in rows]; b = ols([[1, p/100, bi/100] for p, bi, _ in s], [x for _, _, x in s]); bp.append(b[1]); bb.append(b[2])
bp.sort(); bb.sort(); print('joint 95%: pub', round(bp[25],2), round(bp[975],2), 'birth', round(bb[25],2), round(bb[975],2))
