import sys, collections, random
from punc_common import *
books = load(sys.argv[1])
authors = authors_with_works(books, 3)
g = guess_authors(authors)
right = sum(1 for _, a, x in g if a == x)
print(f"authors {len(authors)} books {len(g)} right {right} = {right/len(g):.1%}; chance 1/{len(authors)} = {1/len(authors):.2%}")
# majority baseline: always guess the author with the most books
big = max(authors, key=lambda a: len(authors[a])); print('always-guess', big, len(authors[big]), f"{len(authors[big])/len(g):.1%}")
per = collections.defaultdict(lambda: [0, 0])
for _, a, x in g: per[a][1] += 1; per[a][0] += a == x
for a in ['Plato','William Shakespeare','Agatha Christie','Friedrich Wilhelm Nietzsche','Arthur Conan Doyle','Mark Twain','Charles Dickens','Oscar Wilde','G. K. Chesterton']:
    k = [n for n in per if a.split()[-1] in n]; print(a, [(n, per[n]) for n in k])
print('dickens went to', collections.Counter(x for _, a, x in g if a == 'Charles Dickens').most_common())
# permutation null: shuffle author labels across the 708 books, rerun (20 runs)
random.seed(1)
allb = [b for l in authors.values() for b in l]; labels = [a for a, l in authors.items() for _ in l]
null = []
for r in range(20):
    random.shuffle(labels); sh = {}
    for b, a in zip(allb, labels): sh.setdefault(a, []).append(b)
    gg = guess_authors(sh); null.append(sum(1 for _, a, x in gg if a == x) / len(gg))
print(f"shuffled labels: mean {st.mean(null):.1%} max {max(null):.1%}")
# leave one mark out
for i, m in enumerate(MARKS):
    keep = [j for j in range(10) if j != i]
    gg = guess_authors(authors, keep); print('without', m, f"{sum(1 for _, a, x in gg if a == x)/len(gg):.1%}")
