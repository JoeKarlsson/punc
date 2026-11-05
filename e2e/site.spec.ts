import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const catalog = JSON.parse(readFileSync('site/catalog.json', 'utf8')) as Array<{ slug: string; author: string; genres: string[] }>;

// Fail any test that throws in the page.
test.beforeEach(({ page }) => {
  page.on('pageerror', error => {
    throw error;
  });
});

async function openBook(page: Page, slug: string) {
  await page.goto(`books/${slug}/`);
  await expect(page.locator('#book')).toBeVisible();
}

test('the front page features the most read books, then the whole shelf', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.shelf-featured .cover')).toHaveCount(4);
  await expect(page.locator('#shelf .cover')).toHaveCount(catalog.length);
  await expect(page.locator('#shelf-count')).toHaveText(`Showing ${catalog.length} of ${catalog.length} books`);
  // Covers get dithered into pink-and-black posters.
  await expect(page.locator('.shelf-featured .poster-art')).toHaveCount(4);
  await page.locator('.shelf-featured').getByRole('link', { name: /Pride and Prejudice/ }).click();
  await expect(page).toHaveURL(/books\/pride-and-prejudice\/$/);
  await expect(page.locator('#book-title')).toHaveText('Pride and Prejudice');
});

test('the shelf searches by title or author, filters by genre, and sorts', async ({ page }) => {
  await page.goto('./');
  const visible = page.locator('#shelf .cover:not([hidden])');
  await page.getByLabel('Search').fill('austen');
  const austen = catalog.filter(b => b.author === 'Jane Austen').length;
  await expect(visible).toHaveCount(austen);
  await expect(page).toHaveURL(/\?q=austen/);

  await page.getByLabel('Search').fill('');
  await page.getByLabel('Genre').selectOption('Poetry');
  await expect(visible).toHaveCount(catalog.filter(b => b.genres.includes('Poetry')).length);

  await page.getByLabel('Genre').selectOption('');
  await page.getByLabel('Sort').selectOption('short-sentences');
  const wps = (await visible.evaluateAll(els => els.map(el => Number((el as HTMLElement).dataset['wps']))));
  expect(wps).toEqual([...wps].sort((a, b) => a - b));

  await page.getByLabel('Sort').selectOption('oldest');
  await expect(visible.first()).toContainText('The Odyssey');
  await expect(visible.first().locator('.cover-author')).toHaveText('Homer, 8th century BCE');

  await page.getByLabel('Search').fill('zzzz not a book');
  await expect(page.locator('#shelf-empty')).toBeVisible();
});

test('shelf choices survive a reload from the URL', async ({ page }) => {
  await page.goto('./?q=dracula');
  await expect(page.getByLabel('Search')).toHaveValue('dracula');
  await expect(page.locator('#shelf .cover:not([hidden])')).toHaveCount(1);
});

test('old read.html?b= links go to the book page', async ({ page }) => {
  await page.goto('read.html?b=alice');
  await expect(page).toHaveURL(/books\/alice\/$/);
  await expect(page.locator('#book-title')).toHaveText("Alice's Adventures in Wonderland");
});

test('a shelf book opens on the score with its stats', async ({ page }) => {
  await openBook(page, 'alice');
  await expect(page.locator('#book-title')).toHaveText("Alice's Adventures in Wonderland");
  await expect(page.locator('#stat-words')).toHaveText('26,777');
  await expect(page.locator('#stat-marks')).toHaveText('8,076');
  await expect(page.locator('[data-view]')).toHaveText(['Score', 'Spiral', 'Pages', 'Counts']);
  await expect(page.locator('#view-score')).toBeVisible();
  // The score canvas has been drawn at its real size.
  await expect.poll(() => page.locator('#score-canvas').evaluate(c => (c as HTMLCanvasElement).height)).toBeGreaterThan(300);
  // A shelf book belongs to the shelf in the site nav, not to "Read your own".
  await expect(page.locator('.site-header [aria-current="page"]')).toHaveText('The shelf');
});

test('an unknown old link says so and offers the upload', async ({ page }) => {
  await page.goto('read.html?b=not-a-book');
  await expect(page.locator('#status')).toContainText('no "not-a-book" on the shelf');
  await expect(page.locator('#upload')).toBeVisible();
});

test('a book page has its own share metadata and share links', async ({ page }) => {
  await page.goto('books/moby-dick/');
  const meta = (key: string) => page.locator(`meta[property="${key}"], meta[name="${key}"]`).getAttribute('content');
  expect(await meta('og:title')).toBe('Moby-Dick, without words');
  expect(await meta('og:url')).toBe('https://joekarlsson.github.io/punc/books/moby-dick/');
  expect(await meta('og:image')).toBe('https://joekarlsson.github.io/punc/og.png');
  expect(await meta('twitter:card')).toBe('summary_large_image');
  expect(await meta('og:description')).toMatch(/^Herman Melville's Moby-Dick \(1851\) with all [\d,]+ words removed/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://joekarlsson.github.io/punc/books/moby-dick/');
  await expect(page.locator('.book-poster .poster-art')).toHaveCount(1);
  await expect(page.locator('#book-byline')).toHaveText('Herman Melville, 1851');
  const poster = page.getByRole('link', { name: 'Moby-Dick on Project Gutenberg (opens in a new tab)' });
  await expect(poster).toHaveAttribute('href', 'https://www.gutenberg.org/ebooks/2701');
  await expect(poster).toHaveAttribute('target', '_blank');

  const hn = page.locator('.share').getByRole('link', { name: 'Hacker News' });
  await expect(hn).toHaveAttribute('href', /news\.ycombinator\.com\/submitlink\?u=https%3A%2F%2Fjoekarlsson\.github\.io%2Fpunc%2Fbooks%2Fmoby-dick%2F/);
  for (const network of ['Reddit', 'Bluesky', 'Threads', 'LinkedIn', 'X']) {
    await expect(page.locator('.share').getByRole('link', { name: network, exact: true })).toBeVisible();
  }
});

test('copy the link puts the page URL on the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('about.html');
  await page.getByRole('button', { name: 'copy the link' }).click();
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('https://joekarlsson.github.io/punc/about.html');
});

test('the favicons, manifest and share image are served', async ({ request }) => {
  for (const path of ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'icon-512.png', 'site.webmanifest', 'og.png']) {
    expect((await request.get(path)).status(), path).toBe(200);
  }
});

test('an uploaded file is read in the browser', async ({ page }) => {
  await page.goto('read.html');
  await page.locator('#file-input').setInputFiles({
    name: 'my-short_story.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('"Wait," she said. "Is it you?" It was! (Mostly.)'),
  });
  await expect(page.locator('#book-title')).toHaveText('my short story');
  await expect(page.locator('#stat-marks')).toHaveText('11');
  await expect(page.locator('#stat-words')).toHaveText('9');
});

test('the spiral zooms, pans, resets and downloads', async ({ page }) => {
  await openBook(page, 'alice');
  await page.getByRole('button', { name: 'Spiral', exact: true }).click();
  const canvas = page.locator('#spiral-canvas');
  const readout = page.locator('#spiral-readout');
  await expect(canvas).toBeVisible();
  await expect(readout).toHaveText('');

  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.3);
  for (let i = 0; i < 6; i++) await page.mouse.wheel(0, -200);
  await expect(readout).toContainText('x');
  const zoomed = await readout.textContent();

  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.7, { steps: 5 });
  await page.mouse.up();

  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(readout).not.toHaveText(zoomed!);

  await page.getByRole('button', { name: 'Whole book' }).click();
  await expect(readout).toHaveText('');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download PNG' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('alice-spiral.png');
});

test('pages turn with the buttons and the arrow keys', async ({ page }) => {
  await openBook(page, 'alice');
  await page.getByRole('button', { name: 'Pages', exact: true }).click();
  const folio = page.locator('#folio-left');
  await expect(folio).toHaveText(/^1 of \d+$/);
  await page.getByRole('button', { name: 'Turn' }).click();
  await expect(folio).toHaveText(/^3 of /);
  await page.keyboard.press('ArrowLeft');
  await expect(folio).toHaveText(/^1 of /);
  // Erased pages keep the marks and none of the letters.
  await expect(page.locator('#page-left')).not.toHaveText(/[A-Za-z]/);
});

test('copy the marks puts only the punctuation on the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openBook(page, 'alice');
  await page.getByRole('button', { name: 'Copy the marks' }).click();
  await expect(page.getByRole('button', { name: 'Copied 8,076 marks' })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect([...copied]).toHaveLength(8076);
  expect(copied).not.toMatch(/[A-Za-z0-9\s]/);
  expect(copied.slice(0, 40)).toMatch(/^[.,;:'"!?()\-\[\]*_]+$/);
});

test('the counts list every mark, most used first', async ({ page }) => {
  await openBook(page, 'alice');
  await page.getByRole('button', { name: 'Counts', exact: true }).click();
  await expect(page.locator('#counts li').first()).toContainText('comma 2,427');
});

test('the about page has the artist statement and the footer links out', async ({ page }) => {
  await page.goto('about.html');
  await expect(page.getByRole('heading', { name: 'Artist statement' })).toBeVisible();
  await expect(page.locator('.about')).toContainText('blackout poems');
  await expect(page.getByRole('link', { name: 'joekarlsson.com' })).toHaveAttribute('href', 'https://joekarlsson.com');
  await expect(page.getByRole('link', { name: 'Source on GitHub' })).toHaveAttribute('href', 'https://github.com/JoeKarlsson/punc');
});

test('nothing scrolls sideways on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['./', 'books/ulysses/', 'about.html']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBe(0);
  }
});
