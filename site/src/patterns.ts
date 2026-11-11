// Punctuation-only measures and their markup, shared by the build (shelf
// cards, the map) and the browser (book pages, uploads). Everything here is
// about the marks themselves, never the words around them.

export interface TrackedMark {
  mark: string;
  name: string;
}

// The fingerprint's fixed order: the same ten slots for every book, so two
// fingerprints can be read against each other at a glance.
export const TRACKED_MARKS: TrackedMark[] = [
  { mark: ',', name: 'comma' },
  { mark: '.', name: 'period' },
  { mark: '"', name: 'double quote' },
  { mark: "'", name: 'apostrophe or single quote' },
  { mark: ';', name: 'semicolon' },
  { mark: ':', name: 'colon' },
  { mark: '-', name: 'dash or hyphen' },
  { mark: '?', name: 'question mark' },
  { mark: '!', name: 'exclamation mark' },
  { mark: '(', name: 'parenthesis' },
];

const PAUSES = new Set([',', ';', ':', '-']);
const STOPS = new Set(['.', '?', '!']);
const LOUD = new Set(['?', '!']);

const escapeHTML = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const percent = (share: number) => `${(share * 100).toFixed(share < 0.01 ? 1 : 0)}%`;

// Share of all marks for each tracked mark. "(" stands for both parentheses.
export function markShares(marks: string[]): number[] {
  const counts = new Map<string, number>();
  for (const m of marks) {
    const key = m === ')' ? '(' : m;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const total = Math.max(marks.length, 1);
  return TRACKED_MARKS.map(({ mark }) => (counts.get(mark) ?? 0) / total);
}

// For each tracked mark, its share of the marks in each of `slices` equal
// stretches of the book (by mark count, so every slice has the same weight).
export function marksThroughBook(marks: string[], slices = 10): number[][] {
  const perSlice: string[][] = Array.from({ length: slices }, (_, i) =>
    marks.slice(Math.floor((i * marks.length) / slices), Math.floor(((i + 1) * marks.length) / slices))
  );
  const shares = perSlice.map(markShares);
  return TRACKED_MARKS.map((_, m) => shares.map(slice => slice[m]!));
}

// Where a book sits on the shelf map, from its marks alone.
// pausesPerStop: commas, semicolons, colons and dashes per sentence ending.
// loudness: share of all marks that are ? or !.
export function shelfPosition(marks: string[]): { pausesPerStop: number; loudness: number } {
  let pauses = 0;
  let stops = 0;
  let loud = 0;
  for (const m of marks) {
    if (PAUSES.has(m)) pauses++;
    if (STOPS.has(m)) stops++;
    if (LOUD.has(m)) loud++;
  }
  return { pausesPerStop: pauses / Math.max(stops, 1), loudness: loud / Math.max(marks.length, 1) };
}

// Ten bars in fixed slots, the mark printed under each. Every book shares one
// scale (0 to FINGERPRINT_MAX), square-root so a 1% "!" still shows beside a
// 30% comma; the exact share is in each slot's tooltip and the label.
const FINGERPRINT_MAX = 0.5;
export function fingerprintHTML(shares: number[], className = 'fingerprint'): string {
  const label = TRACKED_MARKS.map(({ name }, i) => `${name} ${percent(shares[i]!)}`).join(', ');
  const slots = TRACKED_MARKS.map(({ mark, name }, i) => {
    const share = shares[i]!;
    const height = share > 0 ? Math.max(4, Math.sqrt(Math.min(share / FINGERPRINT_MAX, 1)) * 100) : 0;
    return `<span class="fp-slot" title="${escapeHTML(`${name}: ${percent(share)}`)}"><span class="fp-bar" style="height:${height.toFixed(1)}%"></span><span class="fp-mark">${escapeHTML(mark)}</span></span>`;
  }).join('');
  return `<p class="${className}" role="img" aria-label="${escapeHTML(`Punctuation fingerprint: ${label}`)}">${slots}</p>`;
}

// One row per mark: ten bars, one per tenth of the book, each row scaled to
// its own peak (written beside it), so the shape of the change is what shows.
export function throughBookHTML(series: number[][]): string {
  const W = 200;
  const H = 40;
  const GAP = 2;
  const barW = (W - GAP * 9) / 10;
  const rows = TRACKED_MARKS.map(({ mark, name }, m) => {
    const values = series[m]!;
    const peak = Math.max(...values);
    if (peak === 0) return '';
    const bars = values
      .map((v, i) => {
        const h = Math.max(1, (v / peak) * H);
        return `<rect x="${(i * (barW + GAP)).toFixed(1)}" y="${(H - h).toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="1.5"><title>${escapeHTML(`${name}, tenth ${i + 1}: ${percent(v)} of the marks`)}</title></rect>`;
      })
      .join('');
    return `<li><span class="tb-mark" aria-hidden="true">${escapeHTML(mark)}</span><span class="tb-name">${escapeHTML(name)}<br><span class="tb-peak">peaks at ${percent(peak)}</span></span><svg class="tb-bars" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${escapeHTML(`${name} through the book, by tenth: ${values.map(percent).join(', ')}`)}">${bars}</svg></li>`;
  }).join('');
  // A shared axis under the last row, lined up with the bars, so it reads as
  // a timeline of the book from start to finish.
  const ticks = ['Start', '25%', '50%', '75%', 'End']
    .map((label, i) => `<span class="tb-tick" style="left:${i * 25}%">${label}</span>`)
    .join('');
  const axis = `<div class="tb-axis" aria-hidden="true"><span class="tb-ticks">${ticks}</span><span class="tb-axis-label">How far through the book</span></div>`;
  return `<ol class="through-book">${rows}</ol>${axis}`;
}

// An axis from 0 that ends on a round number, with at most `maxTicks` + 1
// ticks however wide the data runs (an all-"?!" upload reaches 80%).
export function niceAxis(dataMax: number, maxTicks = 8): { max: number; ticks: number[] } {
  const steps = [0.5, 1, 2, 5, 10, 20, 25, 50, 100];
  const top = Math.max(dataMax, 0.5);
  const step = steps.find(st => Math.ceil(top / st) <= maxTicks) ?? 100;
  const max = Math.ceil(top / step) * step;
  return { max, ticks: Array.from({ length: max / step + 1 }, (_, i) => i * step) };
}

export interface MapPoint {
  slug?: string;
  title: string;
  author?: string;
  pausesPerStop: number;
  loudness: number;
}

export interface MapOptions {
  // Shelf books to label; the rest show their title on hover only
  labelled?: string[];
  // A book to mark on the map: a shelf book (by slug) or an uploaded file
  highlight?: MapPoint;
  // Prefix for links to book pages, for pages that aren't at the site root
  root?: string;
}

// The shelf map as an SVG string. Built into map.html at build time, and drawn
// on book pages with that book picked out. site/src/map-tooltips.ts adds the
// hover tooltip.
export function mapSVG(points: MapPoint[], { labelled = [], highlight, root = '' }: MapOptions = {}): string {
  const W = 1000;
  const H = 640;
  const L = 70;
  const R = 30;
  const T = 30;
  const B = 70;
  const all = highlight ? [...points, highlight] : points;
  const xAxis = niceAxis(Math.max(...all.map(b => b.pausesPerStop)) * 1.05);
  const yAxis = niceAxis(Math.max(...all.map(b => b.loudness * 100)) * 1.1);
  const x = (v: number) => L + (v / xAxis.max) * (W - L - R);
  const y = (v: number) => H - B - (v / yAxis.max) * (H - T - B);
  const xTicks = xAxis.ticks;
  const yTicks = yAxis.ticks;
  const grid = [
    ...xTicks.map(v => `<line class="map-grid" x1="${x(v)}" x2="${x(v)}" y1="${T}" y2="${H - B}"/><text class="map-tick" x="${x(v)}" y="${H - B + 26}" text-anchor="middle">${v}</text>`),
    ...yTicks.map(v => `<line class="map-grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="map-tick" x="${L - 12}" y="${y(v) + 6}" text-anchor="end">${v}%</text>`),
  ].join('');
  const axes = `<text class="map-axis" x="${(L + W - R) / 2}" y="${H - 14}" text-anchor="middle">pauses per stop</text><text class="map-axis" transform="translate(20 ${(T + H - B) / 2}) rotate(-90)" text-anchor="middle">? and ! share</text>`;
  const tipFor = (b: MapPoint) =>
    `${b.title}${b.author ? `, ${b.author}` : ''}: ${b.pausesPerStop.toFixed(1)} pauses per stop, ${(b.loudness * 100).toFixed(1)}% ? and !`;
  const labelAt = (cx: number, cy: number, text: string, className = 'map-label') =>
    `<text class="${className}" x="${cx + (cx > W * 0.75 ? -16 : 16)}" y="${cy + 6}" text-anchor="${cx > W * 0.75 ? 'end' : 'start'}">${escapeHTML(text)}</text>`;
  // A label's rough box (19px type, about 10.5px a character), so a label
  // that would run into one already placed is left to the hover tooltip.
  const placed: Array<{ left: number; right: number; top: number; bottom: number }> = [];
  const labelFits = (cx: number, cy: number, text: string) => {
    const width = text.length * 10.5;
    const left = cx > W * 0.75 ? cx - 16 - width : cx + 16;
    const box = { left, right: left + width, top: cy - 7, bottom: cy + 10 };
    if (placed.some(p => box.left < p.right && p.left < box.right && box.top < p.bottom && p.top < box.bottom)) return false;
    placed.push(box);
    return true;
  };
  const picked = new Set(labelled);

  const dots: string[] = [];
  const labels: string[] = [];
  for (const b of points) {
    if (highlight?.slug && b.slug === highlight.slug) continue;
    const cx = x(b.pausesPerStop);
    const cy = y(b.loudness * 100);
    const tip = escapeHTML(tipFor(b));
    dots.push(`<a href="${root}books/${b.slug}/" tabindex="-1" data-tip="${tip}" aria-label="${tip}"><circle class="map-hit" cx="${cx}" cy="${cy}" r="16"/><circle class="map-dot" cx="${cx}" cy="${cy}" r="7"/></a>`);
    if (b.slug && picked.has(b.slug) && !highlight && labelFits(cx, cy, b.title)) labels.push(labelAt(cx, cy, b.title));
  }
  if (highlight) {
    const cx = x(highlight.pausesPerStop);
    const cy = y(highlight.loudness * 100);
    const tip = escapeHTML(tipFor(highlight));
    dots.push(`<g class="map-here" data-tip="${tip}" tabindex="0" role="img" aria-label="${tip}"><circle class="map-here-dot" cx="${cx}" cy="${cy}" r="12"/></g>`);
    labels.push(labelAt(cx, cy, highlight.title, 'map-label map-label-here'));
  }
  // Labels go in their own layer above every dot, so later dots can't cover them.
  return `<svg class="map-svg" viewBox="0 0 ${W} ${H}" role="group" aria-label="Map of the shelf: pauses per stop across, share of question and exclamation marks up">${grid}${axes}<g>${dots.join('')}</g><g aria-hidden="true">${labels.join('')}</g></svg>`;
}
