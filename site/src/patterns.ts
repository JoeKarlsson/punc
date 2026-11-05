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
  return `<ol class="through-book">${rows}</ol>`;
}
