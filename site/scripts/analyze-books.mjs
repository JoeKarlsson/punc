// Analyzes each shelf book once, from its local text in texts/ (written by
// site/scripts/fetch-books.mjs, never committed), into site/marks/<slug>.json.gz:
// its marks, counts and measures, which is all the build and the book pages
// use. Also cuts the front page scanner's openings into
// site/scanner-openings.json. Usually run by site/scripts/update-shelf.mjs;
// on its own:
//   node site/scripts/analyze-books.mjs
import { build } from 'esbuild';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';

const analyzerPath = join(tmpdir(), `punc-shelf-marks-${process.pid}.mjs`);
await build({ entryPoints: ['site/src/shelf-marks.ts'], bundle: true, platform: 'node', format: 'esm', outfile: analyzerPath, logLevel: 'warning' });
const { shelfMarks } = await import(pathToFileURL(analyzerPath).href);
await rm(analyzerPath);

const catalog = JSON.parse(await readFile('site/catalog.json', 'utf8'));
const readText = async slug => {
  const path = `texts/${slug}.txt.gz`;
  if (!existsSync(path)) throw new Error(`${path} is missing; run site/scripts/fetch-books.mjs`);
  return gunzipSync(await readFile(path)).toString('utf8');
};

await mkdir('site/marks', { recursive: true });
for (const [i, { slug }] of catalog.entries()) {
  await writeFile(`site/marks/${slug}.json.gz`, gzipSync(JSON.stringify(shelfMarks(await readText(slug))), { level: 9 }));
  if ((i + 1) % 250 === 0) console.log(`analyzed ${i + 1} of ${catalog.length}`);
}
const slugs = new Set(catalog.map(b => b.slug));
for (const file of await readdir('site/marks')) {
  if (!slugs.has(file.replace(/\.json\.gz$/, ''))) await rm(join('site/marks', file));
}

// The front page scanner (site/src/scanner.ts) reads these books' first pages,
// each from the line given to about 1,200 characters, ending on a sentence.
// They're public domain, and the only book text the site carries.
const SCANNER_OPENINGS = [
  ['pride-and-prejudice', 'It is a truth universally'],
  ['moby-dick', 'Call me Ishmael'],
  ['ulysses', 'Stately, plump Buck Mulligan'],
  ['tristram-shandy', 'I WISH either my father'],
];
const openings = [];
for (const [slug, firstWords] of SCANNER_OPENINGS) {
  if (!slugs.has(slug)) throw new Error(`The scanner's opening book ${slug} isn't on the shelf`);
  const text = await readText(slug);
  const start = text.indexOf(firstWords);
  if (start < 0) throw new Error(`The scanner's opening for ${slug} ("${firstWords}") isn't in its text`);
  const firstPage = text.slice(start, start + 1200);
  const end = Math.max(...[...firstPage.matchAll(/(?<!\b(?:Mr|Mrs|Dr|St))[.?!][”"’]?(?=\s)/g)].map(m => m.index + m[0].length));
  if (end < 0) throw new Error(`The scanner's opening for ${slug} has no sentence end in its first 1,200 characters`);
  const passage = firstPage.slice(0, end).split(/\n\s*\n/)
    // Skip stray lines with no words, like the lone "]" an illustration left in Pride and Prejudice
    .filter(para => /\p{L}/u.test(para))
    .map(para => para.replace(/\s+/g, ' ').trim())
    .join('\n');
  openings.push({ slug, text: passage });
}
await writeFile('site/scanner-openings.json', JSON.stringify(openings, null, 2) + '\n');
console.log(`Analyzed ${catalog.length} books into site/marks/`);
