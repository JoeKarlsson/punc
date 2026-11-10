import sys, json, random, statistics as st
from punc_common import *
books = load(sys.argv[1]); M = json.load(open(sys.argv[2]))
authors = authors_with_works(books, 3)
acc = lambda g: sum(1 for _, a, x in g if a == x) / len(g)
print('base', f"{acc(guess_authors(authors)):.1%}")
# genre-preserving null: shuffle author labels only among books with the same genre set
allb = [b for l in authors.values() for b in l]; lab = {id(b): a for a, l in authors.items() for b in l}
strata = {}
for b in allb: strata.setdefault(tuple(sorted(b['genres'])), []).append(b)
random.seed(11); res = []
for _ in range(10):
    sh = {}
    for grp in strata.values():
        ls = [lab[id(b)] for b in grp]; random.shuffle(ls)
        for b, a in zip(grp, ls): sh.setdefault(a, []).append(b)
    res.append(acc(guess_authors(sh)))
print('genre-preserving shuffle', f"mean {st.mean(res):.1%} max {max(res):.1%}")
# English originals only
eng = {a: [b for b in l if not M[b['slug']]['translated']] for a, l in authors.items()}
eng = {a: l for a, l in eng.items() if len(l) >= 3}
g = guess_authors(eng); print('English originals only', len(eng), 'authors', len(g), 'books', f"{acc(g):.1%}", 'chance', f"{1/len(eng):.1%}")
tr = {a: l for a, l in authors.items() if all(M[b['slug']]['translated'] for b in l)}
print('fully translated authors', len(tr), sorted(tr)[:15])
