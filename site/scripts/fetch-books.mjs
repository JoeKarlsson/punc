// Refreshes the shelf from Project Gutenberg: the "Top 100 EBooks last 30
// days" list plus EXTRA_IDS, joined with Gutenberg's catalog CSV. Downloads
// each plain text (header and license footer stripped, gzipped) to
// site/books/<slug>.txt.gz and its cover to site/covers/<slug>.jpg, skipping
// files already on disk, then writes site/catalog.json. Run by hand:
//   node site/scripts/fetch-books.mjs
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { gunzipSync, gzipSync } from 'node:zlib';

const UA = { 'User-Agent': 'punc-site-builder (https://github.com/JoeKarlsson/punc)' };
const PAUSE_MS = 1500;
const MAX_TEXT_BYTES = 3.5 * 1024 * 1024;
// Books kept on the shelf even when they drop out of the top 100
const EXTRA_IDS = ['1079', '12242', '67138'];
const SKIP_SHELVES = /Encyclopedias|Dictionaries|Reference|Language & Communication/;
// Shorter titles and plain names where the catalog's don't read well
const TITLES = {
  '11': "Alice's Adventures in Wonderland",
  '2701': 'Moby-Dick',
  '1079': 'Tristram Shandy',
  '12242': 'Poems',
  '1727': 'The Odyssey',
  '1080': 'A Modest Proposal',
  '46': 'A Christmas Carol',
  '23': 'Narrative of the Life of Frederick Douglass',
  '1228': 'On the Origin of Species',
  '3300': 'The Wealth of Nations',
  '829': "Gulliver's Travels",
  '27827': 'The Kama Sutra',
  '1998': 'Thus Spake Zarathustra',
  '74': 'The Adventures of Tom Sawyer',
  '2148': 'The Works of Edgar Allan Poe, Volume 2',
  '5197': 'My Life, Volume 1',
  '16328': 'Beowulf',
  '37106': 'Little Women',
  '6761': 'Ferdinand Count Fathom',
  '6593': 'Tom Jones',
  '33283': 'Calculus Made Easy',
};
const AUTHORS = {
  '2680': 'Marcus Aurelius',
  '3296': 'Saint Augustine',
  '16328': 'Anonymous',
  '132': 'Sun Tzu',
  '84': 'Mary Shelley',
  '45188': 'Sun Yat-sen',
};
// Slugs already shared, kept stable
const SLUGS = {
  '11': 'alice',
  '2701': 'moby-dick',
  '12242': 'dickinson-poems',
  '1079': 'tristram-shandy',
};
const GENRES = [
  ['Novels', /Category: Novels/],
  ['Short stories', /Short Stories/],
  ['Poetry', /Poetry/],
  ['Plays', /Plays/],
  ["Children's", /Children/],
  ['Science fiction and fantasy', /Science.Fiction|Fantasy/],
  ['Horror and gothic', /Horror|Gothic/],
  ['Mystery and crime', /Crime|Detective|Mystery/],
  ['Adventure', /Adventure/],
  ['Romance', /Romance/],
  ['Philosophy and ideas', /Philosophy|Politics|Essays|Religion|Christianity/],
  ['History and lives', /Biograph|History|Slavery/],
];

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

// RFC 4180 CSV: quoted fields may hold commas, quotes ("") and newlines.
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// "Fitzgerald, F. Scott (Francis Scott), 1896-1940" -> name and life years
export function parseAuthor(authors) {
  const first = (authors.split(';')[0] ?? '').replace(/\s*\[[^\]]*\]/g, '').replace(/\s*\([^)]*\)/g, '').trim();
  const parts = first.split(', ').map(s => s.trim()).filter(Boolean);
  const dates = parts.find(p => /\d/.test(p));
  const names = parts.filter(p => !/\d/.test(p) && !/^(graf|Saint|Emperor of Rome|active .*)$/.test(p));
  const name = names.length >= 2 ? `${names[1]} ${names[0]}` : (names[0] ?? 'Anonymous');
  const years = dates?.match(/(\d+)\??(?: BCE)?-(\d+)?/);
  const bce = /BCE/.test(dates ?? '');
  const born = years ? Number(years[1]) * (bce ? -1 : 1) : null;
  return { name, born, lifespan: dates ? dates.replace(/-/g, '–') : '' };
}

export function stripGutenberg(text) {
  const t = text.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const start = t.match(/^\*\*\* ?START OF.*$/m);
  const end = t.match(/^\*\*\* ?END OF.*$/m);
  if (!start || !end) throw new Error('No Gutenberg START/END markers');
  return t.slice(start.index + start[0].length, end.index).replace(/\[Illustration[^\]]*\]\n*/g, '').trim() + '\n';
}

const slugify = s => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function main() {
  await mkdir('site/books', { recursive: true });
  await mkdir('site/covers', { recursive: true });
  const top = (await get('https://www.gutenberg.org/browse/scores/top')).toString('utf8');
  const section = top.slice(top.indexOf('id="books-last30"'), top.indexOf('id="authors-last30"'));
  const ranked = [...section.matchAll(/href="\/ebooks\/(\d+)"/g)].map(m => m[1]);
  if (ranked.length < 50) throw new Error(`Top list looks wrong: ${ranked.length} books`);

  const csv = parseCSV(gunzipSync(await get('https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv.gz')).toString('utf8'));
  const header = csv[0];
  const col = name => header.indexOf(name);
  const byId = new Map(csv.slice(1).map(r => [r[col('Text#')], r]));

  const catalog = [];
  const seenTitles = new Set();
  for (const id of [...ranked, ...EXTRA_IDS.filter(id => !ranked.includes(id))]) {
    const row = byId.get(id);
    if (!row) { console.warn(`skip ${id}: not in catalog`); continue; }
    const [type, language, rawTitle, authors, shelves] = ['Type', 'Language', 'Title', 'Authors', 'Bookshelves'].map(c => row[col(c)] ?? '');
    if (type !== 'Text' || language !== 'en' || SKIP_SHELVES.test(shelves)) { console.warn(`skip ${id}: ${type} ${language} ${rawTitle.slice(0, 30)}`); continue; }
    const title = TITLES[id] ?? rawTitle.split(/[;:\n]| — /)[0].replace(/,?\s*Complete$/, '').trim();
    if (seenTitles.has(title)) { console.warn(`skip ${id}: duplicate edition of ${title}`); continue; }
    const author = parseAuthor(authors);
    if (AUTHORS[id]) author.name = AUTHORS[id];
    const slug = SLUGS[id] ?? slugify(title);

    const textPath = `site/books/${slug}.txt.gz`;
    if (!existsSync(textPath)) {
      let raw;
      try {
        raw = await get(`https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`);
      } catch (e) {
        // Some books (math, music) have no plain-text edition.
        console.warn(`skip ${id}: ${e.message}`);
        continue;
      } finally {
        await sleep(PAUSE_MS);
      }
      if (raw.length > MAX_TEXT_BYTES) { console.warn(`skip ${id}: ${(raw.length / 1e6).toFixed(1)} MB`); continue; }
      await writeFile(textPath, gzipSync(stripGutenberg(raw.toString('utf8')), { level: 9 }));
    }
    const coverPath = `site/covers/${slug}.jpg`;
    let cover = existsSync(coverPath);
    if (!cover) {
      try {
        await writeFile(coverPath, await get(`https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`));
        cover = true;
      } catch (e) {
        console.warn(`no cover for ${id}: ${e.message}`);
      }
      await sleep(PAUSE_MS);
    }
    seenTitles.add(title);
    catalog.push({
      id: Number(id),
      slug,
      title,
      author: author.name,
      lifespan: author.lifespan,
      born: author.born,
      genres: GENRES.filter(([, re]) => re.test(shelves)).map(([g]) => g),
      rank: ranked.includes(id) ? ranked.indexOf(id) + 1 : null,
      cover,
    });
    console.log(`${catalog.length}. ${title} (${author.name})`);
  }
  await writeFile('site/catalog.json', JSON.stringify(catalog, null, 2) + '\n');
  console.log(`Wrote ${catalog.length} books to site/catalog.json`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
