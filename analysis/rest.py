import sys, statistics as st, collections
from punc_common import *
books = load(sys.argv[1])
# career slopes: authors with >=5 dated books spanning >=20 years
by = collections.defaultdict(list)
for b in books:
    if b['year'] and b['year'] >= 1600 and not NOT_AUTHOR.match(b['author']): by[b['author']].append(b)
def slope(pts):
    mx = st.mean(x for x,_ in pts); my = st.mean(y for _,y in pts); d = sum((x-mx)**2 for x,_ in pts)
    return 10*sum((x-mx)*(y-my) for x,y in pts)/d if d else 0
car = []
for a, l in by.items():
    ys = [b['year'] for b in l]
    if len(l) >= 5 and max(ys)-min(ys) >= 20: car.append((a, len(l), min(ys), max(ys), round(slope([(b['year'], b['semicolon']) for b in l]),2)))
car.sort(key=lambda r: r[4])
for r in car: print(r)
print('authors', len(car), 'down', sum(r[4]<0 for r in car), 'up', sum(r[4]>0 for r in car), 'median', st.median(r[4] for r in car))
# popularity: Spearman with rank
def ranks(v):
    o = sorted(range(len(v)), key=lambda i: v[i]); r = [0]*len(v)
    i = 0
    while i < len(o):
        j = i
        while j+1 < len(o) and v[o[j+1]] == v[o[i]]: j += 1
        for k in range(i, j+1): r[o[k]] = (i+j)/2
        i = j+1
    return r
def spearman(x, y):
    rx, ry = ranks(x), ranks(y); mx, my = st.mean(rx), st.mean(ry)
    return sum((a-mx)*(b-my) for a,b in zip(rx,ry))/ (sum((a-mx)**2 for a in rx)*sum((b-my)**2 for b in ry))**.5
rk = [b for b in books if b.get('rank') and b.get('wps')]
print('n ranked', len(rk))
for k in ['question','exclaim','dialogue','semicolon','comma','colon','dash','marks','wps']:
    print(k, round(spearman([b['rank'] for b in rk], [b[k] for b in rk]),3))
top = sorted(rk, key=lambda b: b['rank'])[:200]; bot = sorted(rk, key=lambda b: b['rank'])[-200:]
for k in ['question','exclaim','dialogue']: print(k, 'top200', round(st.median(b[k] for b in top),2), 'bottom200', round(st.median(b[k] for b in bot),2))
# genre medians
g = collections.defaultdict(list)
for b in books:
    for x in b['genres']: g[x].append(b)
for x, l in sorted(g.items(), key=lambda kv: -st.median(b['exclaim'] for b in kv[1])):
    m = lambda k: st.median(b[k] for b in l if b.get(k) is not None)
    print(f"{x:30} {len(l):4} wps {m('wps'):.1f} ! {m('exclaim'):.1f} ? {m('question'):.1f} ; {m('semicolon'):.1f} dlg {m('dialogue'):.0%}")
