// The numbers page. The build draws each chart's frame and median lines;
// this loads numbers.json and draws the books into them and the map
// (thousands of dots would make the page slow to arrive), and runs the
// tooltips, the genre and measure pickers, the comparison and the table of
// every book.
import { afterFirstPaint } from './first-paint';
import { setUpMapTooltips } from './map-tooltips';
import {
  authorDetailHTML,
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
const authorDetail = need<HTMLElement>('#author-detail');
const career = need<HTMLElement>('#author-career');
const careerNone = need<HTMLElement>('#career-none');
const picks = [...document.querySelectorAll<HTMLButtonElement>('.author-pick')];
// numbers.json, once it has loaded
let loadedShelf: BookNumbers[] | null = null;
let pickedAuthor = '';

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

// The picked author's career chart, or a note when they haven't one.
function drawCareer(shelf: BookNumbers[]): void {
  const svg = careerSVGs(shelf, careerPick.value as MetricKey).get(pickedAuthor);
  const chart = need<HTMLElement>('.career-chart', career);
  chart.innerHTML = svg ?? '';
  chart.hidden = svg === undefined;
  careerNone.hidden = svg !== undefined;
  need<HTMLElement>('.numbers-controls', career).hidden = svg === undefined;
  if (svg) tooltips(career);
}

// Show one author in full. The build wrote in the first; the rest are drawn
// from numbers.json and the guesses carried by their list row.
function pickAuthor(button: HTMLButtonElement, shelf: BookNumbers[] | null): void {
  pickedAuthor = button.dataset['author'] ?? '';
  for (const other of picks) other.setAttribute('aria-pressed', String(other === button));
  if (!shelf) return;
  const guessed = new Map([...button.querySelectorAll<HTMLElement>('[data-slug]')].map(s => [s.dataset['slug'] ?? '', s.dataset['guessed'] ?? '']));
  const books = shelf.filter(b => b.author === pickedAuthor);
  authorDetail.innerHTML = authorDetailHTML(pickedAuthor, books, guessed, Number(button.dataset['spread']));
  // The same career chart, picker and all, moves into the new author.
  need('.author-detail-side', authorDetail).append(career);
  drawCareer(shelf);
}

// Lets the browser paint and answer taps between the charts: drawn in one go,
// every book on every chart blocked the page for over half a second on a phone.
const yieldToBrowser = () => new Promise<void>(resolve => setTimeout(resolve, 0));

async function drawBooks(shelf: BookNumbers[]): Promise<void> {
  loadedShelf = shelf;
  findAuthor(shelf);
  const picked = picks.find(p => p.dataset['author'] === pickedAuthor);
  if (picked && picked !== picks[0]) pickAuthor(picked, shelf);
  for (const group of document.querySelectorAll<SVGGElement>('#time .chart-dots, #popularity .chart-dots')) {
    await yieldToBrowser();
    const key = group.dataset['metric'] as MetricKey;
    const max = Number(group.dataset['max']);
    group.innerHTML = group.closest('#time') ? timelineDots(shelf, key, max) : popularityDots(shelf, key, max);
    tooltips(group.closest<HTMLElement>('figure.chart')!);
  }
  showGenre();

  await yieldToBrowser();
  const map = need<HTMLElement>('#numbers-map');
  map.innerHTML = mapSVG(shelf, { labelled: (map.dataset['labelled'] ?? '').split(' ') });
  setUpMapTooltips(need<HTMLElement>('.shelf-map'), need<HTMLElement>('#map-tip'));

  await yieldToBrowser();

  const byTitle = [...shelf].sort((a, b) => a.title.localeCompare(b.title));
  for (const pick of [pickA, pickB]) {
    const books = need<HTMLOptGroupElement>('optgroup[label="Books"]', pick);
    books.append(...byTitle.map(b => new Option(`${b.title}, ${b.author}`, `book:${b.slug}`)));
    pick.addEventListener('change', () => (out.innerHTML = compareHTML(profileFor(pickA.value, shelf), profileFor(pickB.value, shelf))));
  }

  await yieldToBrowser();
  drawCareer(shelf);
  careerPick.addEventListener('change', () => drawCareer(shelf));
  // The table has a row for every book; it's drawn the first time it's opened.
  table.addEventListener('toggle', () => {
    const body = need<HTMLElement>('tbody', table);
    if (table.open && !body.firstChild) body.innerHTML = numbersTableRows(shelf);
  });
}

// The picked author goes in the address, so a link can open on them.
function rememberAuthor(): void {
  const params = new URLSearchParams(location.search);
  if (pickedAuthor === picks[0]?.dataset['author']) params.delete('author');
  else params.set('author', pickedAuthor);
  const query = params.toString();
  history.replaceState(null, '', `${query ? `?${query}` : location.pathname}${location.hash}`);
}

// Find an author: the list keeps only the matching names, and the first of
// them is shown in full when the one showing is filtered out. A name with too
// few books for the list still finds its books on the shelf.
function findAuthor(shelf: BookNumbers[] | null): void {
  const terms = normalizeForSearch(authorSearch.value).split(' ').filter(Boolean);
  const matches = (name: string) => terms.every(t => normalizeForSearch(name).includes(t));
  for (const pick of picks) pick.parentElement!.hidden = !matches(pick.dataset['author'] ?? '');
  const shown = picks.filter(p => !p.parentElement!.hidden);
  if (shown.length && !shown.some(p => p.dataset['author'] === pickedAuthor)) {
    pickAuthor(shown[0]!, shelf);
    rememberAuthor();
  }

  // Until numbers.json loads there's no shelf to look further in.
  authorFound.hidden = terms.length === 0 || shown.length > 0 || shelf === null;
  if (authorFound.hidden || shelf === null) return;
  const books = shelf.filter(b => matches(b.author));
  if (!books.length) {
    authorFound.textContent = `No author on the shelf matches "${authorSearch.value}".`;
    return;
  }
  const list = books.map(b => `<a href="books/${b.slug}/">${escapeText(b.title)}</a> by ${escapeText(b.author)}`).join(', ');
  authorFound.innerHTML = `Too few books to guess from: the list needs three or more works by one author. On the shelf: ${list}.`;
}

const escapeText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

genrePick.addEventListener('change', showGenre);
for (const pick of picks)
  pick.addEventListener('click', () => {
    pickAuthor(pick, loadedShelf);
    rememberAuthor();
  });
authorSearch.addEventListener('input', () => findAuthor(loadedShelf));
need('#author-find').addEventListener('submit', e => e.preventDefault());
// A link can name an author on the list, or anyone else to search for.
const linkedAuthor = new URLSearchParams(location.search).get('author') ?? '';
const linkedPick = picks.find(p => p.dataset['author'] === linkedAuthor);
if (linkedPick) pickAuthor(linkedPick, null);
else {
  pickAuthor(picks[0]!, null);
  authorSearch.value = linkedAuthor;
  findAuthor(null);
}

// The page's text and medians are in the HTML; the dots for every book can wait.
afterFirstPaint()
  .then(() => fetch('numbers.json'))
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
