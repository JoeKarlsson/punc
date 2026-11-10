import sys, json, gzip, re, random, statistics as st
from punc_common import period
M = json.load(open(sys.argv[1])); d = sys.argv[2]
TR = re.compile(r'\btranslat(ed|ion|or)\b|\brendered into english\b|\bdone into english\b', re.I)
extra = 0
for s, r in M.items():
    head = gzip.open(f"{d}/{s}.txt.gz", 'rt', encoding='utf-8', errors='replace').read(6000)
    r['translated2'] = r['translated'] or bool(TR.search(head))
    extra += r['translated2'] and not r['translated']
print('extra flagged by title page', extra, 'total translated', sum(r['translated2'] for r in M.values()))
for s in ['candide','emile','a-discourse-upon-the-origin-and-the-foundation-of-the-inequality-among-mankind','kants-prolegomena-to-any-future-metaphysics','the-confessions-of-jean-jacques-rousseau-complete']:
    k=[x for x in M if x.startswith(s[:20])]; print(s[:30], [(x[:30], M[x]['translated2']) for x in k[:2]])
rows = [r for r in M.values() if r['year'] and r['all']['stops']]
def calc(bs, ws=1, wc=1, a=1700, z=1900):
    f = lambda r: r['all']['words']/r['all']['stops']; g = lambda r: r['all']['words']/(r['all']['stops']+ws*r['all']['semi']+wc*r['all']['colon'])
    A=[r for r in bs if period(r['year'])==a]; Z=[r for r in bs if period(r['year'])==z]
    return 1-(st.median(map(g,A))-st.median(map(g,Z)))/(st.median(map(f,A))-st.median(map(f,Z))), len(A), len(Z)
def ci(bs, **kw):
    random.seed(9); A=[r for r in bs if period(r['year'])==kw.get('a',1700)]; Z=[r for r in bs if period(r['year'])==1900]; v=[]
    for _ in range(1000):
        v.append(calc([random.choice(A) for _ in A]+[random.choice(Z) for _ in Z], **kw)[0])
    v.sort(); return f"[{v[25]:.0%},{v[975]:.0%}]"
eng = [r for r in rows if not r['translated2']]
for name, bs in [('all', rows), ('English originals (both checks)', eng)]:
    for a in (1700, 1750):
        e,na,nz = calc(bs, a=a); w,_,_ = calc(bs, .72, .58, a=a)
        print(f"{name:32} from {a}: unweighted {e:.0%} {ci(bs,a=a)}  weighted {w:.0%} {ci(bs,ws=.72,wc=.58,a=a)}  n={na}/{nz}")
json.dump(M, open('measures2.json','w'))
