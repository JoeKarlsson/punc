import json, math, re, statistics as st
MARKS = [',', '.', '"', "'", ';', ':', '-', '?', '!', '(']
def load(path): return json.load(open(path))
def hellinger(a, b): return math.sqrt(sum((math.sqrt(x) - math.sqrt(y)) ** 2 for x, y in zip(a, b)) / 2)
def avg(sets): return [sum(s[i] for s in sets) / len(sets) for i in range(len(sets[0]))]
def work_of(t): return re.sub(r',?\s*(Vol\.?|Volume|Volumes)\b.*$', '', t, flags=re.I).strip()
NOT_AUTHOR = re.compile(r'^(Various|Unknown|Anonymous)$')
def authors_with_works(books, min_works):
    by = {}
    for b in books:
        if NOT_AUTHOR.match(b['author']): continue
        by.setdefault(b['author'], []).append(b)
    return {a: l for a, l in by.items() if len({work_of(b['title']) for b in l}) >= min_works}
def guess_authors(authors, keep=None):
    """Punc's leave-one-out nearest-centroid test. keep: indexes of marks to use (renormalized)."""
    def fp(s):
        if keep is None: return s
        v = [s[i] for i in keep]; t = sum(v) or 1
        return [x / t for x in v]
    out = []
    for a, books in authors.items():
        for book in books:
            best = (None, math.inf)
            for o, obooks in authors.items():
                rest = [fp(b['shares']) for b in obooks if b is not book]
                d = hellinger(fp(book['shares']), avg(rest))
                if d < best[1]: best = (o, d)
            out.append((book, a, best[0]))
    return out
def period(y, width=50, lo=1600, hi=1974):
    if y is None or y < lo or y > hi: return None
    return lo + (y - lo) // width * width
