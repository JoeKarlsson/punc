import { expect, test, type Page } from '@playwright/test';

// Screenshot comparisons of the parts every page is built from, at desktop
// and phone width (the visual-desktop and visual-phone projects). Baselines
// are made in Playwright's Linux image, the same one CI runs in:
//   npm run test:visual:update
// Element shots rather than whole pages, so one change fails one test.

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

test('header and footer', async ({ page }) => {
  await open(page, 'about.html');
  await expect(page.locator('.site-header')).toHaveScreenshot('header.png');
  await expect(page.locator('.site-footer')).toHaveScreenshot('footer.png');
});

test('front page hero and a shelf card', async ({ page }) => {
  await open(page, './');
  await expect(page.locator('.hero')).toHaveScreenshot('hero.png');
  const card = page.locator('.shelf-featured li').first();
  // Posters are dithered once their cover loads
  await expect(card.locator('.poster-art')).toBeVisible();
  await expect(card).toHaveScreenshot('shelf-card.png');
});

test('page titles', async ({ page }) => {
  for (const name of ['about', 'numbers', 'read']) {
    await open(page, `${name}.html`);
    await expect(page.locator('h1:visible')).toHaveScreenshot(`title-${name}.png`);
  }
});

test('a book page head and its views', async ({ page }) => {
  await open(page, 'books/frankenstein/');
  await expect(page.locator('.book-poster .poster-art')).toBeVisible();
  await expect(page.locator('.book-head')).toHaveScreenshot('book-head.png');
  await expect(page.locator('.views')).toHaveScreenshot('book-views.png');
  await page.click('[data-view=counts]');
  // The click leaves the mouse over the chart, and a hovered bar turns pink, so
  // a small layout shift would change which bar the shot catches. Park it.
  await page.mouse.move(0, 0);
  await expect(page.locator('#through-book')).toHaveScreenshot('through-book.png');
});

test('the map', async ({ page }) => {
  await open(page, 'numbers.html');
  await expect(page.locator('.shelf-map a[data-tip]').first()).toBeAttached();
  await expect(page.locator('.shelf-map')).toHaveScreenshot('map.png');
});
