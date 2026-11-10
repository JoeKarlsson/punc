"""Words per sentence vs words per unit (counting ; and : as ends), by 50-year period."""
import json, statistics as st, sys
books = json.load(open(sys.argv[1]))
def period(y):
    if y is None or y < 1600 or y > 1974: return None
    s = 1600 + (y - 1600) // 50 * 50
    return (s, min(s + 49, 1974))
rows = {}
for b in books:
    p = period(b.get('year'))
    if not p or not b.get('wps'): continue
    stops = 1000 / b['wps']
    unit = 1000 / (stops + b['semicolon'] + b['colon'])
    rows.setdefault(p, []).append((b['wps'], unit))
print('period n wps unit')
for p in sorted(rows):
    r = rows[p]
    print(f"{p[0]}-{p[1]} {len(r)} {st.median(x for x,_ in r):.1f} {st.median(u for _,u in r):.1f}")
print('total dated', sum(len(v) for v in rows.values()))
