// Search, genre filter and sort for the shelf. The cards are built into the
// page at build time with their numbers in data attributes; this only hides
// and reorders them, and keeps the choices in the URL so they can be shared.
import { initPosters } from './posters';
import { initShare } from './share';

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

// Phones get the first stretch of the shelf and a button for the rest, so the
// page isn't a hundred posters long before you reach the footer.
const PHONE_SHELF_LIMIT = 20;
const phone = window.matchMedia('(max-width: 720px)');

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
  const more = byId<HTMLButtonElement>('shelf-more');
  let showWholeShelf = false;
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

  const apply = () => {
    const terms = normalizeForSearch(search.value).split(' ').filter(Boolean);
    const shown = cards
      .filter(c => terms.every(t => c.text.includes(t)) && (!genre.value || c.genres.includes(genre.value)))
      .sort(SORTS[sort.value] ?? SORTS['popular']);
    const limit = showWholeShelf || !phone.matches ? shown.length : PHONE_SHELF_LIMIT;
    const visible = new Set(shown.slice(0, limit));
    cards.forEach(c => (c.el.hidden = !visible.has(c)));
    list.append(...shown.map(c => c.el));
    count.textContent = `Showing ${visible.size} of ${cards.length} books`;
    more.hidden = shown.length <= limit;
    more.textContent = `Show all ${shown.length}`;
    empty.hidden = shown.length > 0;

    const next = new URLSearchParams();
    if (search.value) next.set('q', search.value);
    if (genre.value) next.set('genre', genre.value);
    if (sort.value !== 'popular') next.set('sort', sort.value);
    const query = next.toString();
    history.replaceState(null, '', query ? `?${query}#shelf-heading` : location.pathname);
  };
  search.addEventListener('input', apply);
  genre.addEventListener('change', apply);
  sort.addEventListener('change', apply);
  phone.addEventListener('change', apply);
  more.addEventListener('click', () => {
    showWholeShelf = true;
    apply();
  });
  apply();
}

setUpShelf();
initPosters();
initShare();
