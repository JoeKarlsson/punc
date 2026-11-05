// Everything site/build.mjs runs in Node, bundled together so the shelf cards
// and the map use exactly the browser's code.
export { analyzeBook } from './analyze';
export { fingerprintHTML, markShares, shelfPosition } from './patterns';
