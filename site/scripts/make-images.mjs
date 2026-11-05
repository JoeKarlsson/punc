// Renders the favicons (from site/static/favicon.svg, with resvg) and the
// 1200x630 share image (a page in the site's own styles, screenshotted with
// Playwright) into site/static/. Run by hand after `npm run site:build`:
//   node site/scripts/make-images.mjs
import { Resvg } from '@resvg/resvg-js';
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const STATIC = 'site/static';
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
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Fraunces:opsz,wght@9..144,400..700&display=swap">
<link rel="stylesheet" href="styles.css">
<style>
  body { margin: 0; width: 1200px; height: 630px; overflow: hidden; position: relative; }
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

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg' };
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
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(`http://localhost:${port}/_share.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(n => document.querySelectorAll('.poster-art').length === n, SHARE_BOOKS.length);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(STATIC, 'og.png') });
} finally {
  await browser.close();
  server.close();
  await rm(join(DIST, '_share.html'));
}
console.log(`Wrote favicons and og.png to ${STATIC}/`);
