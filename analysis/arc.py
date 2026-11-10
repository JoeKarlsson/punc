import sys, gzip, re, json, statistics as st, os
books = {b['slug']: b for b in json.load(open(sys.argv[1]))}; d = sys.argv[2]
WORD = re.compile(r"[A-Za-z0-9À-ɏ]+(?:['’][A-Za-z]+)?")
HEAD = re.compile(r'^\s*(CHAPTER|Chapter|BOOK|Book|PART|Part|ACT|Act|STAVE|LETTER|Letter)\s+([IVXLC]+|\d+|ONE|One|THE FIRST|I)\b', re.M)
def tenths(text):
    words = list(WORD.finditer(text)); n = len(words)
    if n < 20000: return None
    out = []
    for k in range(10):
        a = words[n*k//10].start(); z = words[min(n*(k+1)//10, n-1)].start()
        seg = text[a:z]; w = n//10
        out.append(1000 * (seg.count('?') + seg.count('!')) / w)
    return out
raw, trim, trimmed_n = [], [], 0
for slug in books:
    p = os.path.join(d, slug + '.txt.gz')
    if not os.path.exists(p): continue
    t = gzip.open(p, 'rt', encoding='utf-8', errors='replace').read()
    r = tenths(t)
    if not r: continue
    raw.append(r)
    m = HEAD.search(t)
    if m and m.start() < len(t) * 0.15:
        # skip a table of contents: if another heading follows within 3% of text, take the LAST of the early run
        starts = [x.start() for x in HEAD.finditer(t[: int(len(t)*0.15)])]
        s = starts[0]
        for a, b in zip(starts, starts[1:]):
            if b - a < len(t) * 0.01: s = b
        tt = tenths(t[s:]); 
        if tt: trim.append(tt); trimmed_n += 1; continue
    trim.append(r)
print('books', len(raw), 'trimmed', trimmed_n)
print('raw  ', [round(st.median(r[k] for r in raw),1) for k in range(10)])
print('trim ', [round(st.median(r[k] for r in trim),1) for k in range(10)])
