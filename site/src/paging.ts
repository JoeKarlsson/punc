// Pages and search for the shelf, kept apart from shelf.ts so they can be
// tested without a page.

// A page of the shelf on a computer, and the page built into index.html.
// Fills 2, 3, 4, 6, 8, 9 or 12 columns evenly.
export const SHELF_PAGE_SIZE = 72;
// A page on a phone, where the shelf is one or two covers wide.
export const SHELF_PAGE_SIZE_PHONE = 24;

// Page numbers to offer: the first, the last, and the current one with
// `around` neighbours on each side, with null where a run is skipped.
// pageLinks(7, 21) gives [1, null, 6, 7, 8, null, 21].
export function pageLinks(current: number, total: number, around = 1): Array<number | null> {
  const near = Array.from({ length: around * 2 + 1 }, (_, i) => current - around + i);
  const wanted = [...new Set([1, ...near, total])].filter(n => n >= 1 && n <= total).sort((a, b) => a - b);
  const links: Array<number | null> = [];
  wanted.forEach((n, i) => {
    const previous = wanted[i - 1];
    if (previous !== undefined && n - previous === 2) links.push(previous + 1);
    else if (previous !== undefined && n - previous > 2) links.push(null);
    links.push(n);
  });
  return links;
}

// Lower case, without accents or punctuation, so "Bronte" finds "Brontë".
export const normalizeForSearch = (s: string): string =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '');
