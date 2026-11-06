// Renders the favicons (from site/static/favicon.svg, with resvg) and the
// share images (pages in the site's own styles, screenshotted with
// Playwright): og.png and github-social.png into site/static/, and one card
// per book into site/share/. Run by hand after `npm run site:build`:
//   node site/scripts/make-images.mjs
import { Resvg } from '@resvg/resvg-js';
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const STATIC = 'site/static';
const SHARE = 'site/share';
const DIST = 'site-dist';
const SHARE_BOOKS = ['frankenstein', 'pride-and-prejudice', 'moby-dick'];

const svg = await readFile(join(STATIC, 'favicon.svg'));
for (const [name, size] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  await writeFile(join(STATIC, name), png);
}

const ransom = (await readFile('site/pages/index.html', 'utf8')).match(/<h1 class="ransom"[\s\S]*?<\/h1>/)[0];
const posters = SHARE_BOOKS.map(
  (slug, i) => `<li class="cover poster" style="--tilt:${[-4, 3, -2][i]}deg"><a><img data-poster src="covers/${slug}.jpg" alt=""></a></li>`
).join('');
await writeFile(
  join(DIST, '_share.html'),
  `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="styles.css">
<style>
  body { margin: 0; width: 1200px; height: 630px; overflow: hidden; position: relative; }
  /* GitHub's social preview: 1280x640, and its card crops the sides, so the art sits further in */
  body.github { width: 1280px; height: 640px; }
  body.github .ransom, body.github .wordmark { left: 120px; }
  body.github .ransom { font-size: 68px; width: 540px; }
  body.github .url { left: 294px; }
  body.github .shelf { right: 90px; }
  .ransom { position: absolute; left: 56px; top: 84px; width: 600px; font-size: 76px; }
  .ring path { animation: none; stroke-dashoffset: 0; }
  .wordmark { position: absolute; left: 56px; bottom: 40px; font-size: 64px; }
  .url { position: absolute; left: 230px; bottom: 52px; margin: 0; font-family: var(--book); font-weight: 700; font-size: 26px; color: var(--paper); }
  .shelf { position: absolute; right: 40px; top: 70px; display: flex; gap: 0; }
  .cover { width: 190px; margin-left: -30px; }
  .cover:nth-child(2) { margin-top: 70px; }
</style></head><body>
${ransom}
<span class="wordmark">Punc</span><p class="url">joekarlsson.github.io/punc</p>
<ul class="shelf">${posters}</ul>
<script type="module" src="assets/page.js"></script>
</body></html>`
);

// One card per book: its shelf poster, built into the front page by
// site/build.mjs, taped on the left, with the title and the fingerprint big.
const shelfHTML = await readFile(join(DIST, 'index.html'), 'utf8');
const shelfCards = [...shelfHTML.match(/<ul class="shelf" id="shelf">([\s\S]*?)<\/ul>/)[1].matchAll(/<li class="cover poster"[\s\S]*?<\/li>/g)].map(m => m[0]);
const bookCardPage = card => {
  const slug = card.match(/href="books\/([^/]+)\//)[1];
  const title = card.match(/<span class="cover-title">([\s\S]*?)<\/span>/)[1];
  const byline = card.match(/<span class="cover-author">([\s\S]*?)<\/span>/)[1];
  const fingerprint = card.match(/<p class="fingerprint[\s\S]*?<\/p>/)[0].replace('class="fingerprint', 'class="fingerprint fingerprint-large');
  const poster = card
    .replace(/<p class="cover-meta">[\s\S]*?<\/p>/, '')
    .replace(/<p class="fingerprint[\s\S]*?<\/p>/, '')
    .replace(/<span class="cover-label">[\s\S]*?<\/span><\/span>/, '')
    .replace(' loading="lazy"', '')
    .replace(/href="[^"]*"/, '');
  const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="styles.css">
<style>
  body { margin: 0; width: 1200px; height: 630px; overflow: hidden; position: relative; }
  .shelf { position: absolute; left: 70px; top: 58px; width: 330px; display: block; }
  .cover { --tilt: -2.5deg !important; }
  .side { position: absolute; left: 470px; top: 58px; right: 60px; bottom: 50px; display: flex; flex-direction: column; }
  .book-title { max-width: none; font-size: 110px; line-height: 0.95; }
  .book-byline { align-self: flex-start; font-size: 28px; margin-top: 18px; }
  .fingerprint-large { margin: auto 0 0; width: 470px; --fp-height: 90px; font-size: 30px; }
  .wordmark { position: absolute; right: 60px; bottom: 44px; font-size: 64px; }
</style></head><body>
<ul class="shelf">${poster}</ul>
<div class="side">
  <h1 class="book-title">${title}</h1>
  <p class="book-byline">${byline}</p>
  ${fingerprint}
</div>
<span class="wordmark">Punc</span>
<script type="module" src="assets/page.js"></script>
</body></html>`;
  return { slug, html };
};

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^\/+/, '');
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(await readFile(join(DIST, path)));
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);
const { port } = server.address();

const browser = await chromium.launch();
try {
  // og.png: the page preview for social cards. github-social.png: the repo's
  // social preview, uploaded by hand in the repo's settings.
  await mkdir(SHARE, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const card of shelfCards) {
    const { slug, html } = bookCardPage(card);
    await writeFile(join(DIST, '_share-book.html'), html);
    await page.goto(`http://localhost:${port}/_share-book.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => !document.querySelector('img[data-poster]') || document.querySelector('.poster-art'));
    await page.evaluate(() => document.fonts.ready);
    // Long titles shrink until they leave room for the byline and the fingerprint.
    await page.evaluate(() => {
      const title = document.querySelector('.book-title');
      let size = 110;
      while (title.getBoundingClientRect().height > 300 && size > 40) title.style.fontSize = `${(size -= 4)}px`;
    });
    await page.screenshot({ path: join(SHARE, `${slug}.png`) });
  }
  await page.close();
  await rm(join(DIST, '_share-book.html'));

  for (const [file, width, height, bodyClass] of [['og.png', 1200, 630, ''], ['github-social.png', 1280, 640, 'github']]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(`http://localhost:${port}/_share.html`, { waitUntil: 'networkidle' });
    await page.evaluate(name => name && document.body.classList.add(name), bodyClass);
    await page.waitForFunction(n => document.querySelectorAll('.poster-art').length === n, SHARE_BOOKS.length);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: join(STATIC, file) });
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
  await rm(join(DIST, '_share.html'));
}
console.log(`Wrote favicons, og.png and github-social.png to ${STATIC}/, and ${shelfCards.length} book cards to ${SHARE}/`);
