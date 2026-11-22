// Pictures for the numbers page's tiles and the About page's features:
// crops of the built site, 720x300 WebP in site/static/features/.
// Run after npm run site:build, then build again: node site/scripts/feature-shots.mjs
// Needs cwebp (brew install webp).
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';

const DIST = 'site-dist';
const OUT = 'site/static/features';
const W = 720;
const H = 300;

// [name, page, element, where in the element the crop sits ('fit' shows all of its width), viewport width]
const SHOTS = [
  ['semicolons', 'numbers.html', '#time .chart-row > figure:nth-child(1) svg', 'middle'],
  ['sentences', 'numbers.html', '#time .chart-row > figure:nth-child(3) svg', 'middle'],
  ['authors', 'numbers.html', '#authors .author-explorer', 'top'],
  ['genres', 'numbers.html', '#genres .genre-prints', 'top'],
  // Narrow, so both books of the pair fit in one crop
  ['twins', 'numbers.html', '#twins .twin-list > li:first-child', 'fit', 620],
  ['map', 'numbers.html', '#numbers-map svg', 'middle'],
  ['shelf', './', '#shelf', 'top'],
  ['book', 'books/frankenstein/', '.book-head', 'top'],
  ['read', 'read.html', '#dropzone', 'fit', 760],
];

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.gz': 'application/gzip' };
const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path.endsWith('/')) path += 'index.html';
  try {
    const body = await readFile(join(DIST, path));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise(resolve => server.listen(0, resolve));
const base = `http://localhost:${server.address().port}/`;

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const tmp = join(tmpdir(), `punc-shot-${process.pid}.png`);
try {
  for (const [name, page, selector, where, viewportWidth = 1280] of SHOTS) {
    // 1280 by default: wide enough that every chart draws at its desktop size
    const tab = await browser.newPage({ viewport: { width: viewportWidth, height: 1000 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    await tab.goto(base + page);
    await tab.evaluate(() => document.fonts.ready);
    const el = tab.locator(selector).first();
    await el.waitFor({ state: 'visible', timeout: 20000 });
    // Viewport coordinates, not a full-page shot: Chromium blanks full-page shots past 16,384 pixels
    await el.evaluate((e, block) => e.scrollIntoView({ block }), where === 'top' ? 'start' : 'center');
    await tab.waitForTimeout(800);
    // A fit crop runs past the element: blank out its neighbours so they don't show at the edges
    if (where === 'fit')
      await el.evaluate(e => {
        for (const x of e.closest('section').querySelectorAll('p, li, h1, h2, form')) if (!e.contains(x) && !x.contains(e)) x.style.visibility = 'hidden';
      });
    const box = await el.boundingBox();
    const height = where === 'fit' ? (box.width * H) / W : Math.min(box.height, (box.width * H) / W);
    const width = (height * W) / H;
    const clip = {
      x: box.x + (box.width - width) / 2,
      y: where === 'top' ? box.y : box.y + (box.height - height) / 2,
      width,
      height,
    };
    await tab.screenshot({ path: tmp, clip });
    execFileSync('cwebp', ['-quiet', '-q', '78', '-resize', String(W), String(H), tmp, '-o', join(OUT, `${name}.webp`)]);
    console.log(`${name}.webp`);
    await tab.close();
  }
} finally {
  await browser.close();
  server.close();
  await rm(tmp, { force: true });
}
