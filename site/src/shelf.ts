// Search, genre filter, sort and pages for the shelf. The cards are built into
// the page at build time with their numbers in data attributes; this only
// hides and reorders them, and keeps the choices in the URL so they can be
// shared. Hidden cards cost no layout and never load their covers, so a page
// at a time keeps a shelf of hundreds fast.
import { initPosters } from './posters';
import { initShare } from './share';
import { pageLinks, SHELF_PAGE_SIZE } from './paging';

interface Card {
  el: HTMLElement;
  text: string;
  genres: string[];
  rank: number;
  title: string;
  authorSort: string;
  published: number;
  words: number;
  wps: number;
  density: number;
}

const SORTS: Record<string, (a: Card, b: Card) => number> = {
  popular: (a, b) => a.rank - b.rank,
  title: (a, b) => a.title.localeCompare(b.title),
  author: (a, b) => a.authorSort.localeCompare(b.authorSort) || a.title.localeCompare(b.title),
  oldest: (a, b) => a.published - b.published,
  newest: (a, b) => (b.published === 99999 ? -Infinity : b.published) - (a.published === 99999 ? -Infinity : a.published),
  density: (a, b) => b.density - a.density,
  'long-sentences': (a, b) => b.wps - a.wps,
  'short-sentences': (a, b) => a.wps - b.wps,
  longest: (a, b) => b.words - a.words,
};


export const normalizeForSearch = (s: string): string =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '');

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} on the page`);
  return el as T;
}

function setUpShelf(): void {
  const list = byId<HTMLUListElement>('shelf');
  const search = byId<HTMLInputElement>('shelf-search');
  const genre = byId<HTMLSelectElement>('shelf-genre');
  const sort = byId<HTMLSelectElement>('shelf-sort');
  const count = byId('shelf-count');
  const empty = byId('shelf-empty');
  const pages = byId('shelf-pages');
  const heading = byId('shelf-heading');
  let page = 1;
  const controls = byId<HTMLFormElement>('shelf-controls');
  controls.hidden = false;
  // The search filters as you type; Enter shouldn't reload the page.
  controls.addEventListener('submit', e => e.preventDefault());

  const cards: Card[] = [...list.querySelectorAll<HTMLElement>('li[data-title]')].map(el => {
    const d = el.dataset;
    return {
      el,
      text: normalizeForSearch(`${d['title']} ${d['author']}`),
      genres: (d['genres'] ?? '').split('|').filter(Boolean),
      rank: Number(d['rank']),
      title: d['title'] ?? '',
      authorSort: d['authorSort'] ?? '',
      published: Number(d['published']),
      words: Number(d['words']),
      wps: Number(d['wps']),
      density: Number(d['density']),
    };
  });

  const params = new URLSearchParams(location.search);
  search.value = params.get('q') ?? '';
  if (params.get('genre')) genre.value = params.get('genre')!;
  if (params.get('sort') && SORTS[params.get('sort')!]) sort.value = params.get('sort')!;
  page = Math.max(1, Math.floor(Number(params.get('page'))) || 1);

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
      .filter(c => terms.every(t => c.text.includes(t)) && (!genre.value || c.genres.includes(genre.value)))
      .sort(SORTS[sort.value] ?? SORTS['popular']);
    const pageCount = Math.max(1, Math.ceil(shown.length / SHELF_PAGE_SIZE));
    page = Math.min(page, pageCount);
    const start = (page - 1) * SHELF_PAGE_SIZE;
    const onPage = shown.slice(start, start + SHELF_PAGE_SIZE);
    const visible = new Set(onPage);
    // Touch only what changes: rewriting hundreds of cards forces a full relayout.
    cards.forEach(c => {
      if (c.el.hidden === visible.has(c)) c.el.hidden = !visible.has(c);
    });
    const inOrder = shown.every((c, i) => list.children[i] === c.el);
    if (!inOrder) list.append(...shown.map(c => c.el));
    const matching = shown.length === cards.length ? `${cards.length} books` : `${shown.length} matching books (${cards.length} on the shelf)`;
    count.textContent = onPage.length ? `Showing ${start + 1}–${start + onPage.length} of ${matching}` : `Showing 0 of ${cards.length} books`;
    empty.hidden = shown.length > 0;

    pages.hidden = pageCount === 1;
    pages.replaceChildren();
    if (page > 1) pages.append(pageButton('Previous', page - 1));
    for (const n of pageLinks(page, pageCount)) {
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
  genre.addEventListener('change', fromFirstPage);
  sort.addEventListener('change', fromFirstPage);
  apply();
}

setUpShelf();
initPosters();
initShare();
