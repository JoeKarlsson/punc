// Builds the static site into site-dist/ for GitHub Pages:
// bundles the browser code, analyzes the shelf books for their covers, and
// wraps each page fragment in the shared layout.
import { build } from 'esbuild';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const SITE = 'site';
const OUT = 'site-dist';

await rm(OUT, { recursive: true, force: true });
await mkdir(join(OUT, 'assets'), { recursive: true });

await build({
  entryPoints: [join(SITE, 'src/reader.ts')],
  bundle: true,
  format: 'esm',
  target: 'es2020',
  minify: true,
  outdir: join(OUT, 'assets'),
});

// The same analysis the browser runs, bundled for Node so the covers match.
const analyzerPath = join(tmpdir(), `punc-site-analyze-${process.pid}.mjs`);
await build({ entryPoints: [join(SITE, 'src/analyze.ts')], bundle: true, platform: 'node', format: 'esm', outfile: analyzerPath });
const { analyzeBook } = await import(pathToFileURL(analyzerPath).href);
await rm(analyzerPath);

const escapeHTML = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const catalog = JSON.parse(await readFile(join(SITE, 'catalog.json'), 'utf8'));
const shelfBooks = await readdir(join(SITE, 'books'));
const COVER_COLORS = ['pink', 'chalk', 'paper'];
const TILTS = [-1.6, 0.9, -0.6, 1.8, -1.1, 0.4, -1.9, 1.3, -0.3];
const covers = [];
for (const [i, meta] of catalog.entries()) {
  if (!shelfBooks.includes(`${meta.slug}.txt`)) throw new Error(`site/books/${meta.slug}.txt is missing`);
  const book = analyzeBook(await readFile(join(SITE, 'books', `${meta.slug}.txt`), 'utf8'));
  // A stretch from a tenth of the way in, past the title page and contents.
  const start = Math.floor(book.marks.length * 0.1);
  const sample = book.marks.slice(start, start + 320).join(' ');
  covers.push(`    <li class="cover cover-${COVER_COLORS[i % COVER_COLORS.length]}" style="--tilt:${TILTS[i % TILTS.length]}deg">
      <a href="read.html?b=${meta.slug}">
        <span class="cover-marks" aria-hidden="true">${escapeHTML(sample)}</span>
        <span class="cover-label"><span class="cover-title">${escapeHTML(meta.title)}</span><span class="cover-author">${escapeHTML(meta.author)}</span></span>
      </a>
      <p class="cover-meta">${book.wordCount.toLocaleString('en-US')} words removed, ${book.marks.length.toLocaleString('en-US')} marks left</p>
    </li>`);
}
await writeFile(join(OUT, 'books.json'), JSON.stringify(catalog));
await cp(join(SITE, 'books'), join(OUT, 'books'), { recursive: true });
await cp(join(SITE, 'styles.css'), join(OUT, 'styles.css'));

const crayonFilter = `<svg class="defs" aria-hidden="true" focusable="false"><filter id="crayon" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.5" result="d"/><feTurbulence type="fractalNoise" baseFrequency="2.2" seed="8" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.5" result="holes"/><feComposite in="d" in2="holes" operator="in"/></filter></svg>`;
const favicon = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#000"/><text x="16" y="25" text-anchor="middle" font-family="Georgia,serif" font-size="28" font-weight="700" fill="#ff4fd8">;</text></svg>')}`;

const PAGES = [
  { file: 'index.html', nav: 'shelf', title: 'Punc', description: 'What does a book look like without words? Browse famous books as punctuation only, or open your own.' },
  { file: 'read.html', nav: 'read', title: 'Read your own · Punc', description: 'Open any plain text file and see it as punctuation only. It never leaves your browser.', script: 'assets/reader.js' },
  { file: 'about.html', nav: 'about', title: 'About · Punc', description: 'The artist statement and credits for Punc.' },
];
const NAV = [
  { key: 'shelf', href: './', label: 'The shelf' },
  { key: 'read', href: 'read.html', label: 'Read your own' },
  { key: 'about', href: 'about.html', label: 'About' },
];

for (const page of PAGES) {
  let body = await readFile(join(SITE, 'pages', page.file), 'utf8');
  body = body.replace('<!--SHELF-->', covers.join('\n'));
  const nav = NAV.map(n => `<a href="${n.href}"${n.key === page.nav ? ' aria-current="page"' : ''}>${n.label}</a>`).join('');
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${page.title}</title>
<meta name="description" content="${escapeHTML(page.description)}">
<link rel="icon" href="${favicon}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Fraunces:opsz,wght@9..144,400..700&family=Hanken+Grotesk:wght@400..700&display=swap">
<link rel="stylesheet" href="styles.css">
</head>
<body>
${crayonFilter}
<a class="skip" href="#main">Skip to the page</a>
<header class="site-header">
  <a class="wordmark" href="./">Punc</a>
  <nav aria-label="Site">${nav}</nav>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <nav class="footer-links" aria-label="Elsewhere">
    <a href="https://joekarlsson.com">joekarlsson.com</a>
    <a href="https://github.com/JoeKarlsson/punc">Source on GitHub</a>
  </nav>
  <p>Punc is an art project by Joe Karlsson. Shelf books from Project Gutenberg.</p>
</footer>
${page.script ? `<script type="module" src="${page.script}"></script>\n` : ''}</body>
</html>
`;
  await writeFile(join(OUT, page.file), html);
}
console.log(`Built ${PAGES.length} pages and ${covers.length} covers into ${OUT}/`);
