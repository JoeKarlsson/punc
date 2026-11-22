// Everything site/build.mjs runs in Node, bundled together so the shelf cards
// and the map use exactly the browser's code.
export { shelfMarks } from './shelf-marks';
export { countsHTML, fingerprintHTML, TRACKED_MARKS, markShares, marksThroughBook, shelfPosition, throughBookHTML } from './patterns';
export { bookPageTitle, booksIndexHTML } from './seo';
export { SHELF_PAGE_SIZE } from './paging';
export { cardHTML } from './card';
export * as numbers from './numbers';
