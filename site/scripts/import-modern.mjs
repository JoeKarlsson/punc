// Builds the modern shelf, site/modern.json, from HathiTrust Extracted
// Features files downloaded into a punc-hathi folder kept outside the repo
// (its scripts/README.md says how it was made). Only counts are read; there
// is no text. Each book keeps the marks the counts get right (site/src/modern.ts).
//   node site/scripts/import-modern.mjs [path to punc-hathi]
import { build } from 'esbuild';
import { execFile } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const HATHI = process.argv[2] ?? join(homedir(), 'Documents/dev/joe/punc-hathi');
// Shorter than this is a story or a novella, and its counts swing with every page.
const MIN_WORDS = 20000;

const reducerPath = join(tmpdir(), `punc-modern-${process.pid}.mjs`);
await build({ entryPoints: ['site/src/modern.ts'], bundle: true, platform: 'node', format: 'esm', outfile: reducerPath, logLevel: 'warning' });
const { modernCounts } = await import(pathToFileURL(reducerPath).href);
await rm(reducerPath);

const run = promisify(execFile);
const readEF = async file => JSON.parse((await run('bzip2', ['-dc', join(HATHI, file)], { maxBuffer: 256 * 1024 * 1024 })).stdout);

// Same slugs as site/scripts/fetch-books.mjs
const slugify = s => s.toLowerCase().replace(/æ/g, 'ae').replace(/œ/g, 'oe').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const catalog = JSON.parse(await readFile('site/catalog.json', 'utf8'));
const taken = new Set(catalog.map(b => b.slug));
const surname = name => slugify(name.split(' ').at(-1));
// Books from 1930 on that reached the public domain are on the Gutenberg shelf, with every mark.
const onGutenberg = new Set(catalog.map(b => `${b.slug} ${surname(b.author)}`));

const manifest = JSON.parse(await readFile(join(HATHI, 'manifest.json'), 'utf8'))
  // A low-confidence match is an edition from 15+ years after the book first came out.
  .filter(e => e.downloaded && e.match_confidence !== 'low')
  .sort((a, b) => a.popularity_rank - b.popularity_rank);

const reduced = new Array(manifest.length);
let next = 0;
const worker = async () => {
  while (next < manifest.length) {
    const i = next++;
    reduced[i] = modernCounts(await readEF(manifest[i].file));
  }
};
await Promise.all(Array.from({ length: 8 }, worker));

const books = [];
const usedVolumes = new Set();
for (const [i, entry] of manifest.entries()) {
  const { words, wordsPerSentence, counts, tenths } = reduced[i];
  if (words < MIN_WORDS) continue;
  // Wikidata lists some works twice; both match the same scanned volume.
  if (usedVolumes.has(entry.htid)) continue;
  usedVolumes.add(entry.htid);
  if (onGutenberg.has(`${slugify(entry.title)} ${surname(entry.author)}`)) { console.log(`skip ${entry.title}: on the Gutenberg shelf`); continue; }
  // A title another book already has gets its year: Gutenberg's Ulysses keeps "ulysses".
  let slug = slugify(entry.title);
  if (taken.has(slug)) slug = `${slug}-${entry.first_published}`;
  if (taken.has(slug)) throw new Error(`Two books would share ${slug}: ${entry.title} by ${entry.author}`);
  taken.add(slug);
  books.push({
    slug,
    title: entry.title,
    author: entry.author,
    year: entry.first_published,
    edition: entry.edition_year,
    htid: entry.htid,
    rank: entry.popularity_rank,
    words,
    wps: Number(wordsPerSentence.toFixed(2)),
    counts,
    tenths,
  });
}
await writeFile('site/modern.json', JSON.stringify(books) + '\n');
console.log(`Wrote ${books.length} modern books to site/modern.json`);
