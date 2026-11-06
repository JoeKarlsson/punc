// The numbers page: the charts are built into the page; this adds their
// tooltips, the genre and measure pickers, and the comparison.
import { setUpMapTooltips } from './map-tooltips';
import { authorProfile, bookProfile, compareHTML, type BookNumbers, type Profile } from './numbers';
import { initShare } from './share';

const need = <T extends Element>(selector: string): T => {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing ${selector} on the numbers page`);
  return el;
};

const map = need<HTMLElement>('.shelf-map');
setUpMapTooltips(map, need<HTMLElement>('#map-tip'));
document.querySelectorAll<HTMLElement>('figure.chart').forEach(chart => setUpMapTooltips(chart, chart.querySelector<HTMLElement>('.map-tip')!));

// Genre: that genre's books stay pink and its median line shows; every
// book's median turns into a dashed reference line.
const genrePick = need<HTMLSelectElement>('#genre-pick');
const genreKey = need<HTMLElement>('#genre-key');
const time = need<HTMLElement>('#time');
genrePick.addEventListener('change', () => {
  const genre = genrePick.value;
  time.classList.toggle('genre-picked', genre !== '');
  time.querySelectorAll<SVGElement>('.chart-dot').forEach(dot => {
    const out = genre !== '' && !(dot.dataset['genres'] ?? '').split('|').includes(genre);
    dot.classList.toggle('chart-dot-out', out);
    // Drawn last, so the genre's books sit on top of the gray ones.
    if (!out) dot.parentElement!.appendChild(dot);
  });
  time.querySelectorAll<SVGElement>('.chart-line-genre').forEach(line => line.classList.toggle('on', line.dataset['genre'] === genre));
  genreKey.textContent = genre
    ? `The white line is the median of ${genre.toLowerCase()} books, where there are at least three in 25 years. The dashed line is every book.`
    : 'The white line is the median of every book.';
});

// Career charts draw every measure; show the picked one.
const careerPick = need<HTMLSelectElement>('#career-pick');
const showCareer = () =>
  document.querySelectorAll<SVGElement>('.career-layer').forEach(layer => layer.classList.toggle('on', layer.dataset['metric'] === careerPick.value));
careerPick.addEventListener('change', showCareer);
showCareer();

// Compare: the options read "author:Name" or "book:slug".
const pickA = need<HTMLSelectElement>('#compare-a');
const pickB = need<HTMLSelectElement>('#compare-b');
const out = need<HTMLElement>('#compare-out');
let shelf: BookNumbers[] | undefined;
const profileFor = (value: string, books: BookNumbers[]): Profile => {
  const [kind, id] = [value.slice(0, value.indexOf(':')), value.slice(value.indexOf(':') + 1)];
  if (kind === 'author') return authorProfile(id, books.filter(b => b.author === id));
  const book = books.find(b => b.slug === id);
  if (!book) throw new Error(`No book ${id} in numbers.json`);
  return bookProfile(book);
};
async function compare(): Promise<void> {
  if (!shelf) {
    const response = await fetch('numbers.json');
    if (!response.ok) throw new Error(`numbers.json: ${response.status}`);
    shelf = (await response.json()) as BookNumbers[];
  }
  out.innerHTML = compareHTML(profileFor(pickA.value, shelf), profileFor(pickB.value, shelf));
}
for (const pick of [pickA, pickB]) {
  pick.addEventListener('change', () => {
    compare().catch(error => {
      out.textContent = 'The comparison could not load. Reload the page to try again.';
      throw error;
    });
  });
}

initShare();
