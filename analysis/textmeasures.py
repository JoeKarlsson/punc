"""Per-book counts from the full texts, written to measures.json.
Adds: a stricter sentence splitter, narration-only counts (outside double quotes),
translator flag and author birth year from Gutenberg's pg_catalog.csv."""
import sys, gzip, re, json, csv, os
numbers, catalog, pgcsv, books_dir, out = sys.argv[1:6]
by_slug = {b['slug']: b for b in json.load(open(numbers))}
ids = {c['slug']: str(c['id']) for c in json.load(open(catalog))}
csv.field_size_limit(10**8)
pg = {r['Text#']: r for r in csv.DictReader(open(pgcsv, encoding='utf-8'))}
def people(slug):
    r = pg.get(ids.get(slug, ''), {}); a = r.get('Authors', '') or ''
    parts = [p.strip() for p in a.split(';') if p.strip()]
    translated = any('[Translator]' in p for p in parts)
    birth = None
    for p in parts:
        if '[' in p: continue
        m = re.search(r'(\d{1,4})\??\s*(BCE)?\s*-\s*\d', p) or re.search(r',\s*(\d{3,4})\??-$', p)
        if m:
            birth = -int(m.group(1)) if (m.lastindex and m.lastindex >= 2 and m.group(2)) else int(m.group(1)); break
    return translated, birth, r.get('Language', '')
FOLD = [(re.compile('[“”„«»]'), '"'), (re.compile('[‘’‚]'), "'"), (re.compile('[–—―]'), '-'), (re.compile('…'), '...')]
WORD = re.compile(r"[A-Za-z0-9À-ɏ]+(?:['’][A-Za-z]+)*")
RAWSTOP = re.compile(r'[.?!]+')
ABBR = re.compile(r"\b(?:Mr|Mrs|Messrs|Dr|St|Mt|Jr|Sr|Prof|Rev|Hon|Capt|Col|Gen|Lt|Sgt|Gov|Esq|vs|viz|etc|ch|chap|vol|No|p|pp|i\.e|e\.g|&c)\.|\b[A-Z]\.(?=\s*[A-Z])|\b[IVXLC]+\.(?=\s*$)", re.M)
TAG = re.compile(r'[?!]+[\'"]?\s*[\'"]?(?=\s+[a-z])')  # ?" he said / ! cried she: not an end
def strict_stops(t):
    t = ABBR.sub(' ', t)
    t = TAG.sub(' ', t)
    t = re.sub(r'\.{3,}', ' ', t)  # ellipses are not ends
    return len(RAWSTOP.findall(t))
def split_quotes(text):
    inside, outside = [], []
    for para in re.split(r'\n\s*\n', text):
        parts = para.split('"')
        for i, seg in enumerate(parts): (inside if i % 2 else outside).append(seg)
    return '\n'.join(inside), '\n'.join(outside)
res = {}
for slug, b in by_slug.items():
    p = os.path.join(books_dir, slug + '.txt.gz')
    if not os.path.exists(p): continue
    t = gzip.open(p, 'rt', encoding='utf-8', errors='replace').read()
    for rx, rep in FOLD: t = rx.sub(rep, t)
    ins, outs = split_quotes(t)
    tr, birth, lang = people(slug)
    def c(x): return dict(words=len(WORD.findall(x)), stops=len(RAWSTOP.findall(x)), semi=x.count(';'), colon=x.count(':'))
    res[slug] = dict(year=b['year'], genres=b['genres'], author=b['author'], translated=tr, birth=birth, lang=lang,
                     all=c(t), strict=strict_stops(t), narr=c(outs), narr_strict=strict_stops(outs),
                     dash_runs=len(re.findall(r'(?<!-)-{2,}(?!-)|(?<=\s)-(?=\s)', t)))
json.dump(res, open(out, 'w'))
print('books', len(res), 'translated', sum(r['translated'] for r in res.values()), 'with birth', sum(r['birth'] is not None for r in res.values()))
