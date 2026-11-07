// Search, genre filter, sort and pages for the shelf. The page arrives with
// the first page of cards built in; the whole shelf comes from shelf.json,
// and only the cards on the page in view are ever drawn, so a shelf of
// hundreds costs no more than one page. The choices live in the URL so they
// can be shared.
import { cardHTML, type ShelfBook } from './card';
import { initPosters } from './posters';
import { initShare } from './share';
import { normalizeForSearch, pageLinks, SHELF_PAGE_SIZE } from './paging';

// On a wide screen the page buttons fill the width under the shelf, so more
// of them fit.
const wideScreen = window.matchMedia('(min-width: 900px)');

interface Card {
  book: ShelfBook;
  // Search text: title and author, normalized
  text: string;
  // Drawn the first time it's on the page in view
  el: HTMLElement | undefined;
}

const rankOf = (c: Card) => c.book.rank ?? Infinity;
const SORTS: Record<string, (a: Card, b: Card) => number> = {
  popular: (a, b) => rankOf(a) - rankOf(b),
  title: (a, b) => a.book.title.localeCompare(b.book.title),
  author: (a, b) => a.book.authorSort.localeCompare(b.book.authorSort) || a.book.title.localeCompare(b.book.title),
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
  const genre = byId<HTMLSelectElement>('shelf-genre');
  const sort = byId<HTMLSelectElement>('shelf-sort');
  const count = byId('shelf-count');
  const empty = byId('shelf-empty');
  const pages = byId('shelf-pages');
  const heading = byId('shelf-heading');
  const controls = byId<HTMLFormElement>('shelf-controls');

  const res = await fetch('shelf.json');
  if (!res.ok) throw new Error(`Couldn't load the shelf (${res.status})`);
  const books = (await res.json()) as ShelfBook[];
  // Reuse the cards already in the page.
  const built = new Map([...list.querySelectorAll<HTMLElement>('li[data-slug]')].map(el => [el.dataset['slug'], el]));
  const cards: Card[] = books.map(book => ({
    book,
    text: normalizeForSearch(`${book.title} ${book.author}`),
    el: built.get(book.slug),
  }));
  const template = document.createElement('template');
  const draw = (card: Card, i: number): HTMLElement => {
    if (!card.el) {
      template.innerHTML = cardHTML(card.book, i);
      card.el = template.content.firstElementChild as HTMLElement;
      initPosters(card.el);
    }
    return card.el;
  };

  const params = new URLSearchParams(location.search);
  search.value = params.get('q') ?? '';
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

  const apply = () => {
    const terms = normalizeForSearch(search.value).split(' ').filter(Boolean);
    const shown = cards
      .filter(c => terms.every(t => c.text.includes(t)) && (!genre.value || c.book.genres.includes(genre.value)))
      .sort(SORTS[sort.value] ?? SORTS['popular']);
    const pageCount = Math.max(1, Math.ceil(shown.length / SHELF_PAGE_SIZE));
    page = Math.min(page, pageCount);
    const start = (page - 1) * SHELF_PAGE_SIZE;
    const onPage = shown.slice(start, start + SHELF_PAGE_SIZE).map((c, i) => draw(c, start + i));
    // The first page as built needs no redraw.
    if (onPage.length !== list.children.length || onPage.some((el, i) => list.children[i] !== el)) list.replaceChildren(...onPage);
    const matching = shown.length === cards.length ? `${cards.length} books` : `${shown.length} matching books (${cards.length} on the shelf)`;
    count.textContent = onPage.length ? `Showing ${start + 1}–${start + onPage.length} of ${matching}` : `Showing 0 of ${cards.length} books`;
    empty.hidden = shown.length > 0;

    pages.hidden = pageCount === 1;
    pages.replaceChildren();
    if (page > 1) pages.append(pageButton('Previous', page - 1));
    for (const n of pageLinks(page, pageCount, wideScreen.matches ? 4 : 1)) {
      if (n === null) {
        const gap = document.createElement('span');
        gap.className = 'shelf-page-gap';
        gap.textContent = '…';
        pages.append(gap);
      } else pages.append(pageButton(String(n), n, n === page));
    }
    if (page < pageCount) pages.append(pageButton('Next', page + 1));

    const next = new URLSearchParams();
    if (search.value) next.set('q', search.value);
    if (genre.value) next.set('genre', genre.value);
    if (sort.value !== 'popular') next.set('sort', sort.value);
    if (page > 1) next.set('page', String(page));
    const query = next.toString();
    history.replaceState(null, '', query ? `?${query}#shelf-heading` : location.pathname);
  };
  // A new search, genre or order starts again at the first page.
  const fromFirstPage = () => {
    page = 1;
    apply();
  };
  search.addEventListener('input', fromFirstPage);
  wideScreen.addEventListener('change', apply);
  genre.addEventListener('change', fromFirstPage);
  sort.addEventListener('change', fromFirstPage);
  // The search filters as you type; Enter shouldn't reload the page.
  controls.addEventListener('submit', e => e.preventDefault());
  controls.hidden = false;
  apply();
}

initPosters();
initShare();
setUpShelf().catch((error: unknown) => {
  byId('shelf-empty').textContent = 'The rest of the shelf did not load. Reload the page to try again.';
  byId('shelf-empty').hidden = false;
  throw error;
});
