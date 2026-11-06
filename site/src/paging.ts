// Pages for the shelf, kept apart from shelf.ts so it can be tested without a page.

// Fills 2, 3, 4 or 6 columns evenly.
export const SHELF_PAGE_SIZE = 24;

// Page numbers to offer: the first, the last, and the current one with its
// neighbours, with null where a run is skipped. pageLinks(7, 21) gives
// [1, null, 6, 7, 8, null, 21].
export function pageLinks(current: number, total: number): Array<number | null> {
  const wanted = [...new Set([1, current - 1, current, current + 1, total])]
    .filter(n => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  const links: Array<number | null> = [];
  wanted.forEach((n, i) => {
    const previous = wanted[i - 1];
    if (previous !== undefined && n - previous === 2) links.push(previous + 1);
    else if (previous !== undefined && n - previous > 2) links.push(null);
    links.push(n);
  });
  return links;
}
