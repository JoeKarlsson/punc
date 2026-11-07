import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

const catalog = JSON.parse(readFileSync('site/catalog.json', 'utf8')) as Array<{ slug: string; title: string; author: string; genres: string[]; rank: number | null; published: string | null; publishedSort: number | null }>;

// Fail any test that throws in the page or trips the Content-Security-Policy.
test.beforeEach(({ page }) => {
  page.on('pageerror', error => {
    throw error;
  });
  page.on('console', message => {
    if (/Content Security Policy/i.test(message.text())) throw new Error(message.text());
  });
});

// The 404 page links from /punc/, as on GitHub Pages; the local server
// serves the site from /.
async function servePuncPathLocally(page: Page) {
  await page.route(/\/punc\//, route => route.continue({ url: route.request().url().replace('/punc/', '/') }));
}

async function openBook(page: Page, slug: string) {
  await page.goto(`books/${slug}/`);
  await expect(page.locator('#book')).toBeVisible();
}

test('the front page features the most read books, then the shelf a page at a time', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.shelf-featured .cover:visible')).toHaveCount(4);
  // Only the page in view is drawn.
  await expect(page.locator('#shelf .cover')).toHaveCount(72);
  await expect(page.locator('#shelf-count')).toHaveText(`Showing 1–72 of ${catalog.length} books`);
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
  await expect(visible).toHaveCount(Math.min(austen, 24));
  await expect(page).toHaveURL(/\?q=austen/);

  await page.getByLabel('Search').fill('');
  await page.getByLabel('Genre').selectOption('Poetry');
  await expect(visible).toHaveCount(Math.min(catalog.filter(b => b.genres.includes('Poetry')).length, 72));

  await page.getByLabel('Genre').selectOption('');
  await page.getByLabel('Sort').selectOption('short-sentences');
  const shelf = (await (await page.request.get('shelf.json')).json()) as Array<{ slug: string; wps: number }>;
  const shortest = [...shelf].sort((a, b) => a.wps - b.wps).slice(0, 72).map(b => b.slug);
  await expect.poll(() => visible.evaluateAll(els => els.map(el => (el as HTMLElement).dataset['slug']))).toEqual(shortest);

  await page.getByLabel('Sort').selectOption('oldest');
  const oldest = catalog.filter(b => b.publishedSort !== null).sort((a, b) => a.publishedSort! - b.publishedSort!)[0]!;
  await expect(visible.first()).toContainText(oldest.title);
  await expect(visible.first().locator('.cover-author')).toHaveText(`${oldest.author}, ${oldest.published}`);

  await page.getByLabel('Search').fill('zzzz not a book');
  await expect(page.locator('#shelf-empty')).toBeVisible();
});

test('the shelf turns pages, keeps the page in the URL, and a new search starts at page one', async ({ page }) => {
  const byRank = [...catalog].filter(b => b.rank !== null).sort((a, b) => a.rank! - b.rank!);
  await page.goto('./');
  const visible = page.locator('#shelf .cover:not([hidden])');
  const pages = page.getByRole('navigation', { name: 'Shelf pages' });
  await pages.getByRole('button', { name: '2', exact: true }).click();
  await expect(page).toHaveURL(/\?page=2/);
  await expect(page.locator('#shelf-count')).toHaveText(`Showing 73–144 of ${catalog.length} books`);
  await expect(visible.first()).toHaveAttribute('data-slug', byRank[72]!.slug);
  await expect(pages.getByRole('button', { name: '2', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('#shelf-heading')).toBeFocused();
  await pages.getByRole('button', { name: 'Next' }).click();
  await expect(page).toHaveURL(/\?page=3/);
  await page.reload();
  await expect(page.locator('#shelf-count')).toHaveText(`Showing 145–216 of ${catalog.length} books`);
  // A computer screen offers every page, from Previous to Next.
  const pageCount = Math.ceil(catalog.length / 72);
  await expect(pages.getByRole('button')).toHaveCount(pageCount + 2);
  await expect(pages.getByRole('button', { name: String(pageCount), exact: true })).toBeVisible();
  await page.getByLabel('Search').fill('dracula');
  await expect(page).not.toHaveURL(/page=/);
  await expect(visible).toHaveCount(1);
  await expect(pages).toBeHidden();
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
  expect(await meta('og:image')).toBe('https://joekarlsson.github.io/punc/share/moby-dick.png');
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
  // A plain wheel scrolls the page; Ctrl and the wheel (or a trackpad pinch) zooms.
  await page.keyboard.down('Control');
  for (let i = 0; i < 6; i++) await page.mouse.wheel(0, -200);
  await page.keyboard.up('Control');
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

test('a book page shows its fingerprint, how its marks change, and describes its canvases', async ({ page }) => {
  await openBook(page, 'alice');
  const fingerprint = page.locator('#book-fingerprint .fingerprint');
  await expect(fingerprint.locator('.fp-slot')).toHaveCount(10);
  await expect(fingerprint).toHaveAttribute('aria-label', /^Punctuation fingerprint: comma 30%, period 12%, double quote 28%/);
  await expect(page.locator('#score-canvas')).toHaveAttribute('aria-label', /8,076 marks, mostly comma 30%, double quote 28%, period 12%/);
  await expect(page.locator('#spiral-canvas')).toHaveAttribute('aria-label', /arrow keys to move\.$/);

  await page.getByRole('button', { name: 'Counts', exact: true }).click();
  const rows = page.locator('#through-book li');
  await expect(rows).toHaveCount(10);
  await expect(rows.first()).toContainText('comma');
  await expect(rows.first().locator('rect')).toHaveCount(10);
});

test('every shelf card has a fingerprint', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#shelf .cover .fingerprint')).toHaveCount(72);
});

test('the map places every book, with a tooltip and a table', async ({ page }) => {
  await page.goto('numbers.html');
  const dots = page.locator('.shelf-map a[data-tip]');
  await expect(dots).toHaveCount(catalog.length);
  // Dots overlap on a full shelf, so reach Alice by keyboard rather than pointer.
  const alice = page.locator('.shelf-map a[href="books/alice/"]');
  await alice.focus();
  await expect(page.locator('#map-tip')).toBeVisible();
  await expect(page.locator('#map-tip')).toContainText(/^Alice's Adventures in Wonderland, Lewis Carroll: [\d.]+ pauses per stop, [\d.]+% \? and !$/);
  await page.getByText("Every book's numbers as a table").click();
  await expect(page.locator('.map-table tbody tr')).toHaveCount(catalog.length);
  await alice.press('Enter');
  await expect(page).toHaveURL(/books\/alice\/$/);
});

test('the numbers page filters by genre, switches career measures and compares any two', async ({ page }) => {
  await page.goto('numbers.html');
  const charts = page.locator('#time figure.chart');
  await expect(charts).toHaveCount(6);
  const dated = await charts.first().locator('.chart-dot').count();
  expect(dated).toBeGreaterThan(300);
  await page.selectOption('#genre-pick', 'Plays');
  await expect(page.locator('#genre-key')).toContainText('plays books');
  expect(await charts.first().locator('.chart-dot:not(.chart-dot-out)').count()).toBeLessThan(dated);
  const career = page.locator('#author-career svg');
  await expect(career).toHaveAttribute('aria-label', /semicolons against the shelf/);
  await page.selectOption('#career-pick', 'wps');
  await expect(career).toHaveAttribute('aria-label', /words per sentence against the shelf/);
  await expect(page.locator('#author-career .chart-dot').first()).toHaveAttribute('data-tip', /words per sentence$/);
  await expect(page.locator('#compare-out .compare-name').first()).toHaveText('Jane Austen');
  await page.selectOption('#compare-b', 'book:moby-dick');
  await expect(page.locator('#compare-out .compare-name').nth(1)).toHaveText('Moby-Dick');
  await expect(page.locator('#compare-out .compare-detail').nth(1)).toHaveText('Herman Melville, 1851');
});

test('the old map address lands on the map on the numbers page', async ({ page }) => {
  await page.goto('map.html');
  await expect(page).toHaveURL(/numbers\.html#map$/);
});

test('a book page names its punctuation twin', async ({ page }) => {
  await openBook(page, 'moby-dick');
  await expect(page.locator('.book-fingerprint')).toContainText('Its punctuation twin');
});

test('a book page shows its author on the shelf, linked to the author on the numbers page', async ({ page }) => {
  await openBook(page, 'a-christmas-carol');
  const author = page.locator('.book-author');
  await expect(author.locator('h2')).toHaveText('Charles Dickens on the shelf');
  await expect(author.locator('[aria-current="page"]')).toHaveText('A Christmas Carol');
  await author.getByRole('link', { name: 'Charles Dickens on the numbers page' }).click();
  await expect(page.locator('.author-detail-name')).toHaveText('Charles Dickens');
  await expect(page.locator('.author-pick[aria-pressed="true"]')).toHaveAttribute('data-author', 'Charles Dickens');
  await expect(page.locator('#author-career svg')).toHaveAttribute('aria-label', /^Charles Dickens's books/);
});

test('a book whose author has no other book on the shelf still shows its author against the shelf', async ({ page }) => {
  await openBook(page, 'frankenstein');
  const author = page.locator('.book-author');
  await expect(author.locator('h2')).toHaveText('Mary Shelley on the shelf');
  await expect(author).toContainText("It's the only book by Mary Shelley on the shelf.");
  await expect(author).toContainText("Mary Shelley's punctuation is closest to");
  await expect(author.locator('thead th')).toHaveText(['This book', "Every book's median"]);
  await expect(author.locator('.author-books')).toHaveCount(0);
});

test('the numbers page picks an author from the list or a search, and points to the books of one with too few', async ({ page }) => {
  await page.goto('numbers.html');
  const picks = page.locator('.author-pick:visible');
  expect(await picks.count()).toBeGreaterThan(20);
  await page.locator('.author-pick[data-author="Jane Austen"]').click();
  await expect(page.locator('.author-detail-name')).toHaveText('Jane Austen');
  await expect(page.locator('.author-detail-books li')).toHaveCount(await page.locator('.author-pick[data-author="Jane Austen"] .named').count());
  await expect(page).toHaveURL(/author=Jane\+Austen/);
  await page.fill('#author-search', 'dickens');
  await expect(picks).toHaveCount(1);
  await expect(page.locator('.author-detail-name')).toHaveText('Charles Dickens');
  await page.fill('#author-search', 'kafka');
  await expect(page.locator('#author-found')).toContainText('Metamorphosis');
  await page.fill('#author-search', '');
  await expect(page.locator('#author-found')).toBeHidden();
});

test('a book page marks the book on the shelf map', async ({ page }) => {
  await openBook(page, 'moby-dick');
  await page.getByRole('button', { name: 'Counts', exact: true }).click();
  const map = page.locator('#book-map');
  await expect(map.locator('a[data-tip]')).toHaveCount(catalog.length - 1);
  await expect(map.locator('.map-here')).toHaveAttribute('aria-label', /^Moby-Dick: [\d.]+ pauses per stop/);
  await expect(map.locator('a').first()).toHaveAttribute('href', /^\.\.\/\.\.\/books\//);
});

test('an uploaded file lands on the shelf map', async ({ page }) => {
  await page.goto('read.html');
  await page.locator('#file-input').setInputFiles({
    name: 'shouting.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('What?! No! Stop! Why?! '.repeat(50)),
  });
  await page.getByRole('button', { name: 'Counts', exact: true }).click();
  const here = page.locator('#book-map .map-here');
  await expect(here).toHaveAttribute('aria-label', /^shouting: 0\.0 pauses per stop, 100\.0% \? and !$/);
  await expect(page.locator('#book-map a[data-tip]')).toHaveCount(catalog.length);
});

test('share links are tagged for analytics', async ({ page }) => {
  await page.goto('about.html');
  await expect(page.locator('.share').getByRole('link', { name: 'Hacker News' })).toHaveClass(/plausible-event-name=Share\+Click plausible-event-network=Hacker\+News/);
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

test('pages declare a dark color scheme, the sitemap lists them, and the 404 page links home', async ({ page, request }) => {
  await page.goto('about.html');
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'only dark');
  await expect(page.locator('meta[name="darkreader-lock"]')).toHaveCount(1);

  const sitemap = await (await request.get('sitemap.xml')).text();
  expect(sitemap).toContain('<loc>https://joekarlsson.github.io/punc/</loc>');
  expect(sitemap).toContain('<loc>https://joekarlsson.github.io/punc/books/ulysses/</loc>');
  expect(sitemap).not.toContain('404');

  await page.goto('404.html');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await expect(page.locator('base')).toHaveAttribute('href', '/punc/');
  await expect(page.locator('.share')).toHaveCount(0);
});

test('a book page shares its own card and describes the book for search engines', async ({ page, request }) => {
  await openBook(page, 'frankenstein');
  expect((await request.get('share/frankenstein.png')).status()).toBe(200);
  const data = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '');
  expect(data.about).toMatchObject({ '@type': 'Book', name: 'Frankenstein', author: { name: 'Mary Shelley' } });
});

test('every page type passes axe (WCAG 2.2 AA)', async ({ page }) => {
  // The shelf is hundreds of cards; axe needs longer than the default on CI.
  test.slow();
  await servePuncPathLocally(page);
  const scan = async (where: string) => {
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`), where).toEqual([]);
  };
  for (const path of ['./', 'read.html', 'numbers.html', 'about.html', '404.html']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await scan(path);
  }
  await openBook(page, 'frankenstein');
  for (const view of ['score', 'spiral', 'pages', 'counts']) {
    await page.click(`[data-view=${view}]`);
    await scan(`book, ${view}`);
  }
});

test('the main pages share one header: same nav, same title size and the same space above it', async ({ page }) => {
  const measure = async (path: string) => {
    await page.goto(path);
    return page.evaluate(() => {
      const nav = document.querySelector('.site-header nav')!.getBoundingClientRect();
      const h1 = [...document.querySelectorAll('h1')].find(h => h.checkVisibility())!;
      return { nav: [nav.left, nav.top], h1Top: h1.getBoundingClientRect().top + scrollY, h1Size: getComputedStyle(h1).fontSize };
    });
  };
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const about = await measure('about.html');
    for (const path of ['numbers.html', 'read.html']) expect(await measure(path), `${path} at ${width}px`).toEqual(about);
    // The front page's ransom note and a book's title are their own size, but start at the same height.
    const home = await measure('./');
    expect(home.nav).toEqual(about.nav);
    expect(home.h1Top).toBe(about.h1Top);
    if (width > 720) expect((await measure('books/frankenstein/')).h1Top).toBe(about.h1Top);
  }
});

// Reads the built files straight from disk: every page's head, and every link
// and asset it points at.
test('every built page has complete metadata, and every internal link and asset exists', () => {
  const OUT = 'site-dist';
  const pages: string[] = [];
  const walk = (dir: string) =>
    readdirSync(dir, { withFileTypes: true }).forEach(entry => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.html')) pages.push(path);
    });
  walk(OUT);
  expect(pages.length).toBeGreaterThan(catalog.length);

  const missing: string[] = [];
  const indexable: Array<{ url: string; title: string; description: string }> = [];
  for (const file of pages) {
    const html = readFileSync(file, 'utf8');
    const head = html.slice(0, html.indexOf('</head>'));
    // A moved page (map.html) only forwards to where it went, out of search.
    const forward = head.match(/<meta http-equiv="refresh" content="0; url=([^"#]+)/)?.[1];
    if (forward) {
      expect(head, file).toContain('<meta name="robots" content="noindex">');
      expect(existsSync(join(OUT, forward)), `${file} forwards to ${forward}`).toBeTruthy();
      continue;
    }
    const notFound = file.endsWith('404.html');
    const where = file.slice(OUT.length + 1);
    // The CSP comes straight after charset and viewport, so it covers everything else.
    expect(head, where).toMatch(/^<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport"[^>]*>\n<meta http-equiv="Content-Security-Policy"/);
    expect(head, where).toMatch(/<title>[^<]+<\/title>/);
    expect(head, where).toMatch(/<meta name="description" content="[^"]{20,}">/);
    expect(head, where).toContain('<meta name="color-scheme" content="only dark">');
    expect(head, where).toContain('<meta name="darkreader-lock">');
    expect(head, where).toContain('<meta name="referrer" content="strict-origin-when-cross-origin">');
    // Exactly one h1 showing in the HTML itself, before any script runs. Book
    // pages also carry the hidden upload box, and the read page the hidden
    // book; the front page's h1 is a ransom note of separate words.
    const shown = html.replace(/<(section|article)\b[^>]*\bhidden\b[^>]*>[\s\S]*?<\/\1>/g, '');
    const h1s = [...shown.matchAll(/<h1([^>]*)>([\s\S]*?)<\/h1>/g)];
    expect(h1s.length, `${where} h1 count`).toBe(1);
    expect(h1s[0]![1]!.match(/aria-label="([^"]+)"/)?.[1] ?? h1s[0]![2]!.replace(/<[^>]+>/g, '').trim(), `${where} h1`).toBeTruthy();
    // Counted as a reader sees it: &quot; is one character, not six.
    const description = head.match(/<meta name="description" content="([^"]*)">/)![1]!.replace(/&(?:quot|amp|lt|gt|#39);/g, 'x');
    expect(description.length, `${where} description length`).toBeLessThanOrEqual(160);
    expect(html, `${where} loads nothing over http`).not.toMatch(/(?:src|href)="http:/);
    if (!notFound) {
      const canonical = head.match(/<link rel="canonical" href="(https:\/\/joekarlsson\.github\.io\/punc\/[^"]*)">/)?.[1];
      expect(canonical, `${where} canonical`).toBeTruthy();
      indexable.push({ url: canonical!, title: head.match(/<title>([^<]+)<\/title>/)![1]!, description });
      const image = head.match(/<meta property="og:image" content="https:\/\/joekarlsson\.github\.io\/punc\/([^"]+)">/)?.[1];
      expect(image && existsSync(join(OUT, image)), `${where} og:image`).toBeTruthy();
    }
    const base = notFound ? OUT : dirname(file);
    for (const [, target] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^(https?:|mailto:|#|data:|blob:)/.test(target!) || target === '/punc/') continue;
      const clean = target!.replace(/[?#].*$/, '');
      const resolved = normalize(join(base, clean));
      const exists = existsSync(resolved) && (!clean.endsWith('/') || existsSync(join(resolved, 'index.html')));
      if (!exists) missing.push(`${where} -> ${target}`);
    }
  }
  expect([...new Set(missing)]).toEqual([]);

  // No two indexable pages share a title or description, and the sitemap
  // lists exactly the indexable pages.
  const repeats = (key: 'title' | 'description') => indexable.map(p => p[key]).filter((v, i, all) => all.indexOf(v) !== i);
  expect(repeats('title')).toEqual([]);
  expect(repeats('description')).toEqual([]);
  const sitemap = [...readFileSync(join(OUT, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).sort();
  expect(sitemap).toEqual(indexable.map(p => p.url).sort());
});
