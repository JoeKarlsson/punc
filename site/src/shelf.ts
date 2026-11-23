// Search, source and genre filters, sort and pages for the shelf. The page arrives with
// the first page of cards built in; what search and sort need comes from
// shelf-index.json, and what the other cards show from shelf-faces.json, fetched
// only once a card past the first page is wanted. Only the cards on the page in
// view are ever drawn, so a shelf of thousands costs no more than one page. The choices live in the URL so they
// can be shared.
import { cardHTML, withFace, type ShelfFaces, type ShelfIndexBook } from './card';
import { fromColumns, type Columns } from './columns';
import { closestMatch } from './closest-page';
import { afterFirstPaint } from './first-paint';
import { initPosters } from './posters';
import { initScanner } from './scanner';
import { initShare } from './share';
import { track } from './track';
import { normalizeForSearch, pageLinks, SHELF_PAGE_SIZE, SHELF_PAGE_SIZE_PHONE } from './paging';

// A wide screen gets a bigger page of books, and the pager shows every page number.
const wideScreen = window.matchMedia('(min-width: 900px)');

interface Card {
  book: ShelfIndexBook;
  // Search text: title and author, normalized
  text: string;
  // The author's last name, for sorting by author
  authorSort: string;
  // Drawn the first time it's on the page in view
  el: HTMLElement | undefined;
  // Its place in the shelf files, which come in "Most read" order
  order: number;
}

const SORTS: Record<string, (a: Card, b: Card) => number> = {
  popular: (a, b) => a.order - b.order,
  title: (a, b) => a.book.title.localeCompare(b.book.title),
  author: (a, b) => a.authorSort.localeCompare(b.authorSort) || a.book.title.localeCompare(b.book.title),
  // Books without a year go last either way
  oldest: (a, b) => (a.book.publishedSort ?? Infinity) - (b.book.publishedSort ?? Infinity),
  newest: (a, b) => (b.book.publishedSort ?? -Infinity) - (a.book.publishedSort ?? -Infinity),
  density: (a, b) => b.book.density - a.book.density,
  'long-sentences': (a, b) => b.book.wps - a.book.wps,
  'short-sentences': (a, b) => a.book.wps - b.book.wps,
  longest: (a, b) => b.book.words - a.book.words,
};


function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} on the page`);
  return el as T;
}

async function setUpShelf(): Promise<void> {
  const list = byId<HTMLUListElement>('shelf');
  const search = byId<HTMLInputElement>('shelf-search');
  const from = byId<HTMLSelectElement>('shelf-from');
  const genre = byId<HTMLSelectElement>('shelf-genre');
  const sort = byId<HTMLSelectElement>('shelf-sort');
  const count = byId('shelf-count');
  const empty = byId('shelf-empty');
  const pages = byId('shelf-pages');
  const heading = byId('shelf-heading');
  const controls = byId<HTMLFormElement>('shelf-controls');

  // The first page of cards is already in the HTML, so the whole shelf can wait.
  await afterFirstPaint();
  const books = fromColumns(await loadJSON<Columns<ShelfIndexBook>>('shelf-index.json'));
  // Reuse the cards already in the page.
  const built = new Map([...list.querySelectorAll<HTMLElement>('li[data-slug]')].map(el => [el.dataset['slug'], el]));
  const cards: Card[] = books.map((book, order) => ({
    book,
    text: normalizeForSearch(`${book.title} ${book.author}`),
    authorSort: book.author.split(' ').at(-1)!,
    el: built.get(book.slug),
    order,
  }));
  // Fetched the first time a card that isn't in the page is wanted, or the
  // controls are touched, so the wait is usually over by the time it's needed.
  let faces: ShelfFaces | undefined;
  let facesLoading: Promise<void> | undefined;
  const loadFaces = () =>
    (facesLoading ??= loadJSON<ShelfFaces>('shelf-faces.json').then(loaded => {
      faces = loaded;
    }));
  controls.addEventListener('focusin', () => void loadFaces(), { once: true });
  pages.addEventListener('pointerover', () => void loadFaces(), { once: true });
  const fromMatches = (c: Card) => !from.value || (from.value === 'modern') === (c.book.modern !== null);
  // A search term that matches nothing gets the nearest word on the shelf
  // instead, if that finds something: "frankenstien" offers "frankenstein".
  const vocabulary = new Set(cards.flatMap(c => c.text.split(' ').filter(word => word.length >= 3)));
  const suggestion = (terms: string[]): string | null => {
    const fixed = terms.map(t => (cards.some(c => c.text.includes(t)) ? t : t.length >= 4 ? closestMatch(t, vocabulary) : null));
    if (fixed.some(t => t === null) || fixed.every((t, i) => t === terms[i])) return null;
    const found = cards.some(c => fixed.every(t => c.text.includes(t!)) && fromMatches(c) && (!genre.value || c.book.genres.includes(genre.value)));
    return found ? fixed.join(' ') : null;
  };
  const suggest = byId('shelf-suggest');
  const template = document.createElement('template');
  const draw = (card: Card, i: number, loaded: ShelfFaces): HTMLElement => {
    if (!card.el) {
      template.innerHTML = cardHTML(withFace(card.book, loaded, card.order), i);
      card.el = template.content.firstElementChild as HTMLElement;
      initPosters(card.el);
    }
    return card.el;
  };

  const params = new URLSearchParams(location.search);
  search.value = params.get('q') ?? '';
  if (params.get('from')) from.value = params.get('from')!;
  if (params.get('genre')) genre.value = params.get('genre')!;
  if (params.get('sort') && SORTS[params.get('sort')!]) sort.value = params.get('sort')!;
  let page = Math.max(1, Math.floor(Number(params.get('page'))) || 1);

  const pageButton = (label: string, target: number, current = false): HTMLButtonElement => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'shelf-page';
    button.textContent = label;
    button.addEventListener('click', () => {
      page = target;
      apply();
      // Back to the top of the shelf, with focus there for keyboards and screen readers.
      heading.focus();
      heading.scrollIntoView({ block: 'start' });
    });
    if (current) button.setAttribute('aria-current', 'page');
    return button;
  };

  // As many page numbers to a row as fit at 2.5rem or more, with the rows
  // as even as they can be: 41 pages in two rows of 21 and 20, not 36 and 5.
  const balancePageRows = () => {
    const numbers = pages.querySelector<HTMLElement>('.shelf-page-numbers');
    if (!numbers || pages.hidden) return;
    const count = numbers.children.length;
    const minCell = 2.5 * parseFloat(getComputedStyle(document.documentElement).fontSize) + 6;
    const fit = Math.max(1, Math.floor((numbers.clientWidth + 6) / minCell));
    numbers.style.setProperty('--per-row', String(Math.ceil(count / Math.ceil(count / fit))));
  };
  new ResizeObserver(balancePageRows).observe(pages);

  const apply = () => {
    const terms = normalizeForSearch(search.value).split(' ').filter(Boolean);
    const shown = cards
      .filter(c => terms.every(t => c.text.includes(t)) && fromMatches(c) && (!genre.value || c.book.genres.includes(genre.value)))
      .sort(SORTS[sort.value] ?? SORTS['popular']);
    const pageSize = wideScreen.matches ? SHELF_PAGE_SIZE : SHELF_PAGE_SIZE_PHONE;
    const pageCount = Math.max(1, Math.ceil(shown.length / pageSize));
    page = Math.min(page, pageCount);
    const start = (page - 1) * pageSize;
    const wanted = shown.slice(start, start + pageSize);
    if (!faces && wanted.some(c => !c.el)) {
      // Drawn once the faces arrive, from whatever is picked by then.
      loadFaces().then(apply, showLoadError);
      return;
    }
    const onPage = wanted.map((c, i) => draw(c, start + i, faces!));
    // The first page as built needs no redraw.
    if (onPage.length !== list.children.length || onPage.some((el, i) => list.children[i] !== el)) list.replaceChildren(...onPage);
    list.dataset['paged'] = '';
    const fmt = (n: number) => n.toLocaleString('en-US');
    const matching = shown.length === cards.length ? `${fmt(shown.length)} books` : `${fmt(shown.length)} matching books (${fmt(cards.length)} on the shelf)`;
    count.textContent = onPage.length ? `Showing ${start + 1}–${start + onPage.length} of ${matching}` : `Showing 0 of ${fmt(cards.length)} books`;
    empty.hidden = shown.length > 0;
    reportSearch(terms.join(' '), shown.length);
    const better = shown.length === 0 ? suggestion(terms) : null;
    suggest.hidden = better === null;
    if (better !== null) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'link-button';
      button.textContent = better;
      button.addEventListener('click', () => {
        search.value = better;
        fromFirstPage();
        search.focus();
      });
      suggest.replaceChildren('Did you mean ', button, '?');
    }

    // Previous and Next always hold their place at the ends, so the numbers
    // between them don't shift; a wide screen has room for every number.
    pages.hidden = pageCount === 1;
    const numbers = document.createElement('div');
    numbers.className = 'shelf-page-numbers';
    for (const n of pageLinks(page, pageCount, wideScreen.matches ? pageCount : 4)) {
      if (n === null) {
        const gap = document.createElement('span');
        gap.className = 'shelf-page-gap';
        gap.textContent = '…';
        numbers.append(gap);
      } else numbers.append(pageButton(String(n), n, n === page));
    }
    const previous = pageButton('Previous', page - 1);
    const following = pageButton('Next', page + 1);
    previous.disabled = page === 1;
    following.disabled = page === pageCount;
    pages.replaceChildren(previous, numbers, following);
    balancePageRows();

    const next = new URLSearchParams();
    if (search.value) next.set('q', search.value);
    if (from.value) next.set('from', from.value);
    if (genre.value) next.set('genre', genre.value);
    if (sort.value !== 'popular') next.set('sort', sort.value);
    if (page > 1) next.set('page', String(page));
    const query = next.toString();
    history.replaceState(null, '', query ? `?${query}#shelf-heading` : location.pathname);
  };
  // One Shelf Search event per search someone settles on (typing paused a
  // second), not per keystroke; the words typed are never sent.
  let searchTimer = 0;
  let lastSearch = '';
  function reportSearch(query: string, found: number): void {
    clearTimeout(searchTimer);
    if (!query) lastSearch = '';
    if (!query || query === lastSearch) return;
    searchTimer = window.setTimeout(() => {
      lastSearch = query;
      track('Shelf Search', { results: found === 0 ? 'none' : 'some' });
    }, 1000);
  }
  // A new search, source, genre or order starts again at the first page.
  const fromFirstPage = () => {
    page = 1;
    apply();
  };
  search.addEventListener('input', fromFirstPage);
  byId('shelf-clear').addEventListener('click', () => {
    search.value = '';
    from.value = '';
    genre.value = '';
    fromFirstPage();
    search.focus();
  });
  wideScreen.addEventListener('change', apply);
  from.addEventListener('change', fromFirstPage);
  genre.addEventListener('change', fromFirstPage);
  sort.addEventListener('change', fromFirstPage);
  // The search filters as you type; Enter shouldn't reload the page.
  controls.addEventListener('submit', e => e.preventDefault());
  controls.hidden = false;
  apply();
}

async function loadJSON<T>(file: string): Promise<T> {
  const res = await fetch(file, { priority: 'low' });
  if (!res.ok) throw new Error(`Couldn't load ${file} (${res.status})`);
  return res.json() as Promise<T>;
}

function showLoadError(error: unknown): never {
  byId('shelf-empty').textContent = "The rest of the shelf didn't load. Reload the page to try again.";
  byId('shelf-empty').hidden = false;
  throw error;
}

initPosters();
initShare();
void afterFirstPaint().then(initScanner);
setUpShelf().catch(showLoadError);
