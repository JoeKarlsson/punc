import sys, json, random, statistics as st
from punc_common import period
M = json.load(open(sys.argv[1]))
rows = [dict(slug=s, **r) for s, r in M.items() if r['year'] and r['all']['words'] > 0 and r['all']['stops'] > 0]
def wps(c, stops=None): return c['words'] / (stops if stops is not None else c['stops'])
def between(c, stops=None, extra=0): return c['words'] / ((stops if stops is not None else c['stops']) + c['semi'] + c['colon'] + extra)
V = {
 'base (Punc periods)':          (lambda r: wps(r['all']), lambda r: between(r['all'])),
 'strict splitter':              (lambda r: wps(r['all'], r['strict']), lambda r: between(r['all'], r['strict'])),
 'semicolons only':              (lambda r: wps(r['all']), lambda r: r['all']['words']/(r['all']['stops']+r['all']['semi'])),
 'dashes count too':             (lambda r: wps(r['all']), lambda r: between(r['all'], extra=r['dash_runs'])),
 'narration only':               (lambda r: wps(r['narr']) if r['narr']['stops'] else None, lambda r: between(r['narr']) if r['narr']['stops'] else None),
 'narration, strict':            (lambda r: wps(r['narr'], r['narr_strict']) if r['narr_strict'] else None, lambda r: between(r['narr'], r['narr_strict']) if r['narr_strict'] else None),
}
SUBSETS = {'all': lambda r: True, 'English originals': lambda r: not r['translated'],
           'English originals, no plays/poetry': lambda r: not r['translated'] and not {'Plays','Poetry'} & set(r['genres'])}
def calc(bs, f, g, a, z):
    A = [b for b in bs if period(b['year']) == a]; Z = [b for b in bs if period(b['year']) == z]
    fa=[f(b) for b in A if f(b)]; fz=[f(b) for b in Z if f(b)]; ga=[g(b) for b in A if g(b)]; gz=[g(b) for b in Z if g(b)]
    dw = st.median(fa)-st.median(fz); du = st.median(ga)-st.median(gz)
    return 1-du/dw, (st.median(fa), st.median(fz), st.median(ga), st.median(gz)), len(A), len(Z)
def ci(bs, f, g, a, z, n=1000):
    random.seed(3); A=[b for b in bs if period(b['year'])==a]; Z=[b for b in bs if period(b['year'])==z]; v=[]
    for _ in range(n):
        s=[random.choice(A) for _ in A]+[random.choice(Z) for _ in Z]
        try: v.append(calc(s,f,g,a,z)[0])
        except Exception: pass
    v.sort(); return v[int(.025*len(v))], v[int(.975*len(v))]
for sn, sf in SUBSETS.items():
    bs=[r for r in rows if sf(r)]
    for vn,(f,g) in V.items():
        for a in (1700,1750):
            e,meds,na,nz=calc(bs,f,g,a,1900); lo,hi=ci(bs,f,g,a,1900)
            print(f"{sn:36} {vn:22} from {a}: {e:4.0%} [{lo:.0%},{hi:.0%}] n={na}/{nz} periods {meds[0]:.1f}->{meds[1]:.1f} stops {meds[2]:.1f}->{meds[3]:.1f}")
# full series for narration vs all, between-stops
print('\nperiod, n, all periods, all between-stops, narration periods, narration between-stops, dialogue share of words')
for p in range(1600,1975,50):
    bs=[r for r in rows if period(r['year'])==p and r['narr']['stops']]
    print(p,len(bs), *[round(st.median(x),1) for x in ([wps(r['all']) for r in bs],[between(r['all']) for r in bs],[wps(r['narr']) for r in bs],[between(r['narr']) for r in bs])], f"{st.median(1-r['narr']['words']/r['all']['words'] for r in bs):.0%}")
