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
import { execFileSync } from 'node:child_process';

const SITE = 'site';
const OUT = 'site-dist';
const SITE_URL = 'https://punc.joekarlsson.com/';

await rm(OUT, { recursive: true, force: true });
await mkdir(join(OUT, 'assets'), { recursive: true });

await build({
  entryPoints: [join(SITE, 'src/reader.ts'), join(SITE, 'src/shelf.ts'), join(SITE, 'src/page.ts'), join(SITE, 'src/numbers-page.ts'), join(SITE, 'src/analyze-worker.ts'), join(SITE, 'src/spiral-worker.ts')],
  bundle: true,
  format: 'esm',
  target: 'es2020',
  minify: true,
  outdir: join(OUT, 'assets'),
});

// The same analysis the browser runs, bundled for Node so the numbers match.
const analyzerPath = join(tmpdir(), `punc-site-analyze-${process.pid}.mjs`);
await build({ entryPoints: [join(SITE, 'src/node-entry.ts')], bundle: true, platform: 'node', format: 'esm', outfile: analyzerPath });
const { analyzeBook, bookPageTitle, booksIndexHTML, cardHTML, countsHTML, fingerprintHTML, markShares, marksThroughBook, numbers: N, TRACKED_MARKS, shelfPosition, SHELF_PAGE_SIZE, throughBookHTML } = await import(pathToFileURL(analyzerPath).href);
await rm(analyzerPath);

// GitHub Pages can't send headers, so the policy rides in a meta tag, first in
// <head> so it covers everything after it. A meta CSP can't set
// frame-ancestors, so it gives no clickjacking protection. Style attributes
// (card tilts, chart positions) need 'unsafe-inline' in style-src-attr; scripts get
// none. No upgrade-insecure-requests: Pages is https-only and the site has no
// http:// assets (a test checks), and WebKit would apply it to localhost.
const PLAUSIBLE = 'https://plausible.joekarlsson.io';
const CSP = [
  "default-src 'self'",
  `script-src 'self' ${PLAUSIBLE}`,
  `connect-src 'self' ${PLAUSIBLE}`,
  "style-src 'self'",
  "style-src-attr 'unsafe-inline'",
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
// The day site/scripts/fetch-books.mjs last fetched the shelf.
const fetched = (await readFile(join(SITE, 'fetched.txt'), 'utf8')).trim();
if (!/^\d{4}-\d{2}-\d{2}$/.test(fetched)) throw new Error(`site/fetched.txt should be a YYYY-MM-DD date, not "${fetched}"`);

// A page's sitemap lastmod is the later of the fetch date and the last commit to
// its sources: the templates every page shares plus its own page fragment. A
// shallow clone only knows its newest commit, so it can't date them.
const PAGE_TEMPLATES = ['site/build.mjs', 'site/src', 'site/catalog.json'];
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const shallowClone = git('rev-parse', '--is-shallow-repository') === 'true';
if (shallowClone) console.warn('Shallow git clone: every sitemap lastmod is the fetch date. Deploy from a full clone (fetch-depth: 0).');
const lastmodBySources = new Map();
function lastmodFor(sources) {
  const files = [...PAGE_TEMPLATES, ...sources];
  const key = files.join('\n');
  if (!lastmodBySources.has(key)) {
    const committed = shallowClone ? '' : git('log', '-1', '--format=%cs', '--', ...files);
    lastmodBySources.set(key, committed > fetched ? committed : fetched);
  }
  return lastmodBySources.get(key);
}
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
    // Written into the book page, so the counts are in the HTML without the script.
    countsList: countsHTML(book.counts),
    throughBook: throughBookHTML(marksThroughBook(book.marks)),
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
  return `<p class="share">Share it on ${links.join(', ')}, or <button type="button" class="link-button copy-button" data-copy-link="${escapeHTML(url)}"><span class="copy-idle">copy the link</span><span class="copy-done" aria-hidden="true">Copied</span></button>.</p>`;
}

const sitemapURLs = [];

// notFound: GitHub Pages serves 404.html at any missing path, so its links
// resolve from the site root, and it stays out of search and the sitemap.
async function writePage({ path, nav, title, socialTitle, description, body, script, depth = 0, dataset = {}, image = 'og.png', imageAlt, structuredData, notFound = false, sources = [] }) {
  const url = SITE_URL + path.replace(/index\.html$/, '');
  const root = '../'.repeat(depth);
  const navHTML = NAV.map(n => `<a href="${n.href}"${n.key === nav ? ' aria-current="page"' : ''}>${n.label}</a>`).join('');
  const data = Object.entries({ ...dataset, root, ...(notFound ? { 'not-found': 'true' } : {}) }).map(([k, v]) => ` data-${k}="${escapeHTML(v)}"`).join('');
  const imageURL = SITE_URL + image;
  const jsonLD = structuredData
    ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', ...structuredData }).replace(/</g, '\\u003c')}</script>\n`
    : '';
  if (!notFound) sitemapURLs.push({ url, lastmod: lastmodFor(sources) });
  const alt = imageAlt ?? 'A ransom note cut from pink and white paper asks: What does a book look like without words?';
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="referrer" content="strict-origin-when-cross-origin">
${notFound ? '<base href="/">\n' : ''}<title>${escapeHTML(title)}</title>
<meta name="description" content="${escapeHTML(description)}">
${notFound ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url}">`}
<meta name="color-scheme" content="only dark">
<meta name="darkreader-lock">
<meta name="theme-color" content="#000000">
<meta name="author" content="Joe Karlsson">
${path === 'index.html' ? '<meta name="google-site-verification" content="QRPrUDjca6IhevyDBOqQCygKZqp45Xyrr2HZooS1LSE">\n<meta name="msvalidate.01" content="BA95135B22E369C003B007BEE5ECC2F2">\n' : ''}<link rel="icon" href="favicon-32.png" sizes="32x32" type="image/png">
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
    <a href="books/">Every book, A to Z</a>
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
for (const file of ['styles.css', 'analytics.js', 'assets/reader.js', 'assets/shelf.js', 'assets/page.js', 'assets/numbers-page.js', 'assets/analyze-worker.js']) assetHash.update(await readFile(join(OUT, file)));
const version = assetHash.digest('hex').slice(0, 10);

// <!--FIGURE:name|alt--> in a page becomes site/figures/<name>.svg inline, with its
// .phone.svg for narrow screens: animated figures from the joekarlsson.com write-up.
// Inline so they use the page's fonts; site/src/figures.ts plays each when Play is pressed.
const inlineFigures = async html => {
  for (const [marker, name, alt] of [...html.matchAll(/<!--FIGURE:([\w-]+)\|([^>]*)-->/g)]) {
    const svg = async file =>
      (await readFile(join(SITE, 'figures', file), 'utf8')).replace(/aria-label="[^"]*"/, `aria-label="${escapeHTML(alt)}"`);
    // A function, so $' or $& inside an SVG isn't read as a replacement pattern
    const figure = `<figure class="anim-figure"><div class="figure-wide">${await svg(`${name}.svg`)}</div><div class="figure-phone">${await svg(`${name}.phone.svg`)}</div><button type="button" class="button figure-play">Play</button></figure>`;
    html = html.replace(marker, () => figure);
  }
  return html;
};
const fragment = async name => inlineFigures(await readFile(join(SITE, 'pages', name), 'utf8'));

const indexBody = (await fragment('index.html'))
  // Only the first page is in the HTML; site/src/shelf.ts draws the rest from shelf.json.
  .replace('<!--SHELF-->', byRank.slice(0, SHELF_PAGE_SIZE).map((book, i) => cardHTML(shelfBook(book), i)).join('\n'))
  .replace('<!--GENRES-->', genres.map(g => `<option>${escapeHTML(g)}</option>`).join(''));
await writePage({
  path: 'index.html',
  nav: 'shelf',
  title: 'Punc: famous books as punctuation only, without words',
  socialTitle: 'Punc: what does a book look like without words?',
  description: `${fmt(books.length)} famous books with every word taken out and only the punctuation left. Browse the shelf or bring your own text.`,
  body: indexBody,
  script: 'shelf.js',
  sources: ['site/pages/index.html'],
  structuredData: { ...WEBSITE, description: 'Famous books with every word taken out and only the punctuation left.', author: AUTHOR },
});

const readBody = await fragment('read.html');
await writePage({
  path: 'read.html',
  nav: 'read',
  title: 'Read your own · Punc',
  description: 'Open a plain text file or paste some text and see it as punctuation only. It never leaves your browser.',
  // The upload box shows without waiting for the script, h1 and all.
  body: readBody.replace('<!--POSTER-->', '').replace('<!--AUTHOR-->', '').replace('<section id="upload" class="upload" hidden>', '<section id="upload" class="upload">')
    // Its h1 is "Read your own"; site/src/reader.ts makes the title the h1 once a book is open.
    .replace('<h1 id="book-title" class="book-title"></h1>', '<h2 id="book-title" class="book-title"></h2>'),
  script: 'reader.js',
  sources: ['site/pages/read.html'],
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
// Every book with a named author gets a section on its author; "Various" and
// "Anonymous" aren't one.
const authorShelf = new Map(N.authorsWithWorks(shelfNumbers, 1).map(({ author, books: list }) => [author, list]));
const authorPrints = N.authorFingerprints(shelfNumbers);
const medians = N.shelfMedians(shelfNumbers);
const numbersBySlug = new Map(shelfNumbers.map(b => [b.slug, b]));
const authorSection = book => {
  const list = authorShelf.get(book.author);
  if (!list) return '';
  const numbers = numbersBySlug.get(book.slug);
  return N.bookAuthorHTML(numbers, list, guesses.find(g => g.book === numbers), authorPrints, medians);
};

const missingShareImages = [];
for (const book of books) {
  const poster = book.cover
    ? `    <a class="book-poster poster" href="https://www.gutenberg.org/ebooks/${book.id}" target="_blank" rel="noopener noreferrer" aria-label="On Gutenberg: ${escapeHTML(book.title)} (opens in a new tab)"><img data-poster src="covers/${book.slug}.jpg" alt=""><span class="poster-source" aria-hidden="true">On Gutenberg</span></a>`
    : '';
  const shareImage = `share/${book.slug}.png`;
  if (!existsSync(join(SITE, shareImage))) missingShareImages.push(book.slug);
  // Search results cut descriptions at about 160 characters; long titles lose
  // the last clause, then the author, then the end of the title.
  const removed = `${book.author}'s ${book.title}${book.published ? ` (${book.published})` : ''} with every word removed. ${fmt(book.marks)} punctuation marks are left`;
  const titleOnly = ' with every word removed.';
  const description = [`${removed}, about ${book.wps.toFixed(1)} words to a sentence.`, `${removed}.`, `${book.title}${titleOnly}`].find(d => d.length <= 160)
    ?? `${book.title.slice(0, 159 - titleOnly.length).replace(/\s+\S*$/, '')}…${titleOnly}`;
  await writePage({
    path: `books/${book.slug}/index.html`,
    depth: 2,
    title: bookPageTitle(book.title),
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
      inLanguage: 'en',
      author: AUTHOR,
      ...(existsSync(join(SITE, shareImage)) ? { primaryImageOfPage: { '@type': 'ImageObject', url: SITE_URL + shareImage, width: 1200, height: 630 } } : {}),
      about: {
        '@type': 'Book',
        name: book.title,
        author: { '@type': 'Person', name: book.author },
        ...(book.published ? { datePublished: String(book.published) } : {}),
        sameAs: `https://www.gutenberg.org/ebooks/${book.id}`,
      },
    },
    sources: ['site/pages/read.html'],
    // The head is written in at build time, so search engines get a real h1
    // and nothing below it jumps when the script fills in the rest.
    body: readBody
      // Book pages have no upload box.
      .replace(/<section id="upload"[\s\S]*?<\/section>\n*/, '')
      .replace('<!--POSTER-->', poster)
      .replace('<!--AUTHOR-->', authorSection(book))
      .replace('<article id="book" class="book" hidden>', '<article id="book" class="book">')
      .replace('<h1 id="book-title" class="book-title"></h1>', `<h1 id="book-title" class="book-title${book.title.length > 40 || book.title.split(/[\s\-—]+/).some(w => w.length > 14) ? ' book-title-long' : ''}">${escapeHTML(book.title)}</h1>`)
      .replace('<p id="book-byline" class="book-byline"></p>', `<p id="book-byline" class="book-byline">${escapeHTML(book.byline)}</p>`)
      .replace('<dd id="stat-marks"></dd>', `<dd id="stat-marks">${fmt(book.marks)}</dd>`)
      .replace('<dd id="stat-wps"></dd>', `<dd id="stat-wps">${book.wps ? book.wps.toFixed(1) : 'n/a'}</dd>`)
      .replace('<dd id="stat-top" class="serif-mark"></dd>', `<dd id="stat-top" class="serif-mark">${escapeHTML(book.topMark)}</dd>`)
      .replace('<div id="through-book"></div>', `<div id="through-book">${book.throughBook}</div>`)
      .replace('<ol id="counts" class="counts"></ol>', `<ol id="counts" class="counts">${book.countsList}</ol>`)
      .replace('<div id="book-fingerprint" class="book-fingerprint"></div>', `<div id="book-fingerprint" class="book-fingerprint">${book.fingerprintLarge}<p class="fp-caption">Its punctuation fingerprint: each mark's share, on the same scale as every book on the shelf.</p>${twinLine(book)}</div>`),
    script: 'reader.js',
    dataset: { slug: book.slug, title: book.title, byline: book.byline },
  });
}

// Label the two books at each extreme and the four most read; the rest are
// hover-only, or the middle of the map turns into a pile of text.
const mapLabels = [
  ...[...books].sort((a, b) => b.pausesPerStop - a.pausesPerStop).slice(0, 2),
  ...[...books].sort((a, b) => b.loudness - a.loudness).slice(0, 2),
  ...byRank.slice(0, 4),
].map(b => b.slug);

// The numbers page. The measures and charts are in site/src/numbers.ts.
const percentOf = (n, total) => `${Math.round((n / total) * 100)}%`;
const timelineMetrics = ['semicolon', 'comma', 'wps', 'question', 'exclaim', 'dialogue'];
const timelines = timelineMetrics
  .map(key => `      <figure class="chart">
        <figcaption><strong>${N.metric(key).label}</strong>: ${escapeHTML(N.trendSentence(shelfNumbers, key))}${key === 'wps' ? '. Dotted: counting ; and : as stops too' : ''}</figcaption>
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

const twinPairs = N.surprisingTwins(shelfNumbers);
const twinItems = twinPairs
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
const popularityClaim = Math.abs(strongest.rho) < 0.1 ? 'Popular books punctuate like the rest.' : Math.abs(strongest.rho) < 0.3 ? 'Popular books punctuate almost like the rest.' : 'Popular books punctuate a little differently.';
// A real minus sign, not a hyphen
const signed = n => n.toFixed(2).replace('-', '−');
const popularity = `Across the ${fmt(ranked.length)} ranked books, the closest link between download rank and any measure is for ${strongest.label.toLowerCase()}: a rank correlation of ${signed(strongest.rho)}, where 0 is no link and 1 or −1 a perfect one.`;
const rankLinks = links.map(({ label, rho }) => `      <li>${label}: ${N.correlationWords(rho)} (${signed(rho)})</li>`).join('\n');

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

// The findings the page leads with.
const shrink = N.shrinkingSentence(shelfNumbers);
const withoutMarks = N.hitRateWithout(authors).sort((a, b) => a.rate - b.rate);
const genreMedian = (genre, key) => N.median(shelfNumbers.filter(b => b.genres.includes(genre)).map(b => b[key]));
const genresBy = key => [...genres].sort((a, b) => genreMedian(a, key) - genreMedian(b, key));
const mostDialogue = genresBy('dialogue').at(-1);
const [quietest, nextQuietest] = genresBy('exclaim');
const genreFinding = `${mostDialogue} has the most dialogue, ${N.formatValue('dialogue', genreMedian(mostDialogue, 'dialogue'))} of its words inside quotation marks. The quietest are ${quietest} (${N.formatValue('exclaim', genreMedian(quietest, 'exclaim'))} exclamation marks per 1,000 words) and ${nextQuietest} (${N.formatValue('exclaim', genreMedian(nextQuietest, 'exclaim'))}).`;
const [twinA, twinB] = twinPairs[0];
const twinText = b => `<cite><a href="books/${b.slug}/">${escapeHTML(b.title)}</a></cite> (${escapeHTML(N.yearText(b))})`;
const percent = rate => `${Math.round(rate * 100)}%`;

const fetchedText = new Date(`${fetched}T12:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
const fill = {
  books: fmt(books.length),
  semicolons: escapeHTML(N.trendSentence(shelfNumbers, 'semicolon')),
  firstSpan: N.spanText(shrink.first),
  lastSpan: N.spanText(shrink.last),
  sentenceFrom: N.formatValue('wps', shrink.sentence[0]),
  sentenceTo: N.formatValue('wps', shrink.sentence[1]),
  clauseTo: N.formatValue('wps', shrink.clause[1]),
  punctuationShare: percent(shrink.punctuationShare),
  genreFinding: escapeHTML(genreFinding),
  withoutLow: percent(withoutMarks[0].rate),
  withoutHigh: percent(withoutMarks.at(-1).rate),
  markMost: withoutMarks[0].name,
  markLeast: withoutMarks.at(-1).name,
  twins: `${twinText(twinA)} and ${twinText(twinB)}`,
  ancient: shelfNumbers.filter(b => b.year !== null && b.year < N.TIMELINE_FROM).length,
  authors: authors.length,
  hits,
  guessed: guesses.length,
  hitRate: percentOf(hits, guesses.length),
  chance: percentOf(1, authors.length),
  popularity: escapeHTML(popularity),
  popularityClaim,
  fetched: fetchedText,
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
  title: 'Punc: the punctuation of famous books, by the numbers',
  description: `Punc took the words out of ${fmt(books.length)} books. Semicolons nearly vanished, sentences got shorter, and the marks alone name the author ${percentOf(hits, guesses.length)} of the time.`,
  body: numbersBody,
  script: 'numbers-page.js',
  sources: ['site/pages/numbers.html'],
  structuredData: {
    '@type': 'Dataset',
    name: 'Punc: the punctuation of famous books',
    description: `Punctuation counts for the ${fmt(books.length)} most downloaded Project Gutenberg books with a plain text: each mark's share, semicolons, commas, colons, dashes, question and exclamation marks per 1,000 words, words per sentence and the share of words in dialogue.`,
    url: `${SITE_URL}numbers.html`,
    creator: AUTHOR,
    isBasedOn: { '@type': 'WebSite', name: 'Project Gutenberg', url: 'https://www.gutenberg.org/' },
    dateModified: fetched,
    distribution: { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `${SITE_URL}numbers.json` },
  },
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
  title: 'About Punc: how it strips books to punctuation',
  description: 'The artist statement behind Punc, how it works, and where the books come from.',
  body: await fragment('about.html'),
  script: 'page.js',
  sources: ['site/pages/about.html'],
});

await writePage({
  path: 'books/index.html',
  depth: 1,
  title: 'Every book on the shelf, A to Z · Punc',
  description: `All ${fmt(books.length)} books on Punc's shelf by title, each a link to its punctuation with every word taken out.`,
  body: `<article class="az">
  <h1 class="page-title">Every book, A to Z</h1>
  <p class="lede">All ${fmt(books.length)} books on the shelf, filed by title without "The", "A" or "An". Each one opens as punctuation only.</p>
${booksIndexHTML(books)}
</article>`,
  script: 'page.js',
});

const TRACKED_ORDER = TRACKED_MARKS.map(({ mark, name }) => `${mark} (${name})`).join(', ');
// For AI tools that read llms.txt: what the site is and where its data lives.
await writeFile(
  join(OUT, 'llms.txt'),
  `# Punc

> Punc takes every word out of a book and leaves only the punctuation, in the order it was written. The shelf holds the ${fmt(books.length)} most downloaded Project Gutenberg books that have a plain text, fetched ${fetchedText}. It's an art project by Joe Karlsson.

Punc counts every punctuation mark left after the letters and numbers are removed. Curly quotes and long dashes count as their plain ASCII marks. Words are counted only to give rates: most measures are marks per 1,000 words.

## Pages

- [The numbers](${SITE_URL}numbers.html): what the marks show across the shelf, over time, by genre and by author
- [Every book, A to Z](${SITE_URL}books/): a page per book with its mark counts, its punctuation fingerprint and how its marks change through the book
- [About](${SITE_URL}about.html): the artist statement and how Punc works
- [Read your own](${SITE_URL}read.html): any text as punctuation only, in the browser

## Data

- [numbers.json](${SITE_URL}numbers.json): one object per book. slug, title, author, year (first published, or null), yearLabel (the year as shown), genres, rank (Gutenberg download rank), words; shares: each mark's share of all marks, in the order ${TRACKED_ORDER}; pausesPerStop: commas, semicolons, colons and dashes per sentence ending; loudness: the share of marks that are ? or !; ${N.METRICS.map(({ key, unit }) => `${key}: ${key === 'dialogue' ? 'the share, 0 to 1, of the words inside quotation marks' : unit}`).join('; ')}.
`
);

await writePage({
  path: '404.html',
  nav: null,
  title: 'Not on the shelf · Punc',
  description: 'There is no page at this address.',
  body: `<article class="about">
  <h1 class="page-title">Not on the shelf</h1>
  <p>There's no page at this address. Try <a href="./">the shelf</a> or <a href="read.html">read your own</a>.</p>
  <p id="closest-page" hidden></p>
</article>`,
  script: 'page.js',
  notFound: true,
});

// robots.txt and .well-known/security.txt come from site/static: the site has its own
// domain, so GitHub Pages serves them at the root.
await writeFile(
  join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapURLs.map(({ url, lastmod }) => `  <url><loc>${url}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`
);

if (missingShareImages.length) {
  console.warn(`No share card for ${missingShareImages.join(', ')}; those pages share og.png. Run node site/scripts/make-images.mjs after this build.`);
}
console.log(`Built ${books.length} books into ${OUT}/`);
