// The numbers page. The build draws each chart's frame and median lines;
// this loads numbers.json and draws the books into them and the map
// (thousands of dots would make the page slow to arrive), and runs the
// tooltips, the genre and measure pickers, the comparison and the table of
// every book.
import { setUpMapTooltips } from './map-tooltips';
import {
  authorProfile,
  bookProfile,
  careerSVGs,
  compareHTML,
  numbersTableRows,
  popularityDots,
  timelineDots,
  type BookNumbers,
  type MetricKey,
  type Profile,
} from './numbers';
import { normalizeForSearch } from './paging';
import { mapSVG } from './patterns';
import { initShare } from './share';

const need = <T extends Element>(selector: string, within: ParentNode = document): T => {
  const el = within.querySelector<T>(selector);
  if (!el) throw new Error(`Missing ${selector} on the numbers page`);
  return el;
};

const tooltips = (chart: HTMLElement) => setUpMapTooltips(chart, need<HTMLElement>('.map-tip', chart));

const genrePick = need<HTMLSelectElement>('#genre-pick');
const genreKey = need<HTMLElement>('#genre-key');
const time = need<HTMLElement>('#time');
const careerPick = need<HTMLSelectElement>('#career-pick');
const pickA = need<HTMLSelectElement>('#compare-a');
const pickB = need<HTMLSelectElement>('#compare-b');
const out = need<HTMLElement>('#compare-out');
const table = need<HTMLDetailsElement>('#numbers-table');
const authorSearch = need<HTMLInputElement>('#author-search');
const authorFound = need<HTMLElement>('#author-found');
// numbers.json, once it has loaded
let loadedShelf: BookNumbers[] | null = null;

// Genre: that genre's books stay pink, on top, and its median line shows;
// every book's median turns into a dashed reference line.
function showGenre(): void {
  const genre = genrePick.value;
  time.classList.toggle('genre-picked', genre !== '');
  time.querySelectorAll<SVGElement>('.chart-dot').forEach(dot => {
    const outside = genre !== '' && !(dot.dataset['genres'] ?? '').split('|').includes(genre);
    dot.classList.toggle('chart-dot-out', outside);
    if (!outside) dot.parentElement!.appendChild(dot);
  });
  time.querySelectorAll<SVGElement>('.chart-line-genre').forEach(line => line.classList.toggle('on', line.dataset['genre'] === genre));
  genreKey.textContent = genre
    ? `The white line is the median of ${genre.toLowerCase()} books, where there are at least three in 25 years. The dashed line is every book.`
    : 'The white line is the median of every book.';
}

// The options read "author:Name" or "book:slug".
function profileFor(value: string, shelf: BookNumbers[]): Profile {
  const split = value.indexOf(':');
  const [kind, id] = [value.slice(0, split), value.slice(split + 1)];
  if (kind === 'author') return authorProfile(id, shelf.filter(b => b.author === id));
  const book = shelf.find(b => b.slug === id);
  if (!book) throw new Error(`No book ${id} in numbers.json`);
  return bookProfile(book);
}

function drawCareers(shelf: BookNumbers[]): void {
  const charts = careerSVGs(shelf, careerPick.value as MetricKey);
  document.querySelectorAll<HTMLElement>('figure.career').forEach(figure => {
    const svg = charts.get(figure.dataset['author'] ?? '');
    if (!svg) throw new Error(`No career chart for ${figure.dataset['author']}`);
    need('.career-chart', figure).innerHTML = svg;
    tooltips(figure);
  });
}

function drawBooks(shelf: BookNumbers[]): void {
  loadedShelf = shelf;
  findAuthor(shelf);
  document.querySelectorAll<SVGGElement>('#time .chart-dots, #popularity .chart-dots').forEach(group => {
    const key = group.dataset['metric'] as MetricKey;
    const max = Number(group.dataset['max']);
    group.innerHTML = group.closest('#time') ? timelineDots(shelf, key, max) : popularityDots(shelf, key, max);
    tooltips(group.closest<HTMLElement>('figure.chart')!);
  });
  showGenre();

  const map = need<HTMLElement>('#numbers-map');
  map.innerHTML = mapSVG(shelf, { labelled: (map.dataset['labelled'] ?? '').split(' ') });
  setUpMapTooltips(need<HTMLElement>('.shelf-map'), need<HTMLElement>('#map-tip'));

  const byTitle = [...shelf].sort((a, b) => a.title.localeCompare(b.title));
  for (const pick of [pickA, pickB]) {
    const books = need<HTMLOptGroupElement>('optgroup[label="Books"]', pick);
    books.append(...byTitle.map(b => new Option(`${b.title}, ${b.author}`, `book:${b.slug}`)));
    pick.addEventListener('change', () => (out.innerHTML = compareHTML(profileFor(pickA.value, shelf), profileFor(pickB.value, shelf))));
  }

  drawCareers(shelf);
  careerPick.addEventListener('change', () => drawCareers(shelf));
  // The table is 490 rows; it's drawn the first time it's opened.
  table.addEventListener('toggle', () => {
    const body = need<HTMLElement>('tbody', table);
    if (table.open && !body.firstChild) body.innerHTML = numbersTableRows(shelf);
  });
}

// Find an author: shows only the matching authors in both author views. A
// name with too few books for those still finds its books on the shelf.
function findAuthor(shelf: BookNumbers[] | null): void {
  const terms = normalizeForSearch(authorSearch.value).split(' ').filter(Boolean);
  const matches = (name: string) => terms.every(t => normalizeForSearch(name).includes(t));
  const entries = [...document.querySelectorAll<HTMLElement>('#authors [data-author]')];
  for (const el of entries) el.hidden = !matches(el.dataset['author'] ?? '');
  const shown = new Set(entries.filter(el => !el.hidden).map(el => el.dataset['author']));
  const params = new URLSearchParams(location.search);
  if (terms.length) params.set('author', authorSearch.value);
  else params.delete('author');
  const query = params.toString();
  history.replaceState(null, '', `${query ? `?${query}` : location.pathname}${location.hash}`);

  // Until numbers.json loads there's no shelf to look further in.
  authorFound.hidden = terms.length === 0 || shown.size > 0 || shelf === null;
  if (authorFound.hidden || shelf === null) return;
  const books = shelf.filter(b => matches(b.author));
  if (!books.length) {
    authorFound.textContent = `No author on the shelf matches "${authorSearch.value}".`;
    return;
  }
  const list = books.map(b => `<a href="books/${b.slug}/">${escapeText(b.title)}</a> by ${escapeText(b.author)}`).join(', ');
  authorFound.innerHTML = `Too few books to chart: these views need three or more by one author. On the shelf: ${list}.`;
}

const escapeText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

genrePick.addEventListener('change', showGenre);
authorSearch.value = new URLSearchParams(location.search).get('author') ?? '';
authorSearch.addEventListener('input', () => findAuthor(loadedShelf));
need('#author-find').addEventListener('submit', e => e.preventDefault());
findAuthor(null);

fetch('numbers.json')
  .then(response => {
    if (!response.ok) throw new Error(`numbers.json: ${response.status}`);
    return response.json() as Promise<BookNumbers[]>;
  })
  .then(drawBooks)
  .catch((error: unknown) => {
    genreKey.textContent = "The books couldn't load, so the charts show only their median lines. Reload the page to try again.";
    throw error;
  });

initShare();
