import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Runs in the iphone (iPhone 13 in WebKit, Safari's engine) and pixel (Pixel 7 in Chromium) projects.
const catalog = JSON.parse(readFileSync('site/catalog.json', 'utf8')) as Array<{ slug: string }>;
const PAGES = ['./', 'books/ulysses/', 'read.html', 'map.html', 'about.html'];

test.beforeEach(({ page }) => {
  page.on('pageerror', error => {
    throw error;
  });
});

test('nothing scrolls sideways at 390 or 320 pixels wide', async ({ page }) => {
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

test('the shelf shows the first 20 books, then all of them on request', async ({ page }) => {
  await page.goto('./');
  const shelf = page.locator('#shelf li:visible');
  await expect(shelf).toHaveCount(20);
  await page.getByRole('button', { name: `Show all ${catalog.length}` }).tap();
  await expect(shelf).toHaveCount(catalog.length);
  await expect(page.locator('#shelf-more')).toBeHidden();
});

test('a book page switches views by tapping, and the spiral zooms with its buttons', async ({ page }) => {
  await page.goto('books/frankenstein/');
  await page.getByRole('button', { name: 'Spiral' }).tap();
  await expect(page.locator('#view-spiral')).toBeVisible();
  await page.getByRole('button', { name: 'Zoom in' }).tap();
  await expect(page.locator('#spiral-readout')).toContainText('x');
  await page.getByRole('button', { name: 'Counts' }).tap();
  await expect(page.locator('#through-book .tb-axis')).toBeVisible();
});

test('form fields are big enough that Safari does not zoom in on them', async ({ page }) => {
  await page.goto('./');
  for (const field of await page.locator('#shelf-controls input, #shelf-controls select').all()) {
    expect(parseFloat(await field.evaluate(el => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  }
});

test('nav, buttons and share links are at least 24 pixels tall to tap', async ({ page }) => {
  for (const path of ['./', 'books/frankenstein/']) {
    await page.goto(path);
    const targets = page.locator('.site-header nav a, .share a, .share button, .views button, .explorer-controls button');
    for (const target of await targets.all()) {
      if (!(await target.isVisible())) continue;
      const box = (await target.boundingBox())!;
      expect(box.height, `${path}: ${await target.textContent()}`).toBeGreaterThanOrEqual(24);
    }
  }
});
