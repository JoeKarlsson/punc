// A modern book's page and shelf numbers, from its HathiTrust counts in
// site/modern.json (site/src/modern.ts). Counts have no order, so no score,
// spiral or pages view; and the error in a fingerprint from a scan is often
// more than the gap to a book's closest twin, so no twin or map spot either.
import type { BookNumbers } from './numbers';
import { countsHTML, fingerprintHTML, TRACKED_MARKS, throughBookHTML } from './patterns';

export interface ModernBook {
  slug: string;
  title: string;
  author: string;
  year: number;
  // The edition HathiTrust counted
  edition: number;
  htid: string;
  // By Wikidata sitelinks, 1 is the best known
  rank: number;
  words: number;
  wps: number;
  // In TRACKED_MARKS order, for the whole book and for each tenth of its pages
  counts: number[];
  tenths: number[][];
}

// The measures a modern book shares with the Gutenberg shelf (numbers.ts MetricKey).
export type ModernMetric = 'semicolon' | 'comma' | 'colon' | 'question' | 'exclaim' | 'wps';
const MODERN_METRICS: Array<{ key: ModernMetric; label: string }> = [
  { key: 'semicolon', label: 'Semicolons' },
  { key: 'comma', label: 'Commas' },
  { key: 'colon', label: 'Colons' },
  { key: 'exclaim', label: 'Exclamation marks' },
  { key: 'question', label: 'Question marks' },
  { key: 'wps', label: 'Words per sentence' },
];

// The same measures as a Gutenberg book's (numbers.ts bookNumbers). Dialogue
// needs the text, and the map spot is off by too much, so those are NaN.
export function modernNumbers(book: ModernBook): BookNumbers {
  const per1000 = (mark: string) => (book.counts[TRACKED_MARKS.findIndex(t => t.mark === mark)]! / book.words) * 1000;
  return {
    slug: book.slug,
    title: book.title,
    author: book.author,
    year: book.year,
    yearLabel: String(book.year),
    genres: [],
    rank: null,
    words: book.words,
    shares: modernShares(book),
    semicolon: per1000(';'),
    comma: per1000(','),
    colon: per1000(':'),
    dash: per1000('-'),
    exclaim: per1000('!'),
    question: per1000('?'),
    marks: (modernMarkCount(book) / book.words) * 1000,
    wps: book.wps,
    dialogue: NaN,
    pausesPerStop: NaN,
    loudness: NaN,
  };
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

export const modernMedians = (books: BookNumbers[]): Record<ModernMetric, number> =>
  Object.fromEntries(MODERN_METRICS.map(({ key }) => [key, median(books.map(b => b[key]))])) as Record<ModernMetric, number>;

const escapeHTML = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n: number) => n.toLocaleString('en-US');

export const modernMarkCount = (book: ModernBook) => book.counts.reduce((a, b) => a + b, 0);
const modernTopMark = (book: ModernBook) => TRACKED_MARKS[book.counts.indexOf(Math.max(...book.counts))]!.mark;
const shares = (counts: number[]) => counts.map(n => n / Math.max(counts.reduce((a, b) => a + b, 0), 1));
// What markShares gives a Gutenberg book, for the fingerprint.
export const modernShares = (book: ModernBook) => shares(book.counts);

// Each mark's share of the marks in each tenth, as marksThroughBook gives.
const modernThroughBook = (book: ModernBook): number[][] => {
  const byTenth = book.tenths.map(shares);
  return TRACKED_MARKS.map((_, m) => byTenth.map(tenth => tenth[m]!));
};

const HATHITRUST_DATASET = 'https://wiki.htrc.illinois.edu/display/COM/HTRC+Derived+Datasets';
const hathiTrustRecord = (htid: string) => `https://hdl.handle.net/2027/${htid}`;

export interface ModernPageContext {
  modernMedians: Record<ModernMetric, number>;
  gutenbergMedians: Record<ModernMetric, number>;
  // The author's other books on either shelf, oldest first
  otherBooks: Array<{ slug: string; title: string; year: number | null }>;
}

// The cover's words name the link it's in.
function typeCoverHTML(book: Pick<ModernBook, 'title' | 'author'>): string {
  return `<span class="type-cover"><span class="type-cover-title">${escapeHTML(book.title)}</span><span class="type-cover-author">${escapeHTML(book.author)}</span></span>`;
}

export function modernPageHTML(book: ModernBook, context: ModernPageContext): string {
  const numbers = modernNumbers(book);
  const value = (n: number) => n.toFixed(1);
  const rows = MODERN_METRICS.map(
    ({ key, label }) => `<tr><th scope="row">${label}</th><td>${value(numbers[key])}</td><td>${value(context.modernMedians[key])}</td><td>${value(context.gutenbergMedians[key])}</td></tr>`
  ).join('');
  const counts = TRACKED_MARKS.map(({ mark }, i) => [mark, book.counts[i]!] as [string, number]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const others = context.otherBooks
    .map(b => `<li><a href="books/${b.slug}/">${escapeHTML(b.title)}</a>${b.year ? `<span class="author-book-year">${b.year}</span>` : ''}</li>`)
    .join('');
  const longTitle = book.title.length > 40 || book.title.split(/[\s\-—]+/).some(w => w.length > 14);
  return `<article id="book" class="book book-modern">
  <header class="book-head">
    <a class="book-poster poster" href="${hathiTrustRecord(book.htid)}" target="_blank" rel="noopener noreferrer">${typeCoverHTML(book)}<span class="poster-source">On HathiTrust</span><span class="visually-hidden"> (opens in a new tab)</span></a>
    <h1 id="book-title" class="book-title${longTitle ? ' book-title-long' : ''}">${escapeHTML(book.title)}</h1>
    <p id="book-byline" class="book-byline">${escapeHTML(`${book.author}, ${book.year}`)}</p>
    <dl class="stats">
      <div><dt>marks counted</dt><dd id="stat-marks">${fmt(modernMarkCount(book))}</dd></div>
      <div><dt>words a sentence</dt><dd id="stat-wps">${value(book.wps)}</dd></div>
      <div><dt>most used mark</dt><dd id="stat-top" class="serif-mark">${escapeHTML(modernTopMark(book))}</dd></div>
    </dl>
    <div id="book-fingerprint" class="book-fingerprint">${fingerprintHTML(modernShares(book), 'fingerprint fingerprint-large')}<p class="fp-caption">Its punctuation fingerprint: each mark's share, on the same scale as every book on the shelf.</p>
    <p class="modern-note">Counted from <a href="${HATHITRUST_DATASET}">HathiTrust's page-by-page counts</a> of the ${book.edition} edition, without the text, so there's no score, spiral or pages view. Dashes and hyphens come out about a fifth higher than in a Gutenberg text of the same book.</p></div>
  </header>

  <section class="book-author" aria-labelledby="modern-numbers-heading">
    <h2 id="modern-numbers-heading" class="view-heading">Against both shelves</h2>
    <div class="numbers-table-wrap"><table class="compare-table"><caption>Marks per 1,000 words, except words per sentence. The modern shelf is novels first published 1930–2009; the Gutenberg shelf is older books.</caption><thead><tr><td></td><th scope="col">This book</th><th scope="col">Modern median</th><th scope="col">Gutenberg median</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${others ? `<h3 class="author-name">More by ${escapeHTML(book.author)}</h3><ul class="modern-others">${others}</ul>` : ''}
  </section>

  <section class="view">
    <h2 class="view-heading">Through the book</h2>
    <p class="view-note">How often each mark turns up as the book goes on, from the first page on the left to the last on the right. Each bar is a tenth of the pages, and each row is scaled to its own peak.</p>
    <div id="through-book">${throughBookHTML(modernThroughBook(book))}</div>
    <h2 class="view-heading">Every mark counted</h2>
    <ol id="counts" class="counts">${countsHTML(counts)}</ol>
  </section>

  <p class="another">Go back to <a href="?from=modern">the modern shelf</a></p>
  <p class="modern-credit">Counts from the HathiTrust Research Center's <a href="${HATHITRUST_DATASET}">Extracted Features dataset</a>, CC BY 4.0. <a href="${hathiTrustRecord(book.htid)}">This edition on HathiTrust</a>.</p>
</article>`;
}
