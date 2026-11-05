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
  entryPoints: [join(SITE, 'src/reader.ts'), join(SITE, 'src/shelf.ts'), join(SITE, 'src/page.ts')],
  bundle: true,
  format: 'esm',
  target: 'es2020',
  minify: true,
  outdir: join(OUT, 'assets'),
});

// The same analysis the browser runs, bundled for Node so the numbers match.
const analyzerPath = join(tmpdir(), `punc-site-analyze-${process.pid}.mjs`);
await build({ entryPoints: [join(SITE, 'src/analyze.ts')], bundle: true, platform: 'node', format: 'esm', outfile: analyzerPath });
const { analyzeBook } = await import(pathToFileURL(analyzerPath).href);
await rm(analyzerPath);

const escapeHTML = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = n => n.toLocaleString('en-US');

const catalog = JSON.parse(await readFile(join(SITE, 'catalog.json'), 'utf8'));
const TILTS = [-1.6, 0.9, -0.6, 1.8, -1.1, 0.4, -1.9, 1.3, -0.3];
const books = [];
for (const meta of catalog) {
  const textPath = join(SITE, 'books', `${meta.slug}.txt.gz`);
  if (!existsSync(textPath)) throw new Error(`${textPath} is missing; run site/scripts/fetch-books.mjs`);
  const book = analyzeBook(gunzipSync(await readFile(textPath)).toString('utf8'));
  // A stretch from a tenth of the way in, past the title page and contents.
  const start = Math.floor(book.marks.length * 0.1);
  books.push({
    ...meta,
    byline: meta.lifespan ? `${meta.author}, ${meta.lifespan}` : meta.author,
    authorSort: meta.author.split(' ').at(-1),
    sample: book.marks.slice(start, start + 90).join(' '),
    words: book.wordCount,
    marks: book.marks.length,
    wps: book.wordsPerSentence,
    density: (book.marks.length / Math.max(book.wordCount, 1)) * 100,
  });
}
const byRank = [...books].sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
const genres = [...new Set(books.flatMap(b => b.genres))].sort();

function card(book, i) {
  const poster = book.cover
    ? `<img data-poster src="covers/${book.slug}.jpg" alt="" loading="lazy" decoding="async">`
    : '';
  return `    <li class="cover poster" style="--tilt:${TILTS[i % TILTS.length]}deg" data-title="${escapeHTML(book.title)}" data-author="${escapeHTML(book.author)}" data-author-sort="${escapeHTML(book.authorSort)}" data-genres="${escapeHTML(book.genres.join('|'))}" data-rank="${book.rank ?? 9999}" data-born="${book.born ?? 9999}" data-words="${book.words}" data-wps="${book.wps.toFixed(2)}" data-density="${book.density.toFixed(2)}">
      <a href="books/${book.slug}/">
        ${poster}
        <span class="poster-marks" aria-hidden="true">${escapeHTML(book.sample)}</span>
        <span class="cover-label"><span class="cover-title">${escapeHTML(book.title)}</span><span class="cover-author">${escapeHTML(book.author)}</span></span>
      </a>
      <p class="cover-meta">${fmt(book.words)} words removed, ${fmt(book.marks)} marks left</p>
    </li>`;
}

await writeFile(join(OUT, 'books.json'), JSON.stringify(catalog));
await mkdir(join(OUT, 'books'), { recursive: true });
for (const book of books) await cp(join(SITE, 'books', `${book.slug}.txt.gz`), join(OUT, 'books', `${book.slug}.txt.gz`));
await cp(join(SITE, 'covers'), join(OUT, 'covers'), { recursive: true });
await cp(join(SITE, 'static'), OUT, { recursive: true });
await cp(join(SITE, 'styles.css'), join(OUT, 'styles.css'));

const crayonFilter = `<svg class="defs" aria-hidden="true" focusable="false"><filter id="crayon" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.5" result="d"/><feTurbulence type="fractalNoise" baseFrequency="2.2" seed="8" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.5" result="holes"/><feComposite in="d" in2="holes" operator="in"/></filter></svg>`;

const NAV = [
  { key: 'shelf', href: './', label: 'The shelf' },
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
  const links = networks.map(([label, href]) => `<a href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`);
  return `<p class="share">Share it on ${links.join(', ')}, or <button type="button" class="link-button" data-copy-link="${escapeHTML(url)}">copy the link</button>.</p>`;
}

async function writePage({ path, nav, title, socialTitle, description, body, script, depth = 0, dataset = {}, imageAlt }) {
  const url = SITE_URL + path.replace(/index\.html$/, '');
  const root = '../'.repeat(depth);
  const navHTML = NAV.map(n => `<a href="${n.href}"${n.key === nav ? ' aria-current="page"' : ''}>${n.label}</a>`).join('');
  const data = Object.entries({ ...dataset, root }).map(([k, v]) => ` data-${k}="${escapeHTML(v)}"`).join('');
  const image = `${SITE_URL}og.png`;
  const alt = imageAlt ?? 'A ransom note cut from pink and white paper asks: What does a book look like without words?';
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHTML(title)}</title>
<meta name="description" content="${escapeHTML(description)}">
<link rel="canonical" href="${url}">
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
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${escapeHTML(alt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHTML(socialTitle ?? title)}">
<meta name="twitter:description" content="${escapeHTML(description)}">
<meta name="twitter:image" content="${image}">
<meta name="twitter:image:alt" content="${escapeHTML(alt)}">
<meta name="twitter:site" content="@joekarlsson1">
<meta name="twitter:creator" content="@joekarlsson1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Fraunces:opsz,wght@9..144,400..700&family=Hanken+Grotesk:wght@400..700&display=swap">
<link rel="stylesheet" href="styles.css?v=${version}">
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
${shareLinks(url, socialTitle ?? title)}
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
for (const file of ['styles.css', 'assets/reader.js', 'assets/shelf.js', 'assets/page.js']) assetHash.update(await readFile(join(OUT, file)));
const version = assetHash.digest('hex').slice(0, 10);

const fragment = async name => readFile(join(SITE, 'pages', name), 'utf8');

const featured = byRank.slice(0, FEATURED_COUNT);
const indexBody = (await fragment('index.html'))
  .replace('<!--FEATURED-->', featured.map(card).join('\n'))
  .replace('<!--SHELF-->', byRank.map(card).join('\n'))
  .replace('<!--GENRES-->', genres.map(g => `<option>${escapeHTML(g)}</option>`).join(''));
await writePage({
  path: 'index.html',
  nav: 'shelf',
  title: 'Punc: what books look like without words',
  socialTitle: 'Punc: what does a book look like without words?',
  description: `${books.length} famous books with every word taken out and only the punctuation left. Browse the shelf or open your own .txt file.`,
  body: indexBody,
  script: 'shelf.js',
});

const readBody = await fragment('read.html');
await writePage({
  path: 'read.html',
  nav: 'read',
  title: 'Read your own · Punc',
  description: 'Open any plain text file and see it as punctuation only. It never leaves your browser.',
  body: readBody.replace('<!--POSTER-->', ''),
  script: 'reader.js',
});

for (const book of books) {
  const poster = book.cover
    ? `    <figure class="book-poster poster" aria-hidden="true"><img data-poster src="covers/${book.slug}.jpg" alt=""></figure>`
    : '';
  await writePage({
    path: `books/${book.slug}/index.html`,
    depth: 2,
    nav: 'shelf',
    title: `${book.title} without words · Punc`,
    socialTitle: `${book.title}, without words`,
    description: `${book.author}'s ${book.title} with all ${fmt(book.words)} words removed. ${fmt(book.marks)} punctuation marks are left, about ${book.wps.toFixed(1)} words to a sentence.`,
    body: readBody.replace('<!--POSTER-->', poster),
    script: 'reader.js',
    dataset: { slug: book.slug, title: book.title, byline: book.byline },
  });
}

await writePage({
  path: 'about.html',
  nav: 'about',
  title: 'About · Punc',
  description: 'The artist statement behind Punc, how it works, and where the books come from.',
  body: await fragment('about.html'),
  script: 'page.js',
});

console.log(`Built ${books.length} books, ${featured.length} featured, into ${OUT}/`);
