import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Runs in the iphone (iPhone 13 in WebKit, Safari's engine) and pixel (Pixel 7 in Chromium) projects.
const catalog = JSON.parse(readFileSync('site/catalog.json', 'utf8')) as Array<{ slug: string }>;
const PAGES = ['./', 'books/ulysses/', 'read.html', 'numbers.html', 'about.html'];

test.beforeEach(({ page }) => {
  page.on('pageerror', error => {
    throw error;
  });
});

test('nothing scrolls sideways at 390 or 320 pixels wide', async ({ page }) => {
  // Ten page loads, each waiting for the whole shelf's data (2000 books) to settle.
  test.setTimeout(180_000);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    for (const path of PAGES) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} at ${width}px`).toBe(0);
    }
  }
});

test('the shelf shows a page of books, and the next page on a tap', async ({ page }) => {
  await page.goto('./');
  const shelf = page.locator('#shelf li:visible');
  await expect(shelf).toHaveCount(24);
  await page.getByRole('navigation', { name: 'Shelf pages' }).getByRole('button', { name: 'Next' }).tap();
  await expect(page.locator('#shelf-count')).toHaveText(`Showing 25–48 of ${catalog.length.toLocaleString("en-US")} books`);
  await expect(shelf).toHaveCount(24);
});

test('a book page switches views by tapping, and the spiral zooms with its buttons', async ({ page }) => {
  await page.goto('books/frankenstein/');
  // The view buttons work once reader.js has analyzed the book and marked it ready.
  await expect(page.locator('#book[data-ready]')).toBeAttached();
  await page.getByRole('button', { name: 'Spiral' }).tap();
  await expect(page.locator('#view-spiral')).toBeVisible();
  await page.getByRole('button', { name: 'Zoom in' }).tap();
  await expect(page.locator('#spiral-readout')).toContainText('x');
  await page.getByRole('button', { name: 'Counts' }).tap();
  await expect(page.locator('#through-book .tb-axis')).toBeVisible();
});

test('a phone turns the pages one at a time, since it shows one', async ({ page }) => {
  await page.goto('books/frankenstein/');
  await expect(page.locator('#book[data-ready]')).toBeAttached();
  await page.getByRole('button', { name: 'Pages' }).tap();
  await expect(page.locator('#folio-left')).toHaveText(/^1 of \d+$/);
  await page.getByRole('button', { name: 'Turn' }).tap();
  await expect(page.locator('#folio-left')).toHaveText(/^2 of \d+$/);
  await expect(page.locator('#page-range')).toHaveAttribute('aria-valuetext', /^Page 2 of \d+$/);
  // The top of the page is back on screen after the turn
  expect((await page.locator('.spread').boundingBox())!.y).toBeGreaterThanOrEqual(0);
});

test('form fields are big enough that Safari does not zoom in on them', async ({ page }) => {
  await page.goto('./');
  for (const field of await page.locator('#shelf-controls input, #shelf-controls select').all()) {
    expect(parseFloat(await field.evaluate(el => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  }
});

test('nav, buttons, links and fields are at least 44 pixels tall to tap', async ({ page }) => {
  const selector =
    '.site-header nav a, .site-footer a, .share a, .share button, .views button, .explorer-controls button, .shelf-controls input, .shelf-controls select, .shelf-page, .numbers-contents a, .map-table summary';
  for (const [path, ready] of [
    ['./', '#shelf-controls:not([hidden])'],
    ['books/frankenstein/', '#book[data-ready]'],
    ['numbers.html', '.numbers-contents'],
  ] as const) {
    await page.goto(path);
    await expect(page.locator(ready)).toBeAttached();
    // Measured in one pass: a locator per target is too slow in WebKit
    const small = await page.evaluate(
      sel =>
        [...document.querySelectorAll<HTMLElement>(sel)]
          .filter(el => el.checkVisibility() && el.getBoundingClientRect().height < 44)
          .map(el => `${el.textContent?.trim().slice(0, 30)}: ${el.getBoundingClientRect().height}px`),
      selector
    );
    expect(small, path).toEqual([]);
  }
});
