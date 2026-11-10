// The numbers page: measures across the whole shelf, and their charts. Every
// measure comes from the marks (counted against words or sentences); year,
// genre, author and download rank only group the books. The build renders
// the charts; numbers-page.ts reuses the comparison markup in the browser.

import { countWords } from '../../src/text';
import { TRACKED_MARKS, fingerprintHTML, markShares, niceAxis, shelfPosition } from './patterns';

export type MetricKey = 'semicolon' | 'comma' | 'colon' | 'dash' | 'exclaim' | 'question' | 'marks' | 'wps' | 'dialogue';

export interface Metric {
  key: MetricKey;
  label: string;
  // How a value reads in a sentence: "12.3 semicolons per 1,000 words"
  unit: string;
}

export const METRICS: Metric[] = [
  { key: 'semicolon', label: 'Semicolons', unit: 'semicolons per 1,000 words' },
  { key: 'comma', label: 'Commas', unit: 'commas per 1,000 words' },
  { key: 'colon', label: 'Colons', unit: 'colons per 1,000 words' },
  { key: 'dash', label: 'Dashes and hyphens', unit: 'dashes and hyphens per 1,000 words' },
  { key: 'exclaim', label: 'Exclamation marks', unit: 'exclamation marks per 1,000 words' },
  { key: 'question', label: 'Question marks', unit: 'question marks per 1,000 words' },
  { key: 'marks', label: 'All marks', unit: 'marks per 1,000 words' },
  { key: 'wps', label: 'Words per sentence', unit: 'words per sentence' },
  { key: 'dialogue', label: 'Dialogue', unit: 'of the words inside quotation marks' },
];

export const metric = (key: MetricKey): Metric => METRICS.find(m => m.key === key)!;

export function formatValue(key: MetricKey, value: number): string {
  return key === 'dialogue' ? `${Math.round(value * 100)}%` : value.toFixed(1);
}

export const describeValue = (key: MetricKey, value: number) => `${formatValue(key, value)} ${metric(key).unit}`;

export interface BookNumbers extends Record<MetricKey, number> {
  slug: string;
  title: string;
  author: string;
  year: number | null;
  yearLabel: string | null;
  genres: string[];
  rank: number | null;
  words: number;
  // Fingerprint shares, in TRACKED_MARKS order
  shares: number[];
  // Where it sits on the map (shelfPosition)
  pausesPerStop: number;
  loudness: number;
}

export interface BookMeta {
  slug: string;
  title: string;
  author: string;
  publishedSort: number | null;
  published: string | null;
  genres: string[];
  rank: number | null;
}

// Dashes count once per run, so "--" is one dash. Runs of four or more are
// rules and table borders, not punctuation, and don't count.
export function countDashes(text: string): number {
  return (text.match(/-+/g) ?? []).filter(run => run.length <= 3).length;
}

// Share of a book's words inside quotation marks. A book quotes with double
// marks or with single ones; whichever opens more quotes is taken as its
// style. Single marks are told from apostrophes by where they sit: one opens
// after a space and before a letter, and closes after a mark (.,!?;:-) and
// before a space. A quote left open at a paragraph's end closes there, as a
// new paragraph of the same speech opens its own.
export function dialogueShare(text: string): number {
  const total = countWords(text);
  if (total === 0) return 0;
  const doubles = (text.match(/"/g) ?? []).length / 2;
  const singles = (text.match(/(^|[\s(-])'(?=[A-Za-z])/gm) ?? []).length;
  let quoted = 0;
  for (const paragraph of text.split(/\n\s*\n/)) {
    if (doubles >= singles) {
      paragraph.split('"').forEach((part, i) => {
        if (i % 2 === 1) quoted += countWords(part);
      });
      continue;
    }
    let start = -1;
    for (let i = 0; i < paragraph.length; i++) {
      if (paragraph[i] !== "'") continue;
      const before = paragraph[i - 1] ?? ' ';
      const after = paragraph[i + 1] ?? ' ';
      if (start < 0 && /[\s(-]/.test(before) && /[A-Za-z]/.test(after)) start = i + 1;
      else if (start >= 0 && /[.,!?;:-]/.test(before) && /[\s)-]/.test(after)) {
        quoted += countWords(paragraph.slice(start, i));
        start = -1;
      }
    }
    if (start >= 0) quoted += countWords(paragraph.slice(start));
  }
  return Math.min(quoted / total, 1);
}

export function bookNumbers(
  analysis: { text: string; marks: string[]; wordCount: number; wordsPerSentence: number },
  meta: BookMeta
): BookNumbers {
  const counts = new Map<string, number>();
  for (const m of analysis.marks) counts.set(m, (counts.get(m) ?? 0) + 1);
  const words = Math.max(analysis.wordCount, 1);
  const per1000 = (n: number) => (n / words) * 1000;
  return {
    slug: meta.slug,
    title: meta.title,
    author: meta.author,
    year: meta.publishedSort,
    yearLabel: meta.published,
    genres: meta.genres,
    rank: meta.rank,
    words: analysis.wordCount,
    shares: markShares(analysis.marks),
    ...shelfPosition(analysis.marks),
    semicolon: per1000(counts.get(';') ?? 0),
    comma: per1000(counts.get(',') ?? 0),
    colon: per1000(counts.get(':') ?? 0),
    dash: per1000(countDashes(analysis.text)),
    exclaim: per1000(counts.get('!') ?? 0),
    question: per1000(counts.get('?') ?? 0),
    marks: per1000(analysis.marks.length),
    wps: analysis.wordsPerSentence,
    dialogue: dialogueShare(analysis.text),
  };
}

export function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

const mean = (values: number[]) => values.reduce((s, v) => s + v, 0) / Math.max(values.length, 1);

export interface TrendPoint {
  from: number;
  to: number;
  books: number;
  value: number;
}

// The median of a measure in each `step`-year span from `from` to `to`, for
// spans with at least `minBooks` books.
export function trend(books: BookNumbers[], key: MetricKey, from: number, to: number, step = 25, minBooks = 3): TrendPoint[] {
  const points: TrendPoint[] = [];
  for (let start = from; start < to; start += step) {
    const inSpan = books.filter(b => b.year !== null && b.year >= start && b.year < start + step).map(b => b[key]);
    if (inSpan.length >= minBooks) points.push({ from: start, to: start + step, books: inSpan.length, value: median(inSpan) });
  }
  return points;
}

// Spearman's rank correlation, ties given their average rank.
export function spearman(xs: number[], ys: number[]): number {
  const ranks = (values: number[]) => {
    const order = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
    const r = new Array<number>(values.length);
    for (let i = 0; i < order.length; ) {
      let j = i;
      while (j + 1 < order.length && order[j + 1]![0] === order[i]![0]) j++;
      for (let k = i; k <= j; k++) r[order[k]![1]] = (i + j) / 2;
      i = j + 1;
    }
    return r;
  };
  const rx = ranks(xs);
  const ry = ranks(ys);
  const mx = mean(rx);
  const my = mean(ry);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < rx.length; i++) {
    num += (rx[i]! - mx) * (ry[i]! - my);
    dx += (rx[i]! - mx) ** 2;
    dy += (ry[i]! - my) ** 2;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}

// How different two fingerprints are, from 0 (the same) to 1 (no mark in
// common): the Hellinger distance between the two sets of shares.
export function fingerprintDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (Math.sqrt(a[i]!) - Math.sqrt(b[i]!)) ** 2;
  return Math.sqrt(sum / 2);
}

export const averageShares = (sets: number[][]) => TRACKED_MARKS.map((_, i) => mean(sets.map(s => s[i]!)));

// Each book's closest fingerprint on the shelf, by slug.
export function twins(books: BookNumbers[]): Map<string, { twin: BookNumbers; distance: number }> {
  const result = new Map<string, { twin: BookNumbers; distance: number }>();
  for (const a of books) {
    let best: { twin: BookNumbers; distance: number } | undefined;
    for (const b of books) {
      if (a === b) continue;
      const distance = fingerprintDistance(a.shares, b.shares);
      if (!best || distance < best.distance) best = { twin: b, distance };
    }
    if (best) result.set(a.slug, best);
  }
  return result;
}

// Pairs that are each other's closest fingerprint, by different authors,
// furthest apart in time first.
export function surprisingTwins(books: BookNumbers[], count = 6): Array<[BookNumbers, BookNumbers]> {
  const closest = twins(books);
  const pairs: Array<[BookNumbers, BookNumbers]> = [];
  for (const a of books) {
    const b = closest.get(a.slug)!.twin;
    if (a.slug < b.slug && closest.get(b.slug)!.twin === a && a.author !== b.author && a.year !== null && b.year !== null) pairs.push([a, b]);
  }
  return pairs.sort(([a, b], [c, d]) => Math.abs(d.year! - c.year!) - Math.abs(b.year! - a.year!)).slice(0, count);
}

// One work per title, volumes of the same work counted once.
const workOf = (title: string) => title.replace(/,?\s*(Vol\.?|Volume|Volumes)\b.*$/i, '').trim();
const NOT_AN_AUTHOR = /^(Various|Unknown|Anonymous)$/;

// Authors with at least `minWorks` different works on the shelf, most first.
export function authorsWithWorks(books: BookNumbers[], minWorks: number): Array<{ author: string; books: BookNumbers[] }> {
  const byAuthor = new Map<string, BookNumbers[]>();
  for (const b of books) {
    if (NOT_AN_AUTHOR.test(b.author)) continue;
    byAuthor.set(b.author, [...(byAuthor.get(b.author) ?? []), b]);
  }
  return [...byAuthor]
    .filter(([, list]) => new Set(list.map(b => workOf(b.title))).size >= minWorks)
    .map(([author, list]) => ({ author, books: list }))
    .sort((a, b) => b.books.length - a.books.length || a.author.localeCompare(b.author));
}

// The typical distance between two books on the shelf, the yardstick for how
// alike an author's books are.
export function typicalDistance(books: BookNumbers[]): number {
  const distances: number[] = [];
  for (let i = 0; i < books.length; i++) for (let j = i + 1; j < books.length; j++) distances.push(fingerprintDistance(books[i]!.shares, books[j]!.shares));
  return median(distances);
}

// How far an author's books sit from their own average fingerprint, against
// the typical distance between two books on the shelf (100).
export function authorSpread(books: BookNumbers[], typical: number): number {
  const center = averageShares(books.map(b => b.shares));
  return (mean(books.map(b => fingerprintDistance(b.shares, center))) / typical) * 100;
}

export interface Guess {
  book: BookNumbers;
  guessed: string;
}

// Leave one book out, average each author's other books, and guess the
// author whose average is closest to the book's fingerprint.
export function guessAuthors(authors: Array<{ author: string; books: BookNumbers[] }>): Guess[] {
  const guesses: Guess[] = [];
  for (const { books } of authors) {
    for (const book of books) {
      let best = { author: '', distance: Infinity };
      for (const other of authors) {
        const rest = other.books.filter(b => b !== book);
        const distance = fingerprintDistance(book.shares, averageShares(rest.map(b => b.shares)));
        if (distance < best.distance) best = { author: other.author, distance };
      }
      guesses.push({ book, guessed: best.author });
    }
  }
  return guesses;
}

export const hitRate = (guesses: Guess[]) => guesses.filter(g => g.guessed === g.book.author).length / Math.max(guesses.length, 1);

// The author test again with one tracked mark left out of every fingerprint
// (the other shares rescaled to add up to 1): how much each mark carries.
export function hitRateWithout(authors: Array<{ author: string; books: BookNumbers[] }>): Array<{ mark: string; name: string; rate: number }> {
  return TRACKED_MARKS.map(({ mark, name }, dropped) => {
    const without = (shares: number[]) => {
      const kept = shares.map((s, i) => (i === dropped ? 0 : s));
      const total = kept.reduce((sum, s) => sum + s, 0);
      return total > 0 ? kept.map(s => s / total) : kept;
    };
    const rate = hitRate(guessAuthors(authors.map(a => ({ author: a.author, books: a.books.map(b => ({ ...b, shares: without(b.shares) })) }))));
    return { mark, name, rate };
  });
}

// Two-mark clusters with nothing between them, like ?" or ,' : counts by
// cluster. Runs over four long (rules, rows of dots) are left out.
export function touchingClusters(text: string): Map<string, number> {
  const clusters = new Map<string, number>();
  for (const run of text.match(/[,.;:!?"'()-]{2,4}(?![,.;:!?"'()-])/g) ?? []) {
    if (/^-+$/.test(run)) continue;
    clusters.set(run, (clusters.get(run) ?? 0) + 1);
  }
  return clusters;
}

// For each tracked mark, the share of times each tracked mark comes next
// (words between don't matter). Rows are the mark before, in TRACKED_MARKS
// order; ")" counts as "(".
export function nextMarkShares(marks: string[]): number[][] {
  const index = new Map(TRACKED_MARKS.map(({ mark }, i) => [mark, i]));
  const at = (m: string) => index.get(m === ')' ? '(' : m);
  const counts = TRACKED_MARKS.map(() => TRACKED_MARKS.map(() => 0));
  for (let i = 1; i < marks.length; i++) {
    const a = at(marks[i - 1]!);
    const b = at(marks[i]!);
    if (a !== undefined && b !== undefined) counts[a]![b]!++;
  }
  return counts.map(row => {
    const total = row.reduce((s, n) => s + n, 0);
    return row.map(n => (total ? n / total : 0));
  });
}

const escapeHTML = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r1 = (n: number) => n.toFixed(1);
export const yearText = (b: { year: number | null; yearLabel: string | null }) => b.yearLabel ?? (b.year === null ? 'no year' : String(b.year));
const bookTip = (b: BookNumbers, key: MetricKey) => `${b.title}, ${b.author} (${yearText(b)}): ${describeValue(key, b[key])}`;

// The axis top for a measure: high enough for nearly every book, so one
// outlier doesn't flatten the rest. Books above it sit on the top edge.
function axisFor(values: number[], key: MetricKey) {
  const sorted = [...values].sort((a, b) => a - b);
  const top = sorted[Math.floor(sorted.length * 0.98)] ?? 0;
  return niceAxis((key === 'dialogue' ? top * 100 : top) * 1.08, 5);
}
const scaled = (key: MetricKey, v: number) => (key === 'dialogue' ? v * 100 : v);
const tickText = (key: MetricKey, v: number) => (key === 'dialogue' ? `${v}%` : String(v));

export const TIMELINE_FROM = 1600;
export const TIMELINE_TO = 1975;

const linePath = (points: Array<[number, number]>) => points.map(([x, y], i) => `${i ? 'L' : 'M'}${r1(x)} ${r1(y)}`).join('');

const TIMELINE = { W: 520, H: 300, L: 48, R: 14, T: 14, B: 34 };
const timelineBooks = (books: BookNumbers[]) => books.filter(b => b.year !== null && b.year >= TIMELINE_FROM && b.year < TIMELINE_TO);
const timelineX = (year: number) => TIMELINE.L + ((year - TIMELINE_FROM) / (TIMELINE_TO - TIMELINE_FROM)) * (TIMELINE.W - TIMELINE.L - TIMELINE.R);
// A value's height in a chart frame; values over the axis top sit on it.
const valueY = (frame: { H: number; T: number; B: number }, key: MetricKey, axisMax: number) => (v: number) =>
  frame.H - frame.B - (Math.min(scaled(key, v), axisMax) / axisMax) * (frame.H - frame.T - frame.B);

// One measure over time: the median line for every 25 years, and a line for
// each genre, hidden until the genre picker shows it. The dots, one per dated
// book from TIMELINE_FROM on, are drawn in the browser (timelineDots) into the
// empty .chart-dots group, which carries the measure and the axis top.
export function timelineSVG(books: BookNumbers[], key: MetricKey, genres: string[]): string {
  const { W, H, L, R } = TIMELINE;
  const dated = timelineBooks(books);
  const axis = axisFor(dated.map(b => b[key]), key);
  const y = valueY(TIMELINE, key, axis.max);
  const tickY = (v: number) => y(key === 'dialogue' ? v / 100 : v);
  const grid = [
    ...axis.ticks.map(v => `<line class="chart-grid" x1="${L}" x2="${W - R}" y1="${r1(tickY(v))}" y2="${r1(tickY(v))}"/><text class="chart-tick" x="${L - 8}" y="${r1(tickY(v) + 5)}" text-anchor="end">${tickText(key, v)}</text>`),
    ...[1600, 1700, 1800, 1900].map(year => `<text class="chart-tick" x="${r1(timelineX(year))}" y="${H - 10}" text-anchor="middle">${year}</text>`),
  ].join('');
  // Every book's line needs five books in a span, so the thin 1600s don't
  // swing it; a genre's needs three, or most genres would have no line.
  const line = (list: BookNumbers[], className: string, genre?: string) => {
    const points = trend(list, key, TIMELINE_FROM, TIMELINE_TO, 25, genre ? 3 : 5).map(p => [timelineX((p.from + p.to) / 2), y(p.value)] as [number, number]);
    return points.length > 1 ? `<path class="${className}"${genre ? ` data-genre="${escapeHTML(genre)}"` : ''} d="${linePath(points)}"/>` : '';
  };
  const genreLines = genres.map(g => line(dated.filter(b => b.genres.includes(g)), 'chart-line chart-line-genre', g)).join('');
  // Sentence length also gets a dotted line counting ; and : as stops.
  const clauseLine = key === 'wps' ? line(asClauses(dated), 'chart-line chart-line-clause') : '';
  const m = metric(key);
  return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHTML(`${m.label} over time, ${dated.length} books from ${TIMELINE_FROM} on: ${trendSentence(books, key)}`)}">${grid}<g class="chart-dots" data-metric="${key}" data-max="${axis.max}"></g>${clauseLine}${line(dated, 'chart-line chart-line-all')}${genreLines}</svg>`;
}

export function timelineDots(books: BookNumbers[], key: MetricKey, axisMax: number): string {
  const y = valueY(TIMELINE, key, axisMax);
  return timelineBooks(books)
    .map(b => `<circle class="chart-dot" cx="${r1(timelineX(b.year!))}" cy="${r1(y(b[key]))}" r="4" data-genres="${escapeHTML(b.genres.join('|'))}" data-tip="${escapeHTML(bookTip(b, key))}"/>`)
    .join('');
}

// The first and last 25-year spans with at least this many books are the ones
// a sentence compares. Fewer, and a handful of plays in 1600–1624 makes
// sentences look like they got longer.
export const SPAN_MIN_BOOKS = 20;
const firstAndLast = (points: TrendPoint[]) => {
  const first = points[0];
  const last = points.at(-1);
  return first && last && first !== last ? { first, last } : undefined;
};
export const spanText = (p: TrendPoint) => `${p.from}–${p.to - 1}`;

// "10.1 semicolons per 1,000 words in 1775–1799, 1.8 in 1950–1974": the
// medians of the first and last 25-year spans with enough books.
export function trendSentence(books: BookNumbers[], key: MetricKey): string {
  const ends = firstAndLast(trend(books, key, TIMELINE_FROM, TIMELINE_TO, 25, SPAN_MIN_BOOKS));
  if (!ends) return 'too few dated books to say';
  return `${describeValue(key, ends.first.value)} in ${spanText(ends.first)}, ${formatValue(key, ends.last.value)} in ${spanText(ends.last)}`;
}

// Words per sentence if every semicolon and colon ended a sentence too.
export const wordsPerClause = (b: BookNumbers) => (b.wps > 0 ? 1000 / (1000 / b.wps + b.semicolon + b.colon) : 0);
const asClauses = (books: BookNumbers[]) => books.map(b => ({ ...b, wps: wordsPerClause(b) }));

// How much of the fall in sentence length is semicolons and colons turning
// into periods: the median sentence, and the median clause, in the first and
// last spans with enough books, and the share of the sentence's fall that
// the clause doesn't share.
export function shrinkingSentence(books: BookNumbers[]) {
  const sentences = firstAndLast(trend(books, 'wps', TIMELINE_FROM, TIMELINE_TO, 25, SPAN_MIN_BOOKS));
  if (!sentences) throw new Error('Too few dated books for the shrinking sentence');
  const clauses = trend(asClauses(books), 'wps', TIMELINE_FROM, TIMELINE_TO, 25, SPAN_MIN_BOOKS);
  const clauseAt = (p: TrendPoint) => clauses.find(c => c.from === p.from)!.value;
  const { first, last } = sentences;
  const fall = first.value - last.value;
  return {
    first,
    last,
    sentence: [first.value, last.value],
    clause: [clauseAt(first), clauseAt(last)],
    punctuationShare: fall > 0 ? 1 - (clauseAt(first) - clauseAt(last)) / fall : 0,
  };
}

// Authors with a career to chart: four or more books dated from
// TIMELINE_FROM on, across at least eight years. Only those books count.
export function careerAuthors(books: BookNumbers[]): Array<{ author: string; books: BookNumbers[] }> {
  return authorsWithWorks(books, 3)
    .map(({ author, books: list }) => ({ author, books: list.filter(b => b.year !== null && b.year >= TIMELINE_FROM) }))
    .filter(({ books: list }) => {
      const years = list.map(b => b.year!);
      return years.length >= 4 && Math.max(...years) - Math.min(...years) >= 8;
    });
}

// Every career chart, for one measure, keyed by author. The measure's scale
// is shared by all of them.
export function careerSVGs(shelf: BookNumbers[], key: MetricKey): Map<string, string> {
  const authors = careerAuthors(shelf);
  const axis = axisFor(authors.flatMap(a => a.books).map(b => b[key]), key);
  return new Map(authors.map(({ author, books }) => [author, careerSVG(books, shelf, key, axis)]));
}

// An author's books in order of year against the shelf around them: their
// books joined by a line, and the median of the shelf's books within 15
// years of each one as a dashed line.
function careerSVG(authorBooks: BookNumbers[], shelf: BookNumbers[], key: MetricKey, axis: { max: number; ticks: number[] }): string {
  const frame = { W: 320, H: 190, L: 40, R: 12, T: 12, B: 30 };
  const { W, H, L, R } = frame;
  const dated = [...authorBooks].sort((a, b) => a.year! - b.year!);
  const first = dated[0]!.year!;
  const last = dated.at(-1)!.year!;
  const pad = Math.max(2, (last - first) * 0.08);
  const x = (year: number) => L + ((year - first + pad) / (last - first + pad * 2)) * (W - L - R);
  const y = valueY(frame, key, axis.max);
  const tickY = (v: number) => y(key === 'dialogue' ? v / 100 : v);
  const ticks = [axis.ticks[0]!, axis.ticks.at(-1)!]
    .map(v => `<line class="chart-grid" x1="${L}" x2="${W - R}" y1="${r1(tickY(v))}" y2="${r1(tickY(v))}"/><text class="chart-tick" x="${L - 6}" y="${r1(tickY(v) + 5)}" text-anchor="end">${tickText(key, v)}</text>`)
    .join('');
  const around = dated.map(b => [x(b.year!), y(median(shelf.filter(s => s.year !== null && Math.abs(s.year - b.year!) <= 15).map(s => s[key])))] as [number, number]);
  const own = dated.map(b => [x(b.year!), y(b[key])] as [number, number]);
  const dots = dated.map((b, i) => `<circle class="chart-dot" cx="${r1(own[i]![0])}" cy="${r1(own[i]![1])}" r="5" data-tip="${escapeHTML(bookTip(b, key))}"/>`).join('');
  const years = `<text class="chart-tick" x="${L}" y="${H - 8}" text-anchor="start">${first}</text><text class="chart-tick" x="${W - R}" y="${H - 8}" text-anchor="end">${last}</text>`;
  return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHTML(`${dated[0]!.author}'s books from ${first} to ${last}, ${metric(key).label.toLowerCase()} against the shelf at the time`)}">${years}${ticks}<path class="chart-line chart-line-shelf" d="${linePath(around)}"/><path class="chart-line chart-line-author" d="${linePath(own)}"/>${dots}</svg>`;
}

// A scatter of download rank (most downloaded on the left) against a measure.
export function popularitySVG(books: BookNumbers[], key: MetricKey): string {
  const { W, H, L, R } = POPULARITY;
  const ranked = books.filter(b => b.rank !== null);
  const x = rankX(ranked);
  const axis = axisFor(ranked.map(b => b[key]), key);
  const tickY = (v: number) => valueY(POPULARITY, key, axis.max)(key === 'dialogue' ? v / 100 : v);
  const grid = [
    ...axis.ticks.map(v => `<line class="chart-grid" x1="${L}" x2="${W - R}" y1="${r1(tickY(v))}" y2="${r1(tickY(v))}"/><text class="chart-tick" x="${L - 10}" y="${r1(tickY(v) + 5)}" text-anchor="end">${tickText(key, v)}</text>`),
    ...rankTicks(ranked.length).map(r => `<text class="chart-tick" x="${r1(x(r))}" y="${H - 22}" text-anchor="middle">${r}</text>`),
  ].join('');
  const label = `<text class="chart-axis" x="${(L + W - R) / 2}" y="${H - 2}" text-anchor="middle">download rank, most read on the left</text>`;
  return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHTML(`Download rank against ${metric(key).unit}`)}">${grid}${label}<g class="chart-dots" data-metric="${key}" data-max="${axis.max}"></g></svg>`;
}

// 1 and every step up to the last rank: steps of 100, 200 or 400 as the shelf grows.
const rankTicks = (count: number) => {
  const step = count > 1000 ? 400 : count > 500 ? 200 : 100;
  return [1, ...Array.from({ length: Math.floor(count / step) }, (_, i) => (i + 1) * step)];
};

const POPULARITY = { W: 1000, H: 360, L: 60, R: 20, T: 16, B: 50 };
const rankX = (ranked: BookNumbers[]) => {
  const maxRank = Math.max(...ranked.map(b => b.rank!));
  return (rank: number) => POPULARITY.L + ((rank - 1) / (maxRank - 1)) * (POPULARITY.W - POPULARITY.L - POPULARITY.R);
};

// The scatter's dots, drawn in the browser like timelineDots.
export function popularityDots(books: BookNumbers[], key: MetricKey, axisMax: number): string {
  const ranked = books.filter(b => b.rank !== null);
  const x = rankX(ranked);
  const y = valueY(POPULARITY, key, axisMax);
  return ranked.map(b => `<circle class="chart-dot" cx="${r1(x(b.rank!))}" cy="${r1(y(b[key]))}" r="5" data-tip="${escapeHTML(`#${b.rank} ${bookTip(b, key)}`)}"/>`).join('');
}

// The measures in the table of every book's numbers, after the year.
export const TABLE_METRICS: MetricKey[] = ['semicolon', 'comma', 'colon', 'exclaim', 'question', 'wps', 'dialogue'];

// That table's rows, by title; the map's two measures close each row.
export function numbersTableRows(books: BookNumbers[]): string {
  return [...books]
    .sort((a, b) => a.title.localeCompare(b.title))
    .map(b => `<tr><th scope="row"><a href="books/${b.slug}/">${escapeHTML(b.title)}</a>, ${escapeHTML(b.author)}</th><td>${escapeHTML(b.yearLabel ?? '')}</td>${TABLE_METRICS.map(key => `<td>${formatValue(key, b[key])}</td>`).join('')}<td>${b.pausesPerStop.toFixed(1)}</td><td>${(b.loudness * 100).toFixed(1)}%</td></tr>`)
    .join('');
}

// Plain words for a rank correlation.
export function correlationWords(rho: number): string {
  const size = Math.abs(rho);
  if (size < 0.1) return 'no real link';
  const strength = size < 0.3 ? 'a weak' : size < 0.5 ? 'a moderate' : 'a strong';
  return `${strength} link`;
}

// The "what comes next" grid as a table: rows are the mark before, columns
// the mark after, each cell shaded by its share of the row.
export function nextMarkTableHTML(grid: number[][]): string {
  const head = TRACKED_MARKS.map(({ mark, name }) => `<th scope="col"><abbr title="${escapeHTML(name)}">${escapeHTML(mark)}</abbr></th>`).join('');
  const rows = TRACKED_MARKS.map(({ mark, name }, i) => {
    const cells = grid[i]!.map((share, j) => {
      const level = Math.min(5, Math.floor(Math.sqrt(share) * 8));
      const pct = Math.round(share * 100);
      return `<td class="next-${level}" title="${escapeHTML(`After a ${name}, the next mark is a ${TRACKED_MARKS[j]!.name} ${pct}% of the time`)}">${pct >= 1 ? pct : ''}</td>`;
    }).join('');
    return `<tr><th scope="row"><abbr title="${escapeHTML(name)}">${escapeHTML(mark)}</abbr></th>${cells}</tr>`;
  }).join('');
  return `<table class="next-grid"><caption>Rows: the mark before. Columns: the mark that comes next. Each number is a percentage of its row.</caption><thead><tr><td></td>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

export interface Profile {
  name: string;
  detail: string;
  href?: string;
  shares: number[];
  values: Record<MetricKey, number>;
}

export function bookProfile(b: BookNumbers, root = ''): Profile {
  return {
    name: b.title,
    detail: `${b.author}, ${yearText(b)}`,
    href: `${root}books/${b.slug}/`,
    shares: b.shares,
    values: Object.fromEntries(METRICS.map(({ key }) => [key, b[key]])) as Record<MetricKey, number>,
  };
}

// An author's profile: the average of their books.
export function authorProfile(author: string, books: BookNumbers[]): Profile {
  return {
    name: author,
    detail: `${books.length} books on the shelf`,
    shares: averageShares(books.map(b => b.shares)),
    values: Object.fromEntries(METRICS.map(({ key }) => [key, mean(books.map(b => b[key]))])) as Record<MetricKey, number>,
  };
}

// Two profiles side by side: their fingerprints, then every measure.
export function compareHTML(a: Profile, b: Profile): string {
  const head = (p: Profile) => `<div class="compare-side"><h3 class="compare-name">${p.href ? `<a href="${escapeHTML(p.href)}">${escapeHTML(p.name)}</a>` : escapeHTML(p.name)}</h3><p class="compare-detail">${escapeHTML(p.detail)}</p>${fingerprintHTML(p.shares, 'fingerprint fingerprint-large')}</div>`;
  const rows = METRICS.map(({ key, label }) => `<tr><th scope="row">${label}</th><td>${formatValue(key, a.values[key])}</td><td>${formatValue(key, b.values[key])}</td></tr>`).join('');
  return `<div class="compare-pair">${head(a)}${head(b)}</div><table class="compare-table"><caption>Marks per 1,000 words, except words per sentence and dialogue (the share of words inside quotation marks).</caption><thead><tr><td></td><th scope="col">${escapeHTML(a.name)}</th><th scope="col">${escapeHTML(b.name)}</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// A book's numbers rounded for numbers.json, which the comparison reads.
export const forBrowser = (b: BookNumbers): BookNumbers => ({
  ...b,
  ...(Object.fromEntries(METRICS.map(({ key }) => [key, Number(b[key].toFixed(4))])) as Record<MetricKey, number>),
  shares: b.shares.map(s => Number(s.toFixed(5))),
});

// "Mark Twain, Jules Verne and Plato"
const listWords = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')}`;
const byYear = (books: BookNumbers[]) => [...books].sort((a, b) => (a.year ?? Infinity) - (b.year ?? Infinity) || a.title.localeCompare(b.title));

// Who the marks guessed for each of an author's books, by slug.
export type GuessedBySlug = Map<string, string>;

const guessedFor = (b: BookNumbers, guessed: GuessedBySlug) => {
  const name = guessed.get(b.slug);
  if (name === undefined) throw new Error(`No guess for ${b.slug}`);
  return name;
};

// Who an author's missed books were taken for, most often first:
// "Mark Twain (5) and Jules Verne".
function takenFor(author: string, books: BookNumbers[], guessed: GuessedBySlug): string {
  const counts = new Map<string, number>();
  for (const b of books) {
    const name = guessedFor(b, guessed);
    if (name !== author) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return listWords([...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name, n]) => (n > 1 ? `${name} (${n})` : name)));
}

const square = (named: boolean) => `<span class="named${named ? ' named-right' : ''}"></span>`;

// One author in the numbers page's list: their name, a square per book in
// order of year, pink where the marks named the author, and the count. The
// squares carry each book's guess, so the browser can show the author
// without working the guesses out again.
export function authorPickHTML(author: string, books: BookNumbers[], guessed: GuessedBySlug, spread: number): string {
  const dated = byYear(books);
  const named = dated.filter(b => guessedFor(b, guessed) === author).length;
  const squares = dated.map(b => `<span class="named${guessedFor(b, guessed) === author ? ' named-right' : ''}" data-slug="${escapeHTML(b.slug)}" data-guessed="${escapeHTML(guessedFor(b, guessed))}"></span>`).join('');
  return `<li><button type="button" class="author-pick" data-author="${escapeHTML(author)}" data-spread="${Math.round(spread)}" aria-pressed="false"><span class="author-pick-name">${escapeHTML(author)}</span><span class="named-squares" aria-hidden="true">${squares}</span><span class="author-pick-count">${named} of ${books.length}</span></button></li>`;
}

// The picked author in full: how often the marks named them, who the misses
// were taken for, their average fingerprint, and every book with its guess.
// Their career chart goes in under the fingerprint: `career` is its markup,
// or empty where the page moves the chart in itself.
export function authorDetailHTML(author: string, books: BookNumbers[], guessed: GuessedBySlug, spread: number, career = ''): string {
  const dated = byYear(books);
  const named = dated.filter(b => guessedFor(b, guessed) === author).length;
  const missed = takenFor(author, books, guessed);
  const summary = `The marks named ${author} for ${named} of ${books.length} books.${missed ? ` The ${books.length - named === 1 ? 'other was' : 'others were'} taken for ${missed}.` : ''} Spread ${spread}.`;
  const rows = dated
    .map(b => {
      const name = guessedFor(b, guessed);
      return `<li>${square(name === author)}<a href="books/${b.slug}/">${escapeHTML(b.title)}</a> <span class="author-book-year">${escapeHTML(yearText(b))}${name === author ? '' : `, taken for ${escapeHTML(name)}`}</span></li>`;
    })
    .join('');
  return `<h4 class="author-detail-name">${escapeHTML(author)}</h4>
        <p class="author-summary">${escapeHTML(summary)}</p>
        <div class="author-detail-body">
          <div class="author-detail-side"><p class="author-detail-label">Their average fingerprint</p>${fingerprintHTML(averageShares(books.map(b => b.shares)), 'fingerprint fingerprint-large')}${career}</div>
          <ol class="author-detail-books">${rows}</ol>
        </div>`;
}

// Each author's average fingerprint, for finding the author another
// punctuates most like.
export function authorFingerprints(books: BookNumbers[]): Map<string, number[]> {
  return new Map(authorsWithWorks(books, 1).map(({ author, books: list }) => [author, averageShares(list.map(b => b.shares))]));
}

// The author whose average fingerprint is nearest `author`'s own.
export function closestAuthor(author: string, prints: Map<string, number[]>): string {
  const own = prints.get(author);
  if (!own) throw new Error(`No fingerprint for ${author}`);
  let best = { author: '', distance: Infinity };
  for (const [other, shares] of prints) {
    if (other === author) continue;
    const distance = fingerprintDistance(own, shares);
    if (distance < best.distance) best = { author: other, distance };
  }
  return best.author;
}

// The median of every book on the shelf, for each measure.
export const shelfMedians = (books: BookNumbers[]) => Object.fromEntries(METRICS.map(({ key }) => [key, median(books.map(b => b[key]))])) as Record<MetricKey, number>;

// A book page's author on the shelf, for every book with a named author: the
// book against the author's average and the whole shelf, the author whose
// punctuation theirs is closest to, and, for authors with more than one book,
// whether the marks name its author (`guess`, for three works or more) and
// the author's other books.
export function bookAuthorHTML(
  book: BookNumbers,
  authorBooks: BookNumbers[],
  guess: Guess | undefined,
  prints: Map<string, number[]>,
  medians: Record<MetricKey, number>
): string {
  const { author } = book;
  const several = authorBooks.length > 1;
  const center = averageShares(authorBooks.map(b => b.shares));
  const closer = authorBooks.filter(b => fingerprintDistance(b.shares, center) < fingerprintDistance(book.shares, center)).length;
  const verdict = guess === undefined ? '' : ` Held out and guessed from its marks alone, the shelf ${guess.guessed === author ? `names ${author} as its author` : `takes it for ${guess.guessed}`}.`;
  const note = several
    ? `${authorBooks.length} books by ${author} are on the shelf. Its fingerprint is the ${ordinal(closer + 1)} closest of the ${authorBooks.length} to their average.${verdict}`
    : `It's the only book by ${author} on the shelf.`;
  const nearest = closestAuthor(author, prints);
  const nearestLine = `Of the ${prints.size - 1} other authors on the shelf, ${escapeHTML(author)}'s punctuation is closest to <a href="numbers.html?author=${encodeURIComponent(nearest)}#authors">${escapeHTML(nearest)}</a>'s.`;
  const head = `<th scope="col">This book</th>${several ? `<th scope="col">${escapeHTML(author)}'s average</th>` : ''}<th scope="col">Every book's median</th>`;
  const rows = TABLE_METRICS.map(
    key =>
      `<tr><th scope="row">${metric(key).label}</th><td>${formatValue(key, book[key])}</td>${several ? `<td>${formatValue(key, mean(authorBooks.map(b => b[key])))}</td>` : ''}<td>${formatValue(key, medians[key])}</td></tr>`
  ).join('');
  // One book: the closest author's fingerprint, to set beside the book's own.
  const print = several
    ? `<h3 class="author-name">${escapeHTML(author)}'s average fingerprint</h3>${fingerprintHTML(center, 'fingerprint fingerprint-large')}`
    : `<h3 class="author-name">${escapeHTML(nearest)}'s average fingerprint</h3>${fingerprintHTML(prints.get(nearest)!, 'fingerprint fingerprint-large')}`;
  const shelfBooks = byYear(authorBooks)
    .map(b => {
      const title = b === book ? `<span class="author-book-this" aria-current="page">${escapeHTML(b.title)}</span>` : `<a href="books/${b.slug}/">${escapeHTML(b.title)}</a>`;
      return `<li>${title}<span class="author-book-year">${escapeHTML(yearText(b))}</span>${fingerprintHTML(b.shares)}</li>`;
    })
    .join('');
  return `<section class="book-author" aria-labelledby="book-author-heading">
    <h2 id="book-author-heading" class="view-heading">${escapeHTML(author)} on the shelf</h2>
    <div class="book-author-body">
      <div>
        <p class="view-note">${escapeHTML(note)} ${nearestLine}</p>
        ${print}
        ${guess === undefined ? '' : `<p class="view-note"><a href="numbers.html?author=${encodeURIComponent(author)}#authors">${escapeHTML(author)} on the numbers page</a></p>`}
      </div>
      <table class="compare-table"><caption>Marks per 1,000 words, except words per sentence and dialogue (the share of words inside quotation marks).</caption><thead><tr><td></td>${head}</tr></thead><tbody>${rows}</tbody></table>
    </div>
    ${several ? `<ul class="author-books">${shelfBooks}</ul>` : ''}
  </section>`;
}
