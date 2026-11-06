// Everything site/build.mjs runs in Node, bundled together so the shelf cards
// and the map use exactly the browser's code.
export { analyzeBook } from './analyze';
export { fingerprintHTML, mapSVG, markShares, shelfPosition } from './patterns';
export { SHELF_PAGE_SIZE } from './paging';
export { cardHTML } from './card';
export * as numbers from './numbers';
