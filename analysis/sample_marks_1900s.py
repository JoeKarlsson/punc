"""100 random semicolons and colons from English-original prose books dated 1900-1949 (seed 1900).
python3 sample_marks_1900s.py measures2.json <site-dist/books> > sample-1900s.txt"""
import sys, json, gzip, random, re
M = json.load(open(sys.argv[1])); d = sys.argv[2]
pool = [s for s, r in M.items() if r['year'] and 1900 <= r['year'] < 1950 and not r['translated2'] and not {'Plays', 'Poetry'} & set(r['genres'])]
random.seed(1900); out, cache = [], {}
def text(s):
    if s not in cache: cache[s] = re.sub(r'\s+', ' ', gzip.open(f"{d}/{s}.txt.gz", 'rt', encoding='utf-8', errors='replace').read())
    return cache[s]
for mark, n in ((';', 60), (':', 40)):
    got = 0
    while got < n:
        s = random.choice(pool); t = text(s); pos = [m.start() for m in re.finditer(re.escape(mark), t)]
        if not pos: continue
        p = random.choice(pos); out.append((mark, s, t[max(0, p - 110):p] + ' [' + mark + '] ' + t[p + 1:p + 110])); got += 1
print(f"{len(pool)} books"); print('\n'.join(f"{k:3} {m} {s[:28]:28} | {c}" for k, (m, s, c) in enumerate(out, 1)))
