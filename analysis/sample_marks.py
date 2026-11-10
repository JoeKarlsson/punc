import sys, json, gzip, random, re
M = json.load(open(sys.argv[1])); d = sys.argv[2]
pool = [s for s, r in M.items() if r['year'] and 1700 <= r['year'] < 1800 and not r['translated'] and not {'Plays','Poetry'} & set(r['genres'])]
random.seed(42); out = []
texts = {s: re.sub(r'\s+', ' ', gzip.open(f"{d}/{s}.txt.gz", 'rt', encoding='utf-8', errors='replace').read()) for s in pool}
for mark, n in ((';', 60), (':', 40)):
    for i in range(n):
        s = random.choice(pool); t = texts[s]; pos = [m.start() for m in re.finditer(re.escape(mark), t)]
        if not pos: continue
        p = random.choice(pos); out.append((mark, s, t[max(0,p-110):p] + ' [' + mark + '] ' + t[p+1:p+110]))
print(len(pool), 'books')
for k, (m, s, c) in enumerate(out, 1): print(f"{k:3} {m} {s[:28]:28} | {c}")
