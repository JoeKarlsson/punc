// Page titles and the A to Z list of books, for search engines and readers
// who want every book on one page. Run by site/build.mjs.
import { escapeHTML } from './patterns';

// Search results show about 60 characters of a title; past that the site name goes
// first, then "The". A book title too long even then stays whole: cutting it would
// cut the words people search for ("...the Wealth of Nations").
const TITLE_LIMIT = 60;

export function bookPageTitle(title: string): string {
  const full = `The punctuation of ${title} · Punc`;
  if (full.length <= TITLE_LIMIT) return full;
  const plain = `The punctuation of ${title}`;
  return plain.length <= TITLE_LIMIT ? plain : `Punctuation of ${title}`;
}

// Filed the way a library files them: "The Time Machine" under T for Time.
export function titleSortKey(title: string): string {
  return title
    .replace(/^(the|a|an)\s+/i, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    // NFD leaves the ligature whole: "Æsthetic" files under A
    .replace(/Æ/g, 'Ae')
    .replace(/æ/g, 'ae')
    .replace(/^[^\p{L}\p{N}]+/u, '');
}

export interface IndexBook {
  slug: string;
  title: string;
  author: string;
}

// Every book under its letter, each title linking to its page. Links are from the site root, as build.mjs roots every page's links.
// base: where the book pages are from the page the index is on.
export function booksIndexHTML(books: IndexBook[], base = 'books/'): string {
  const sorted = [...books].sort((a, b) => titleSortKey(a.title).localeCompare(titleSortKey(b.title), 'en'));
  const groups = new Map<string, IndexBook[]>();
  for (const book of sorted) {
    const first = titleSortKey(book.title).charAt(0).toUpperCase();
    const letter = /[A-Z]/.test(first) ? first : '#';
    groups.set(letter, [...(groups.get(letter) ?? []), book]);
  }
  const letters = [...groups.keys()];
  const id = (letter: string) => (letter === '#' ? 'other' : letter.toLowerCase());
  const jump = `<nav class="az-jump" aria-label="Letters">${letters.map(l => `<a href="#${id(l)}">${l}</a>`).join('')}</nav>`;
  const sections = letters
    .map(
      letter =>
        `<section class="az-letter" aria-labelledby="${id(letter)}"><h2 id="${id(letter)}" class="az-heading">${letter}</h2><ul class="az-list">${groups
          .get(letter)!
          .map(b => `<li><a href="${base}${b.slug}/">${escapeHTML(b.title)}</a>, ${escapeHTML(b.author)}</li>`)
          .join('')}</ul></section>`
    )
    .join('\n');
  return `${jump}\n${sections}`;
}
