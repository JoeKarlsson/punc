// Builds the static site into site-dist/ for GitHub Pages: bundles the browser
// code, analyzes every shelf book (for the cards, sort data and share text),
// writes one page per book, and wraps each page in the shared layout.
// The shelf itself comes from site/scripts/fetch-books.mjs.
import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const SITE = 'site';
const OUT = 'site-dist';
const SITE_URL = 'https://joekarlsson.github.io/punc/';
const FEATURED_COUNT = 4;

await rm(OUT, { recursive: true, force: true });
await mkdir(join(OUT, 'assets'), { recursive: true });

await build({
  entryPoints: [join(SITE, 'src/reader.ts'), join(SITE, 'src/shelf.ts'), join(SITE, 'src/page.ts'), join(SITE, 'src/numbers-page.ts')],
  bundle: true,
  format: 'esm',
  target: 'es2020',
  minify: true,
  outdir: join(OUT, 'assets'),
});

// The same analysis the browser runs, bundled for Node so the numbers match.
const analyzerPath = join(tmpdir(), `punc-site-analyze-${process.pid}.mjs`);
await build({ entryPoints: [join(SITE, 'src/node-entry.ts')], bundle: true, platform: 'node', format: 'esm', outfile: analyzerPath });
const { analyzeBook, cardHTML, fingerprintHTML, markShares, numbers: N, shelfPosition, SHELF_PAGE_SIZE } = await import(pathToFileURL(analyzerPath).href);
await rm(analyzerPath);

// GitHub Pages can't send headers, so the policy rides in a meta tag, first in
// <head> so it covers everything after it. A meta CSP can't set
// frame-ancestors, so it gives no clickjacking protection. Style attributes
// (card tilts, chart positions) need 'unsafe-inline' for styles; scripts get
// none. No upgrade-insecure-requests: Pages is https-only and the site has no
// http:// assets (a test checks), and WebKit would apply it to localhost.
const PLAUSIBLE = 'https://plausible.joekarlsson.io';
const CSP = [
  "default-src 'self'",
  `script-src 'self' ${PLAUSIBLE}`,
  `connect-src 'self' ${PLAUSIBLE}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');
const AUTHOR = { '@type': 'Person', name: 'Joe Karlsson', url: 'https://joekarlsson.com' };
const WEBSITE = { '@type': 'WebSite', name: 'Punc', url: SITE_URL };
const escapeHTML = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = n => n.toLocaleString('en-US');

const catalog = JSON.parse(await readFile(join(SITE, 'catalog.json'), 'utf8'));
const books = [];
// For the numbers page: each book's measures, the clusters of touching marks
// across the shelf, and each book's "which mark comes next" grid.
const shelfNumbers = [];
const clusters = new Map();
const nextMarkGrids = [];
for (const meta of catalog) {
  const textPath = join(SITE, 'books', `${meta.slug}.txt.gz`);
  if (!existsSync(textPath)) throw new Error(`${textPath} is missing; run site/scripts/fetch-books.mjs`);
  const book = analyzeBook(gunzipSync(await readFile(textPath)).toString('utf8'));
  shelfNumbers.push(N.bookNumbers(book, meta));
  for (const [cluster, count] of N.touchingClusters(book.text)) {
    const seen = clusters.get(cluster) ?? { count: 0, books: 0 };
    clusters.set(cluster, { count: seen.count + count, books: seen.books + 1 });
  }
  nextMarkGrids.push(N.nextMarkShares(book.marks));
  // A stretch from a tenth of the way in, past the title page and contents.
  const start = Math.floor(book.marks.length * 0.1);
  books.push({
    ...meta,
    byline: meta.published ? `${meta.author}, ${meta.published}` : meta.author,
    authorSort: meta.author.split(' ').at(-1),
    sample: book.marks.slice(start, start + 90).join(' '),
    words: book.wordCount,
    marks: book.marks.length,
    wps: book.wordsPerSentence,
    density: (book.marks.length / Math.max(book.wordCount, 1)) * 100,
    shares: markShares(book.marks),
    fingerprintLarge: fingerprintHTML(markShares(book.marks), 'fingerprint fingerprint-large'),
    topMark: book.counts[0]?.[0] ?? '',
    ...shelfPosition(book.marks),
  });
}
const byRank = [...books].sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
const genres = [...new Set(books.flatMap(b => b.genres))].sort();


// The whole shelf for site/src/shelf.ts, which searches, sorts and pages it
// and draws cards past the first page. Shares are rounded: a fingerprint bar
// can't show more.
const shelfBook = ({ slug, title, author, byline, authorSort, genres, rank, publishedSort, words, marks, wps, density, sample, shares, cover }) =>
  ({ slug, title, author, byline, authorSort, genres, rank, publishedSort, words, marks, wps: Number(wps.toFixed(2)), density: Number(density.toFixed(2)), sample, shares: shares.map(s => Number(s.toFixed(4))), cover });
await writeFile(join(OUT, 'shelf.json'), JSON.stringify(byRank.map(shelfBook)));

// Book pages and uploads draw themselves on the shelf map from this.
// The numbers page compares books and authors from this.
await writeFile(join(OUT, 'numbers.json'), JSON.stringify(shelfNumbers.map(N.forBrowser)));
await writeFile(join(OUT, 'books.json'), JSON.stringify(books.map(({ slug, title, author, pausesPerStop, loudness }) => ({ slug, title, author, pausesPerStop, loudness }))));
await mkdir(join(OUT, 'books'), { recursive: true });
for (const book of books) await cp(join(SITE, 'books', `${book.slug}.txt.gz`), join(OUT, 'books', `${book.slug}.txt.gz`));
await cp(join(SITE, 'covers'), join(OUT, 'covers'), { recursive: true });
await cp(join(SITE, 'static'), OUT, { recursive: true });
// Per-book share cards, rendered by site/scripts/make-images.mjs
await cp(join(SITE, 'share'), join(OUT, 'share'), { recursive: true });
await cp(join(SITE, 'styles.css'), join(OUT, 'styles.css'));

const crayonFilter = `<svg class="defs" aria-hidden="true" focusable="false"><filter id="crayon" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.5" result="d"/><feTurbulence type="fractalNoise" baseFrequency="2.2" seed="8" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.5" result="holes"/><feComposite in="d" in2="holes" operator="in"/></filter></svg>`;

const NAV = [
  { key: 'shelf', href: './', label: 'The shelf' },
  { key: 'numbers', href: 'numbers.html', label: 'Numbers' },
  { key: 'read', href: 'read.html', label: 'Read your own' },
  { key: 'about', href: 'about.html', label: 'About' },
];

// Share targets, as in the share line under joekarlsson.com posts
function shareLinks(url, title) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title.slice(0, 80));
  const both = encodeURIComponent(`${title} ${url}`);
  const networks = [
    ['Hacker News', `https://news.ycombinator.com/submitlink?u=${u}&t=${t}`],
    ['Reddit', `https://www.reddit.com/submit?url=${u}&title=${t}`],
    ['Bluesky', `https://bsky.app/intent/compose?text=${both}`],
    ['Threads', `https://www.threads.net/intent/post?text=${both}`],
    ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${u}`],
    ['X', `https://x.com/intent/post?text=${t}&url=${u}`],
  ];
  const links = networks.map(
    ([label, href]) =>
      `<a href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer" class="plausible-event-name=Share+Click plausible-event-network=${label.replace(/ /g, '+')}">${label}</a>`
  );
  return `<p class="share">Share it on ${links.join(', ')}, or <button type="button" class="link-button" data-copy-link="${escapeHTML(url)}">copy the link</button>.</p>`;
}

const sitemapURLs = [];

// notFound: GitHub Pages serves 404.html at any missing path, so its links
// resolve from the site root, and it stays out of search and the sitemap.
async function writePage({ path, nav, title, socialTitle, description, body, script, depth = 0, dataset = {}, image = 'og.png', imageAlt, structuredData, notFound = false }) {
  const url = SITE_URL + path.replace(/index\.html$/, '');
  const root = '../'.repeat(depth);
  const navHTML = NAV.map(n => `<a href="${n.href}"${n.key === nav ? ' aria-current="page"' : ''}>${n.label}</a>`).join('');
  const data = Object.entries({ ...dataset, root, ...(notFound ? { 'not-found': 'true' } : {}) }).map(([k, v]) => ` data-${k}="${escapeHTML(v)}"`).join('');
  const imageURL = SITE_URL + image;
  const jsonLD = structuredData
    ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', ...structuredData }).replace(/</g, '\\u003c')}</script>\n`
    : '';
  if (!notFound) sitemapURLs.push(url);
  const alt = imageAlt ?? 'A ransom note cut from pink and white paper asks: What does a book look like without words?';
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="referrer" content="strict-origin-when-cross-origin">
${notFound ? '<base href="/punc/">\n' : ''}<title>${escapeHTML(title)}</title>
<meta name="description" content="${escapeHTML(description)}">
${notFound ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url}">`}
<meta name="color-scheme" content="only dark">
<meta name="darkreader-lock">
<meta name="theme-color" content="#000000">
<meta name="author" content="Joe Karlsson">
<link rel="icon" href="favicon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="manifest" href="site.webmanifest">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Punc">
<meta property="og:locale" content="en_US">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${escapeHTML(socialTitle ?? title)}">
<meta property="og:description" content="${escapeHTML(description)}">
<meta property="og:image" content="${imageURL}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${escapeHTML(alt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHTML(socialTitle ?? title)}">
<meta name="twitter:description" content="${escapeHTML(description)}">
<meta name="twitter:image" content="${imageURL}">
<meta name="twitter:image:alt" content="${escapeHTML(alt)}">
<meta name="twitter:site" content="@joekarlsson1">
<meta name="twitter:creator" content="@joekarlsson1">
${jsonLD}<link rel="preload" href="fonts/anton-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/fraunces-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="styles.css?v=${version}">
<script defer src="analytics.js?v=${version}"></script>
</head>
<body${data}>
${crayonFilter}
<a class="skip" href="#main">Skip to the page</a>
<header class="site-header">
  <a class="wordmark" href="./">Punc</a>
  <nav aria-label="Site">${navHTML}</nav>
</header>
<main id="main">
${body}
${notFound ? '' : shareLinks(url, socialTitle ?? title)}
</main>
<footer class="site-footer">
  <nav class="footer-links" aria-label="Elsewhere">
    <a href="https://joekarlsson.com">joekarlsson.com</a>
    <a href="https://github.com/JoeKarlsson/punc">Source on GitHub</a>
  </nav>
  <p>Punc is an art project by Joe Karlsson. Shelf books and covers from Project Gutenberg.</p>
</footer>
<script type="module" src="assets/${script}?v=${version}"></script>
</body>
</html>
`;
  // Pages in subfolders reach shared files through `root`; "./" is the shelf.
  const rooted = depth
    ? html.replace(/(href|src)="(?!https?:|#|data:|mailto:)([^"]*)"/g, (_, attr, target) => `${attr}="${root}${target === './' ? '' : target}"`)
    : html;
  await mkdir(join(OUT, path, '..'), { recursive: true });
  await writeFile(join(OUT, path), rooted);
}

// GitHub Pages lets browsers cache CSS and JS for 10 minutes. A content hash
// in the URL makes each deploy load the new files right away.
const assetHash = createHash('sha256');
for (const file of ['styles.css', 'analytics.js', 'assets/reader.js', 'assets/shelf.js', 'assets/page.js', 'assets/numbers-page.js']) assetHash.update(await readFile(join(OUT, file)));
const version = assetHash.digest('hex').slice(0, 10);

const fragment = async name => readFile(join(SITE, 'pages', name), 'utf8');

const featured = byRank.slice(0, FEATURED_COUNT);
const indexBody = (await fragment('index.html'))
  .replace('<!--FEATURED-->', featured.map((book, i) => cardHTML(shelfBook(book), i)).join('\n'))
  // Only the first page is in the HTML; site/src/shelf.ts draws the rest from shelf.json.
  .replace('<!--SHELF-->', byRank.slice(0, SHELF_PAGE_SIZE).map((book, i) => cardHTML(shelfBook(book), i)).join('\n'))
  .replace('<!--GENRES-->', genres.map(g => `<option>${escapeHTML(g)}</option>`).join(''));
await writePage({
  path: 'index.html',
  nav: 'shelf',
  title: 'Punc: what books look like without words',
  socialTitle: 'Punc: what does a book look like without words?',
  description: `${books.length} famous books with every word taken out and only the punctuation left. Browse the shelf or open your own .txt file.`,
  body: indexBody,
  script: 'shelf.js',
  structuredData: { ...WEBSITE, description: 'Famous books with every word taken out and only the punctuation left.', author: AUTHOR },
});

const readBody = await fragment('read.html');
await writePage({
  path: 'read.html',
  nav: 'read',
  title: 'Read your own · Punc',
  description: 'Open any plain text file and see it as punctuation only. It never leaves your browser.',
  // The upload box shows without waiting for the script, h1 and all.
  body: readBody.replace('<!--POSTER-->', '').replace('<!--AUTHOR-->', '').replace('<section id="upload" class="upload" hidden>', '<section id="upload" class="upload">'),
  script: 'reader.js',
});

// Each book's closest fingerprint on the shelf, named under its own.
const closest = N.twins(shelfNumbers);
const twinLine = book => {
  const { twin } = closest.get(book.slug);
  return `<p class="fp-caption fp-twin">Its punctuation twin, the closest fingerprint on the shelf: <a href="books/${twin.slug}/">${escapeHTML(twin.title)}</a>, ${escapeHTML(twin.author)}. <a href="numbers.html#twins">More twins</a></p>`;
};

// Can the marks name the author: each book of the authors with three or more
// works, held out and guessed. Shown on the numbers page and book pages.
const authors = N.authorsWithWorks(shelfNumbers, 3);
const guesses = N.guessAuthors(authors);
// Authors with two or more works get a section on each of their book pages.
const authorShelf = new Map(N.authorsWithWorks(shelfNumbers, 2).map(({ author, books: list }) => [author, list]));
const numbersBySlug = new Map(shelfNumbers.map(b => [b.slug, b]));
const authorSection = book => {
  const list = authorShelf.get(book.author);
  if (!list) return '';
  const numbers = numbersBySlug.get(book.slug);
  return N.bookAuthorHTML(numbers, list, guesses.find(g => g.book === numbers));
};

const missingShareImages = [];
for (const book of books) {
  const poster = book.cover
    ? `    <a class="book-poster poster" href="https://www.gutenberg.org/ebooks/${book.id}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHTML(book.title)} on Project Gutenberg (opens in a new tab)"><img data-poster src="covers/${book.slug}.jpg" alt=""></a>`
    : '';
  const shareImage = `share/${book.slug}.png`;
  if (!existsSync(join(SITE, shareImage))) missingShareImages.push(book.slug);
  // Search results cut descriptions at about 160 characters; long titles lose
  // the last clause, then the author, then the end of the title.
  const removed = `${book.author}'s ${book.title}${book.published ? ` (${book.published})` : ''} with all ${fmt(book.words)} words removed. ${fmt(book.marks)} punctuation marks are left`;
  const titleOnly = ` with all ${fmt(book.words)} words removed.`;
  const description = [`${removed}, about ${book.wps.toFixed(1)} words to a sentence.`, `${removed}.`, `${book.title}${titleOnly}`].find(d => d.length <= 160)
    ?? `${book.title.slice(0, 159 - titleOnly.length).replace(/\s+\S*$/, '')}…${titleOnly}`;
  await writePage({
    path: `books/${book.slug}/index.html`,
    depth: 2,
    nav: 'shelf',
    title: `${book.title} without words · Punc`,
    socialTitle: `${book.title}, without words`,
    description,
    image: existsSync(join(SITE, shareImage)) ? shareImage : 'og.png',
    imageAlt: `${book.title} as a pink and black punk poster, with the share of each punctuation mark in the book`,
    structuredData: {
      '@type': 'WebPage',
      name: `${book.title}, without words`,
      url: `${SITE_URL}books/${book.slug}/`,
      description,
      isPartOf: WEBSITE,
      about: {
        '@type': 'Book',
        name: book.title,
        author: { '@type': 'Person', name: book.author },
        ...(book.published ? { datePublished: String(book.published) } : {}),
        sameAs: `https://www.gutenberg.org/ebooks/${book.id}`,
      },
    },
    // The head is written in at build time, so search engines get a real h1
    // and nothing below it jumps when the script fills in the rest.
    body: readBody
      .replace('<!--POSTER-->', poster)
      .replace('<!--AUTHOR-->', authorSection(book))
      .replace('<article id="book" class="book" hidden>', '<article id="book" class="book">')
      .replace('<h1 id="book-title" class="book-title"></h1>', `<h1 id="book-title" class="book-title">${escapeHTML(book.title)}</h1>`)
      .replace('<p id="book-byline" class="book-byline"></p>', `<p id="book-byline" class="book-byline">${escapeHTML(book.byline)}</p>`)
      .replace('<dd id="stat-words"></dd>', `<dd id="stat-words">${fmt(book.words)}</dd>`)
      .replace('<dd id="stat-marks"></dd>', `<dd id="stat-marks">${fmt(book.marks)}</dd>`)
      .replace('<dd id="stat-wps"></dd>', `<dd id="stat-wps">${book.wps ? book.wps.toFixed(1) : 'n/a'}</dd>`)
      .replace('<dd id="stat-top" class="serif-mark"></dd>', `<dd id="stat-top" class="serif-mark">${escapeHTML(book.topMark)}</dd>`)
      .replace('<div id="book-fingerprint" class="book-fingerprint"></div>', `<div id="book-fingerprint" class="book-fingerprint">${book.fingerprintLarge}<p class="fp-caption">Its punctuation fingerprint: each mark's share, on the same scale as every book on the shelf.</p>${twinLine(book)}</div>`),
    script: 'reader.js',
    dataset: { slug: book.slug, title: book.title, byline: book.byline },
  });
}

// Label the two books at each extreme and the featured ones; the rest are
// hover-only, or the middle of the map turns into a pile of text.
const mapLabels = [
  ...[...books].sort((a, b) => b.pausesPerStop - a.pausesPerStop).slice(0, 2),
  ...[...books].sort((a, b) => b.loudness - a.loudness).slice(0, 2),
  ...featured,
].map(b => b.slug);

// The numbers page. The measures and charts are in site/src/numbers.ts.
const percentOf = (n, total) => `${Math.round((n / total) * 100)}%`;
const timelineMetrics = ['semicolon', 'comma', 'wps', 'question', 'exclaim', 'dialogue'];
const timelines = timelineMetrics
  .map(key => `      <figure class="chart">
        <figcaption><strong>${N.metric(key).label}</strong>: ${escapeHTML(N.trendSentence(shelfNumbers, key))}</figcaption>
        ${N.timelineSVG(shelfNumbers, key, genres)}
        <p class="map-tip" hidden></p>
      </figure>`)
  .join('\n');

const genrePrints = genres
  .map(genre => {
    const inGenre = shelfNumbers.filter(b => b.genres.includes(genre));
    return `      <li><h3 class="genre-name">${escapeHTML(genre)}</h3><p class="genre-count">${inGenre.length} books</p>${fingerprintHTML(N.averageShares(inGenre.map(b => b.shares)), 'fingerprint fingerprint-large')}</li>`;
  })
  .join('\n');

const typical = N.typicalDistance(shelfNumbers);
const hits = guesses.filter(g => g.guessed === g.book.author).length;
// The author list, and the first author shown in full until another is
// picked; the browser draws the rest, and every career chart.
const guessedBySlug = new Map(guesses.map(g => [g.book.slug, g.guessed]));
const authorPicks = authors
  .map(({ author, books: list }) => `          ${N.authorPickHTML(author, list, guessedBySlug, N.authorSpread(list, typical))}`)
  .join('\n');
// The career chart sits under the author's fingerprint; the browser moves it
// into each author it shows.
const careerFigure = `<figure id="author-career" class="chart career">
            <figcaption><strong>Over a career</strong>: their books in the order they came out (pink), against the median of the shelf's books from within 15 years of each one (dashed). Every author's chart shares one scale.</figcaption>
            <div class="shelf-controls numbers-controls">
              <label>Measure
                <select id="career-pick">
${N.METRICS.map(({ key, label }) => `                  <option value="${key}">${label}</option>`).join('\n')}
                </select>
              </label>
            </div>
            <div class="career-chart"></div>
            <p id="career-none" class="chart-key" hidden>Too few dated books for a career: it takes four from 1600 on, at least eight years apart.</p>
            <p class="map-tip" hidden></p>
          </figure>`;
const firstAuthor = authors[0];
const firstAuthorDetail = N.authorDetailHTML(firstAuthor.author, firstAuthor.books, guessedBySlug, Math.round(N.authorSpread(firstAuthor.books, typical)), careerFigure);

// Compare: every author with two or more books, then every book. The books
// are added in the browser, from numbers.json.
const compareAuthors = N.authorsWithWorks(shelfNumbers, 2);
const compareOptions = picked => `          <optgroup label="Authors">
${compareAuthors.map(({ author }) => `            <option value="author:${escapeHTML(author)}"${author === picked ? ' selected' : ''}>${escapeHTML(author)}</option>`).join('\n')}
          </optgroup>
          <optgroup label="Books"></optgroup>`;
const authorBooks = name => compareAuthors.find(a => a.author === name).books;
const compareDefault = N.compareHTML(N.authorProfile('Jane Austen', authorBooks('Jane Austen')), N.authorProfile('Charles Dickens', authorBooks('Charles Dickens')));

const twinItems = N.surprisingTwins(shelfNumbers)
  .map(pair => `      <li class="twin">${pair
    .map(b => `<div class="twin-book"><a class="twin-title" href="books/${b.slug}/">${escapeHTML(b.title)}</a><p class="twin-detail">${escapeHTML(b.author)}, ${escapeHTML(N.yearText(b))}</p>${fingerprintHTML(b.shares, 'fingerprint fingerprint-large')}</div>`)
    .join('')}</li>`)
  .join('\n');

// Each mark's row averaged over the books that use that mark.
const nextGrid = Array.from({ length: 10 }, (_, row) => {
  const rows = nextMarkGrids.map(g => g[row]).filter(r => r.some(v => v > 0));
  return Array.from({ length: 10 }, (_, col) => rows.reduce((s, r) => s + r[col], 0) / Math.max(rows.length, 1));
});
const clusterItems = [...clusters]
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 12)
  .map(([cluster, { count, books: inBooks }]) => `      <li><span class="cluster-marks">${escapeHTML(cluster)}</span><span class="cluster-count">${fmt(count)} times, in ${inBooks} books</span></li>`)
  .join('\n');

const ranked = shelfNumbers.filter(b => b.rank !== null);
const links = N.METRICS.map(({ key, label }) => ({ key, label, rho: N.spearman(ranked.map(b => b.rank), ranked.map(b => b[key])) }));
const strongest = [...links].sort((a, b) => Math.abs(b.rho) - Math.abs(a.rho))[0];
const answer = Math.abs(strongest.rho) < 0.1 ? 'No.' : Math.abs(strongest.rho) < 0.3 ? 'Barely.' : 'Somewhat.';
const popularity = `${answer} Across the ${ranked.length} ranked books, the closest link between download rank and any measure is for ${strongest.label.toLowerCase()}: a rank correlation of ${strongest.rho.toFixed(2)}, where 0 is no link and 1 or -1 a perfect one.`;
const rankLinks = links.map(({ label, rho }) => `      <li>${label}: ${N.correlationWords(rho)} (${rho.toFixed(2)})</li>`).join('\n');

const recordBooks = shelfNumbers.filter(b => b.words >= 2000);
const recordList = [
  ['Most semicolons', 'semicolon', -1],
  ['Most colons', 'colon', -1],
  ['Most commas', 'comma', -1],
  ['Most exclamation marks', 'exclaim', -1],
  ['Most question marks', 'question', -1],
  ['Longest sentences', 'wps', -1],
  ['Shortest sentences', 'wps', 1],
  ['Most dialogue', 'dialogue', -1],
  ['Most marks', 'marks', -1],
  ['Fewest marks', 'marks', 1],
];
const records = recordList
  .map(([heading, key, order]) => {
    // One book per author, or the volumes of one collected works fill a list.
    const top = [...recordBooks].sort((a, b) => order * (a[key] - b[key])).filter((b, i, all) => all.findIndex(o => o.author === b.author) === i).slice(0, 3);
    return `      <div class="record"><h3 class="record-name">${heading}</h3><ol>${top.map(b => `<li><a href="books/${b.slug}/">${escapeHTML(b.title)}</a>, ${escapeHTML(b.author)}: ${escapeHTML(N.describeValue(key, b[key]))}</li>`).join('')}</ol></div>`;
  })
  .join('\n');

const fill = {
  books: books.length,
  ancient: shelfNumbers.filter(b => b.year !== null && b.year < N.TIMELINE_FROM).length,
  authors: authors.length,
  hits,
  guessed: guesses.length,
  hitRate: percentOf(hits, guesses.length),
  chance: percentOf(1, authors.length),
  popularity: escapeHTML(popularity),
};
const numbersBody = (await fragment('numbers.html'))
  .replace(/\{\{(\w+)\}\}/g, (_, name) => {
    if (!(name in fill)) throw new Error(`numbers.html has no value for {{${name}}}`);
    return String(fill[name]);
  })
  .replace('<!--GENREOPTIONS-->', genres.map(g => `          <option>${escapeHTML(g)}</option>`).join('\n'))
  .replace('<!--TIMELINES-->', timelines)
  .replace('<!--GENREPRINTS-->', genrePrints)
  .replace('<!--AUTHORPICKS-->', authorPicks)
  .replace('<!--AUTHORDETAIL-->', firstAuthorDetail)
  .replace('<!--COMPAREOPTIONS-A-->', compareOptions('Jane Austen'))
  .replace('<!--COMPAREOPTIONS-B-->', compareOptions('Charles Dickens'))
  .replace('<!--COMPARE-->', compareDefault)
  .replace('<!--TWINS-->', twinItems)
  .replace('<!--NEXTGRID-->', N.nextMarkTableHTML(nextGrid))
  .replace('<!--CLUSTERS-->', clusterItems)
  .replace('<!--POPULARITY-->', N.popularitySVG(shelfNumbers, 'wps'))
  .replace('<!--RANKLINKS-->', rankLinks)
  .replace('<!--RECORDS-->', records)
  // The map is drawn in the browser from numbers.json, with these labelled.
  .replace('<!--MAPLABELS-->', mapLabels.join(' '))
  .replace('<!--TABLEHEAD-->', N.TABLE_METRICS.map(key => `<th scope="col">${N.metric(key).label}</th>`).join(''));
await writePage({
  path: 'numbers.html',
  nav: 'numbers',
  title: 'The numbers · Punc',
  socialTitle: 'Punc: the punctuation of famous books, by the numbers',
  description: `${books.length} books by their punctuation alone: how it changed over time, by genre and author, punctuation twins, the grammar of marks, and the map.`,
  body: numbersBody,
  script: 'numbers-page.js',
});

// The map moved to the numbers page; old links land on it there.
await writeFile(
  join(OUT, 'map.html'),
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta http-equiv="refresh" content="0; url=numbers.html#map">
<meta name="robots" content="noindex">
<link rel="canonical" href="${SITE_URL}numbers.html">
<title>The map · Punc</title>
</head>
<body>
<p>The map has moved to <a href="numbers.html#map">the numbers page</a>.</p>
</body>
</html>
`
);

await writePage({
  path: 'about.html',
  nav: 'about',
  title: 'About · Punc',
  description: 'The artist statement behind Punc, how it works, and where the books come from.',
  body: await fragment('about.html'),
  script: 'page.js',
});

await writePage({
  path: '404.html',
  nav: null,
  title: 'Not on the shelf · Punc',
  description: 'There is no page at this address.',
  body: `<article class="about">
  <h1 class="page-title">Not on the shelf</h1>
  <p>There's no page at this address. Try <a href="./">the shelf</a> or <a href="read.html">read your own</a>.</p>
</article>`,
  script: 'page.js',
  notFound: true,
});

// No robots.txt: GitHub Pages only reads one at the domain root, which this
// project site doesn't own. Submit the sitemap in Search Console instead.
await writeFile(
  join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapURLs.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`
);

if (missingShareImages.length) {
  console.warn(`No share card for ${missingShareImages.join(', ')}; those pages share og.png. Run node site/scripts/make-images.mjs after this build.`);
}
console.log(`Built ${books.length} books, ${featured.length} featured, into ${OUT}/`);
