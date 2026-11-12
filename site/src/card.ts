// One shelf card, as HTML. The build writes the first page of the shelf with it, and the browser draws the rest of the shelf from
// shelf.json with it, so the two can't drift apart.
import { fingerprintHTML } from './patterns';

// What the shelf knows about a book: the build writes these to shelf.json.
export interface ShelfBook {
  slug: string;
  title: string;
  author: string;
  byline: string;
  authorSort: string;
  genres: string[];
  // Popularity on Gutenberg; null for favorites outside the top list
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
}

const TILTS = [-1.6, 0.9, -0.6, 1.8, -1.1, 0.4, -1.9, 1.3, -0.3];

const escapeHTML = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n: number) => n.toLocaleString('en-US');

// i picks the card's tilt, so neighbours lean different ways. The first row can be on the
// first screen, so it isn't lazy.
export function cardHTML(book: ShelfBook, i: number): string {
  const poster = book.cover ? `<img data-poster src="covers/${book.slug}.jpg" alt=""${i < 4 ? '' : ' loading="lazy"'} decoding="async">` : '';
  return `<li class="cover poster" style="--tilt:${TILTS[i % TILTS.length]}deg" data-slug="${book.slug}">
      <a href="books/${book.slug}/">
        ${poster}
        <span class="poster-marks" aria-hidden="true">${escapeHTML(book.sample)}</span>
        <span class="cover-label"><span class="cover-title">${escapeHTML(book.title)}</span><span class="cover-author">${escapeHTML(book.byline)}</span></span>
      </a>
      <p class="cover-meta">${fmt(book.marks)} marks left</p>
      ${fingerprintHTML(book.shares)}
    </li>`;
}
