import { analyzeBook, erasedPages, type BookAnalysis } from './analyze';
import { drawScore, drawSpiral, downloadCanvas } from './canvas';

interface CatalogBook {
  slug: string;
  title: string;
  author: string;
  year: number;
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

function showBook(rawText: string, title: string, byline: string, fileStem: string): void {
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
  byId('stat-marks').textContent = book.marks.length.toLocaleString();
  byId('stat-wps').textContent = book.wordsPerSentence ? book.wordsPerSentence.toFixed(1) : 'n/a';
  byId('stat-top').textContent = book.counts[0]?.[0] ?? '';

  renderCounts(book);
  setUpPages(erasedPages(book.text));

  const drawn = new Set<string>();
  const draw = async (view: string) => {
    if (drawn.has(view) || (view !== 'spiral' && view !== 'score')) return;
    drawn.add(view);
    // Canvas text uses whatever font is loaded at draw time.
    await document.fonts.load('20px Fraunces');
    if (view === 'spiral') drawSpiral(byId<HTMLCanvasElement>('spiral-canvas'), book.marks);
    else drawScore(byId<HTMLCanvasElement>('score-canvas'), book.marks);
  };

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

  document.querySelectorAll<HTMLButtonElement>('[data-download]').forEach(button => {
    button.addEventListener('click', () => {
      const kind = button.dataset['download']!;
      downloadCanvas(byId<HTMLCanvasElement>(`${kind}-canvas`), `${fileStem}-${kind}.png`);
    });
  });
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

async function loadFromShelf(slug: string): Promise<void> {
  showStatus('Taking the words out…');
  const catalog = (await (await fetch('books.json')).json()) as CatalogBook[];
  const meta = catalog.find(b => b.slug === slug);
  if (!meta) {
    showStatus(`There's no "${slug}" on the shelf.`);
    byId('upload').hidden = false;
    return;
  }
  const res = await fetch(`books/${slug}.txt`);
  if (!res.ok) throw new Error(`Couldn't load ${meta.title} (${res.status})`);
  const text = await res.text();
  // Let the status paint before the synchronous analysis.
  requestAnimationFrame(() => showBook(text, meta.title, `${meta.author}, ${meta.year}`, slug));
}

async function loadFile(file: File): Promise<void> {
  if (file.size > MAX_UPLOAD_BYTES) {
    showStatus('That file is over 30 MB. Try a single book.');
    return;
  }
  showStatus('Taking the words out…');
  const text = await file.text();
  const stem = file.name.replace(/\.[^.]+$/, '') || 'book';
  requestAnimationFrame(() => showBook(text, titleFromFilename(file.name), 'Your file', stem));
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

const slug = new URLSearchParams(location.search).get('b');
setUpUpload();
if (slug) {
  byId('upload').hidden = true;
  // A shelf book belongs to the shelf in the site nav, not to "Read your own".
  document.querySelector('.site-header [aria-current]')?.removeAttribute('aria-current');
  document.querySelector('.site-header a[href="./"]')?.setAttribute('aria-current', 'page');
  void loadFromShelf(slug);
}
