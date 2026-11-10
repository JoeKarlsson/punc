"""One row per book: books.csv.  python3 make_csv.py numbers.json measures2.json > books.csv"""
import sys, json, csv
N = json.load(open(sys.argv[1])); M = json.load(open(sys.argv[2]))
w = csv.writer(sys.stdout)
w.writerow(['slug', 'title', 'author', 'year', 'translated', 'author_birth_year', 'genres', 'download_rank', 'words', 'semicolons_per_1000', 'colons_per_1000', 'commas_per_1000', 'question_marks_per_1000', 'exclamation_marks_per_1000', 'dialogue_share', 'words_between_periods', 'words_between_stops'])
for b in sorted(N, key=lambda b: b['rank']):
    m = M.get(b['slug'], {})
    stops = round(1000 / (1000 / b['wps'] + b['semicolon'] + b['colon']), 2) if b.get('wps') else ''
    w.writerow([b['slug'], b['title'], b['author'], b['year'] if b['year'] is not None else '', int(bool(m.get('translated2'))), m.get('birth') if m.get('birth') is not None else '',
                '; '.join(b['genres']), b['rank'], b['words'], round(b['semicolon'], 2), round(b['colon'], 2), round(b['comma'], 2), round(b['question'], 2), round(b['exclaim'], 2),
                round(b['dialogue'], 3), round(b['wps'], 2) if b.get('wps') else '', stops])
