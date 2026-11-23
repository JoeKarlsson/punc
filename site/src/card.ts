// One shelf card, as HTML. The build writes the first page of the shelf with it, and the browser draws the rest of the shelf from
// shelf-index.json and shelf-faces.json with it, so the two can't drift apart.
import { fromColumns, type Columns } from './columns';
import { fingerprintHTML } from './patterns';

// What the shelf knows about a book. The build writes everything but the
// faces to shelf-index.json, which search and sort need, and the faces to
// shelf-faces.json, which only cards past the first page need.
export interface ShelfBook {
  slug: string;
  title: string;
  author: string;
  // The year as the byline shows it, when that isn't publishedSort ("c. 1600";
  // "" for no year); null when it is.
  yearLabel: string | null;
  genres: string[];
  // Popularity on Gutenberg; null for favorites outside the top list and for modern books
  rank: number | null;
  publishedSort: number | null;
  words: number;
  marks: number;
  wps: number;
  density: number;
  // A run of the book's marks for the poster
  sample: string;
  // markShares() of the whole book, for the fingerprint
  shares: number[];
  cover: boolean;
  // Modern books only (HathiTrust counts, site/src/modern-page.ts): how well
  // known it is, 1 first; null for Gutenberg books. They have no sample or cover.
  modern: number | null;
}

export type ShelfIndexBook = Omit<ShelfBook, 'sample' | 'shares'>;
// Shares as whole thousandths: a fingerprint's label shows no finer, and a mark
// that is there never rounds away.
export interface ShelfFaces {
  sample: string[];
  shares: number[][];
}
export const perMille = (share: number): number => (share > 0 ? Math.max(1, Math.round(share * 1000)) : 0);

// i is the book's place in both files, which share the shelf's order.
export const withFace = (book: ShelfIndexBook, faces: ShelfFaces, i: number): ShelfBook => ({ ...book, sample: faces.sample[i]!, shares: faces.shares[i]!.map(n => n / 1000) });
export const shelfBooksFrom = (index: Columns<ShelfIndexBook>, faces: ShelfFaces): ShelfBook[] => fromColumns(index).map((book, i) => withFace(book, faces, i));

export function bylineOf(book: Pick<ShelfBook, 'author' | 'yearLabel' | 'publishedSort'>): string {
  const year = book.yearLabel ?? (book.publishedSort === null ? '' : String(book.publishedSort));
  return year ? `${book.author}, ${year}` : book.author;
}

const TILTS = [-1.6, 0.9, -0.6, 1.8, -1.1, 0.4, -1.9, 1.3, -0.3];

const escapeHTML = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n: number) => n.toLocaleString('en-US');

// i picks the card's tilt, so neighbours lean different ways. The first row can be on the
// first screen, so it isn't lazy.
export function cardHTML(book: ShelfBook, i: number): string {
  if (book.modern !== null) {
    return `<li class="cover poster cover-modern" style="--tilt:${TILTS[i % TILTS.length]}deg" data-slug="${book.slug}">
      <a href="books/${book.slug}/">
        <span class="cover-label"><span class="cover-title">${escapeHTML(book.title)}</span><span class="cover-author">${escapeHTML(bylineOf(book))}</span></span>
      </a>
      <p class="cover-meta">${book.wps.toFixed(1)} words a sentence</p>
      ${fingerprintHTML(book.shares)}
    </li>`;
  }
  const poster = book.cover ? `<img data-poster src="covers/${book.slug}.jpg" alt=""${i < 4 ? '' : ' loading="lazy"'} decoding="async">` : '';
  return `<li class="cover poster" style="--tilt:${TILTS[i % TILTS.length]}deg" data-slug="${book.slug}">
      <a href="books/${book.slug}/">
        ${poster}
        <span class="poster-marks" aria-hidden="true">${escapeHTML(book.sample)}</span>
        <span class="cover-label"><span class="cover-title">${escapeHTML(book.title)}</span><span class="cover-author">${escapeHTML(bylineOf(book))}</span></span>
      </a>
      <p class="cover-meta">${fmt(book.marks)} marks left</p>
      ${fingerprintHTML(book.shares)}
    </li>`;
}
