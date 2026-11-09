import { analyzeBook, erasedPages, type BookAnalysis } from './analyze';
import { createScoreScroller, createSpiralExplorer, drawScore, downloadCanvas, type SpiralExplorer } from './canvas';
import { initPosters } from './posters';
import { initShare } from './share';
import { fingerprintHTML, mapSVG, markShares, marksThroughBook, shelfPosition, throughBookHTML, type MapPoint } from './patterns';
import { afterFirstPaint, yieldToBrowser } from './first-paint';
import { setUpMapTooltips } from './map-tooltips';

interface CatalogBook {
  slug: string;
}

const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

const MARK_NAMES: Record<string, string> = {
  '.': 'period',
  ',': 'comma',
  ';': 'semicolon',
  ':': 'colon',
  '?': 'question mark',
  '!': 'exclamation mark',
  '"': 'double quote',
  "'": 'apostrophe or single quote',
  '-': 'hyphen or dash',
  '(': 'opening parenthesis',
  ')': 'closing parenthesis',
  '[': 'opening bracket',
  ']': 'closing bracket',
  '{': 'opening brace',
  '}': 'closing brace',
  '*': 'asterisk',
  '&': 'ampersand',
  '/': 'slash',
  '\\': 'backslash',
  '#': 'number sign',
  '$': 'dollar sign',
  '%': 'percent sign',
  '+': 'plus sign',
  '=': 'equals sign',
  '<': 'less-than sign',
  '>': 'greater-than sign',
  '@': 'at sign',
  '|': 'vertical bar',
  '~': 'tilde',
  '^': 'caret',
  '`': 'backtick',
  '§': 'section sign',
  '¶': 'pilcrow',
  '°': 'degree sign',
  '£': 'pound sign',
  '¡': 'inverted exclamation mark',
  '¿': 'inverted question mark',
};

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} on the page`);
  return el as T;
}

const status = byId<HTMLParagraphElement>('status');
const showStatus = (message: string) => {
  status.textContent = message;
};
window.addEventListener('error', e => showStatus(`Something broke: ${e.message}`));
window.addEventListener('unhandledrejection', e =>
  showStatus(`Something broke: ${e.reason instanceof Error ? e.reason.message : String(e.reason)}`)
);

function titleFromFilename(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Untitled';
}

// views

async function showBook(rawText: string, title: string, byline: string, fileStem: string, shelfSlug?: string): Promise<void> {
  const book: BookAnalysis = analyzeBook(rawText);
  if (book.marks.length === 0) {
    showStatus('No punctuation in that file. Is it plain text?');
    return;
  }
  document.title = `${title} · Punc`;
  byId('upload').hidden = true;
  byId('book').hidden = false;
  showStatus('');
  byId('book-title').textContent = title;
  byId('book-byline').textContent = byline;
  byId('stat-words').textContent = book.wordCount.toLocaleString();
  byId('stat-marks').textContent = book.marks.length.toLocaleString();
  byId('stat-wps').textContent = book.wordsPerSentence ? book.wordsPerSentence.toFixed(1) : 'n/a';
  byId('stat-top').textContent = book.counts[0]?.[0] ?? '';

  renderCounts(book);
  // A shelf book's twin is written in at build time; keep it through the redraw.
  const fingerprint = byId('book-fingerprint');
  const twin = fingerprint.querySelector('.fp-twin');
  fingerprint.innerHTML =
    fingerprintHTML(markShares(book.marks), 'fingerprint fingerprint-large') +
    '<p class="fp-caption">Its punctuation fingerprint: each mark\'s share, on the same scale as every book on the shelf.</p>';
  if (twin) fingerprint.append(twin);
  byId('through-book').innerHTML = throughBookHTML(marksThroughBook(book.marks));
  describeCanvases(book);
  // The stats are up; let them paint before the map and the score, so the whole
  // book isn't one long task on a slow phone.
  await yieldToBrowser();
  void drawOnMap(book, title, shelfSlug);

  const drawn = new Set<string>();
  let spiral: SpiralExplorer | undefined;
  const draw = async (view: string) => {
    if (drawn.has(view) || !['spiral', 'score', 'pages'].includes(view)) return;
    drawn.add(view);
    // Erasing the whole book into pages is slow, so it waits until someone opens Pages.
    if (view === 'pages') {
      setUpPages(erasedPages(book.text));
      return;
    }
    // Canvas text uses whatever font is loaded at draw time.
    await document.fonts.load('20px Fraunces');
    if (view === 'score') {
      createScoreScroller(byId('score'), book.marks);
      return;
    }
    const readout = byId('spiral-readout');
    spiral = createSpiralExplorer(byId<HTMLCanvasElement>('spiral-canvas'), book.marks, (zoom, percent) => {
      readout.textContent =
        zoom <= 1.01 ? '' : `${zoom.toFixed(1)}x${percent === null ? '' : `, about ${Math.round(percent)}% through the book`}`;
    });
  };
  byId('spiral-zoom-in').addEventListener('click', () => spiral?.zoomBy(1.6));
  byId('spiral-zoom-out').addEventListener('click', () => spiral?.zoomBy(1 / 1.6));
  byId('spiral-reset').addEventListener('click', () => spiral?.reset());

  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-view]');
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const view = button.dataset['view']!;
      buttons.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      document.querySelectorAll<HTMLElement>('.view').forEach(v => {
        v.hidden = v.id !== `view-${view}`;
      });
      void draw(view);
    });
  });
  void draw('score');

  document.querySelectorAll<HTMLButtonElement>('[data-download]').forEach(button => {
    button.addEventListener('click', () => {
      const kind = button.dataset['download']!;
      let canvas: HTMLCanvasElement;
      if (kind === 'spiral' && spiral) canvas = spiral.exportCanvas();
      else if (kind === 'score') {
        // The download is the whole book in one picture, not the rows in view.
        canvas = document.createElement('canvas');
        drawScore(canvas, book.marks);
      } else canvas = byId<HTMLCanvasElement>(`${kind}-canvas`);
      downloadCanvas(canvas, `${fileStem}-${kind}.png`);
    });
  });

  // The whole book as one string of marks, in reading order.
  const copyButton = byId<HTMLButtonElement>('copy-marks');
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(book.marks.join(''));
    } catch (error) {
      showStatus(`Couldn't copy to the clipboard: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
    copyButton.textContent = `Copied ${book.marks.length.toLocaleString()} marks`;
    setTimeout(() => (copyButton.textContent = 'Copy the marks'), 2500);
  });
  // The book is analyzed and every button works.
  byId('book').dataset['ready'] = '';
}

// The shelf map with this book picked out: a shelf book in its own spot, an
// uploaded file wherever its punctuation puts it.
async function drawOnMap(book: BookAnalysis, title: string, shelfSlug?: string): Promise<void> {
  const root = document.body.dataset['root'] ?? '';
  const res = await fetch(`${root}books.json`);
  if (!res.ok) throw new Error(`Couldn't load the shelf for the map (${res.status})`);
  const shelf = (await res.json()) as MapPoint[];
  const here: MapPoint = { title, ...shelfPosition(book.marks), ...(shelfSlug ? { slug: shelfSlug } : {}) };
  const holder = byId('book-map');
  holder.innerHTML = mapSVG(shelf, { highlight: here, root });
  setUpMapTooltips(byId('book-map').parentElement!, byId('book-map-tip'));
}

// Canvases are pictures to a screen reader; say what's in them.
function describeCanvases(book: BookAnalysis): void {
  const total = book.marks.length;
  const top = book.counts
    .slice(0, 3)
    .map(([mark, count]) => `${MARK_NAMES[mark] ?? mark} ${Math.round((count / total) * 100)}%`)
    .join(', ');
  const summary = `${total.toLocaleString()} marks, mostly ${top}. Sentence endings are pink.`;
  const score = byId<HTMLCanvasElement>('score-canvas');
  score.setAttribute('role', 'img');
  score.setAttribute('aria-label', `Score: every mark in reading order. ${summary}`);
  // The spiral is focusable and keyboard driven, so keep its controls in the label.
  byId<HTMLCanvasElement>('spiral-canvas').setAttribute(
    'aria-label',
    `Spiral: every mark wound from the center out. ${summary} Use plus and minus to zoom and the arrow keys to move.`
  );
}

function renderCounts(book: BookAnalysis): void {
  const list = byId<HTMLOListElement>('counts');
  const max = book.counts[0]?.[1] ?? 1;
  list.replaceChildren(
    ...book.counts.map(([mark, count]) => {
      const li = document.createElement('li');
      const glyph = document.createElement('span');
      glyph.className = 'count-mark';
      glyph.textContent = mark;
      const name = document.createElement('span');
      name.className = 'count-name';
      name.textContent = `${MARK_NAMES[mark] ?? mark} ${count.toLocaleString()}`;
      const bar = document.createElement('span');
      bar.className = 'count-bar';
      bar.style.width = `${Math.max(0.5, (count / max) * 100)}%`;
      li.append(glyph, name, bar);
      return li;
    })
  );
}

function setUpPages(pages: string[]): void {
  const left = byId('page-left');
  const right = byId('page-right');
  const folioLeft = byId('folio-left');
  const folioRight = byId('folio-right');
  const range = byId<HTMLInputElement>('page-range');
  const spreads = Math.ceil(pages.length / 2);
  range.max = String(Math.max(spreads - 1, 0));

  const show = (spread: number) => {
    const s = Math.min(Math.max(spread, 0), spreads - 1);
    range.value = String(s);
    left.textContent = pages[s * 2] ?? '';
    right.textContent = pages[s * 2 + 1] ?? '';
    folioLeft.textContent = `${s * 2 + 1} of ${pages.length}`;
    folioRight.textContent = pages[s * 2 + 1] !== undefined ? `${s * 2 + 2}` : '';
  };
  const current = () => Number(range.value);
  range.addEventListener('input', () => show(current()));
  byId('page-prev').addEventListener('click', () => show(current() - 1));
  byId('page-next').addEventListener('click', () => show(current() + 1));
  document.addEventListener('keydown', e => {
    if (byId('view-pages').hidden || e.target instanceof HTMLInputElement) return;
    if (e.key === 'ArrowLeft') show(current() - 1);
    if (e.key === 'ArrowRight') show(current() + 1);
  });
  show(0);
}

// loading

// Shelf texts are stored gzipped. Hosts that send them with Content-Encoding
// have already unpacked them, so check for the gzip magic bytes first.
async function fetchBookText(slug: string): Promise<string> {
  const res = await fetch(`${document.body.dataset['root'] ?? ''}books/${slug}.txt.gz`);
  if (!res.ok) throw new Error(`Couldn't load the book (${res.status})`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return new TextDecoder().decode(bytes);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

// The page already has the book's title and stats from the build, so there's
// no loading message: one above them would push the page down and back.
async function loadFromShelf(slug: string, title: string, byline: string): Promise<void> {
  // The page already shows the book from its build, so the 160 KB book text
  // waits for that first paint. Fetched earlier, it competed with the fonts and
  // CSS on a slow phone, and Lighthouse's mobile simulation counted it in the
  // page's LCP whenever it finished first (performance 0.84-0.91 instead of 0.99).
  await afterFirstPaint();
  const text = await fetchBookText(slug);
  await showBook(text, title, byline, slug, slug);
}

// Old links were read.html?b=<slug>; each book has its own page now.
async function redirectOldLink(slug: string): Promise<void> {
  const catalog = (await (await fetch('books.json')).json()) as CatalogBook[];
  if (catalog.some(b => b.slug === slug)) {
    location.replace(`books/${slug}/`);
    return;
  }
  showStatus(`There's no "${slug}" on the shelf.`);
}

async function loadFile(file: File): Promise<void> {
  if (file.size > MAX_UPLOAD_BYTES) {
    showStatus('That file is over 30 MB. Try a single book.');
    return;
  }
  showStatus('Taking the words out…');
  const text = await file.text();
  const stem = file.name.replace(/\.[^.]+$/, '') || 'book';
  requestAnimationFrame(() => void showBook(text, titleFromFilename(file.name), 'Your file', stem));
}

function setUpUpload(): void {
  byId('upload').hidden = false;
  const input = byId<HTMLInputElement>('file-input');
  const zone = byId('dropzone');
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) void loadFile(file);
  });
  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('dragging');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragging'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragging');
    const file = e.dataTransfer?.files[0];
    if (file) void loadFile(file);
  });
}

initPosters();
initShare();
setUpUpload();
const { slug, title, byline } = document.body.dataset;
const oldLink = new URLSearchParams(location.search).get('b');
if (slug && title && byline !== undefined) {
  byId('upload').hidden = true;
  void loadFromShelf(slug, title, byline);
} else if (oldLink) {
  void redirectOldLink(oldLink);
}
