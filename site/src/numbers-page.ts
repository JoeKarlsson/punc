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

genrePick.addEventListener('change', showGenre);

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
