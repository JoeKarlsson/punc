import { expect, test, type Page } from '@playwright/test';

// Fail any test that throws in the page.
test.beforeEach(({ page }) => {
  page.on('pageerror', error => {
    throw error;
  });
});

async function openBook(page: Page, slug: string) {
  await page.goto(`read.html?b=${slug}`);
  await expect(page.locator('#book')).toBeVisible();
}

test('the shelf lists every book plus a cover for your own', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.shelf .cover')).toHaveCount(10);
  await expect(page.locator('.cover-yours a')).toHaveAttribute('href', 'read.html');
  await page.getByRole('link', { name: /Moby-Dick/ }).click();
  await expect(page.locator('#book-title')).toHaveText('Moby-Dick');
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
  // The site nav marks the shelf, not "Read your own", for a shelf book.
  await expect(page.locator('.site-header [aria-current="page"]')).toHaveText('The shelf');
});

test('an unknown book says so and offers the upload', async ({ page }) => {
  await page.goto('read.html?b=not-a-book');
  await expect(page.locator('#status')).toContainText('no "not-a-book" on the shelf');
  await expect(page.locator('#upload')).toBeVisible();
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
  for (const path of ['./', 'read.html?b=ulysses', 'about.html']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBe(0);
  }
});
