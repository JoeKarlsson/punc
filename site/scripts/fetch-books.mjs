// Refreshes the shelf from Project Gutenberg: the most-downloaded English
// books of the last 30 days (counts from Gutenberg's RDF feed; robots.txt
// rules out its search pages) plus EXTRA_IDS, joined with Gutenberg's catalog
// CSV. Downloads each plain text (header and license footer stripped,
// gzipped) to site/books/<slug>.txt.gz and its cover to
// site/covers/<slug>.jpg, skipping files already on disk, deletes the files of
// books that left the shelf, then writes site/catalog.json. Usually run by
// site/scripts/update-shelf.mjs; on its own:
//   node site/scripts/fetch-books.mjs [--top 500]
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { gunzipSync, gzipSync } from 'node:zlib';

const UA = { 'User-Agent': 'punc-site-builder (https://github.com/JoeKarlsson/punc)' };
const PAUSE_MS = 1500;
const MAX_TEXT_BYTES = 3.5 * 1024 * 1024;
const DEFAULT_TOP = 500;
// Books kept on the shelf even when they drop out of the top list
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
  '49008': 'The Works of William Shakespeare, Volume 8',
  '47715': 'The Works of William Shakespeare, Volume 7',
  '14591': 'Faust, Part 1',
  '1212': 'Love and Freindship',
  '1608': 'Camille',
  '17695': 'A History of China',
  '19218': 'The History of England, Volume 3',
  '31100': 'The Complete Works of Jane Austen',
  '57333': 'Short Stories by Chekhov',
  '38813': 'The Works of Robert G. Ingersoll',
};
const AUTHORS = {
  '2680': 'Marcus Aurelius',
  '3296': 'Saint Augustine',
  '16328': 'Anonymous',
  '132': 'Sun Tzu',
  '84': 'Mary Shelley',
  '45188': 'Sun Yat-sen',
};
// The year each book first appeared, as it's usually cited (Gutenberg's own
// "Issued" date is when the ebook was added). Ancient and medieval works get
// an approximate label and a sortable year; collected-works volumes have none.
// Checked by hand against Wikidata. Books not listed here take Wikidata's
// date for the work (see wikidataYears), or show no year; add a book here to
// fix a wrong or missing one.
export const PUBLISHED = {
  '1342': 1813, '84': 1818, '2701': 1851, '11': 1865, '1661': 1892, '345': 1897,
  '98': 1859, '1513': 1597, '145': 1871, '174': 1890, '43': 1886, '1260': 1847,
  '64317': 1925, '2554': 1866, '1232': 1532, '41': 1820, '5200': 1915, '205': 1854,
  '1400': 1861, '2680': ['c. 180', 180], '1952': 1892, '1184': 1844, '2641': 1908,
  '37106': 1868, '74': 1876, '2600': 1869, '1080': 1729, '67979': 1926,
  '1727': ['8th century BCE', -750], '844': 1895, '768': 1847, '3207': 1651,
  '46': 1843, '16389': 1922, '394': 1853, '55': 1900, '25344': 1850, '76': 1884,
  '120': 1883, '6593': 1749, '2160': 1771, '45': 1908, '49008': null, '1259': 1845,
  '4300': 1922, '6761': 1753, '35': 1895, '2591': 1812, '2542': 1879, '4085': 1748,
  '16328': ['c. 1000', 1000], '5197': 1911, '161': 1811, '23': 1845,
  '3296': ['c. 400', 400], '1497': ['c. 375 BCE', -375], '8492': 1895, '158': 1815,
  '1998': 1883, '7370': 1689, '28054': 1880, '219': 1899, '4363': 1886, '408': 1903,
  '34901': 1859, '132': ['5th century BCE', -500], '36': 1898, '3300': 1776,
  '1228': 1859, '16': 1911, '20203': 1791, '2852': 1902, '135': 1862, '45188': 1922,
  '244': 1887, '67098': 1926, '829': 1726, '36034': 1918, '2148': null, '996': 1605,
  '27827': ['3rd century', 250], '1399': 1878, '10007': 1872, '8800': ['c. 1320', 1320],
  '2814': 1914, '12': 1871, '1079': 1759, '12242': 1890, '67138': 1926,
};

// { published: '1818', publishedSort: 1818 }, or nulls when there's no single
// or known year. PUBLISHED wins over the Wikidata year.
export function publicationOf(id, wikidataYear = null) {
  const value = id in PUBLISHED ? PUBLISHED[id] : wikidataYear;
  if (value === null) return { published: null, publishedSort: null };
  if (Array.isArray(value)) return { published: value[0], publishedSort: value[1] };
  return { published: String(value), publishedSort: value };
}

// Slugs already shared, kept stable
const SLUGS = {
  '11': 'alice',
  '2701': 'moby-dick',
  '12242': 'dickinson-poems',
  '1079': 'tristram-shandy',
  '49008': 'the-works-of-william-shakespeare-cambridge-edition-vol-8-of-9',
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

// "Fitzgerald, F. Scott (Francis Scott), 1896-1940" -> "F. Scott Fitzgerald"
export function parseAuthor(authors) {
  const first = (authors.split(';')[0] ?? '').replace(/\s*\[[^\]]*\]/g, '').replace(/\s*\([^)]*\)/g, '').trim();
  const names = first
    .split(', ')
    .map(part => part.trim())
    .filter(part => part && !/\d/.test(part) && !/^(graf|Saint|Emperor of Rome|active .*)$/.test(part));
  return names.length >= 2 ? `${names[1]} ${names[0]}` : (names[0] ?? 'Anonymous');
}

export function stripGutenberg(text) {
  const t = text.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const start = t.match(/^\*\*\* ?START OF.*$/m);
  const end = t.match(/^\*\*\* ?END OF.*$/m);
  if (!start || !end) throw new Error('No Gutenberg START/END markers');
  return t.slice(start.index + start[0].length, end.index).replace(/\[Illustration[^\]]*\]\n*/g, '').trim() + '\n';
}

// Gutenberg's newer entries are in sentence case ("A farewell to arms").
const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'into', 'nor', 'of', 'on', 'or', 'the', 'to', 'with']);
export function titleCase(title) {
  return title
    .split(' ')
    .map((word, i) => (i > 0 && SMALL_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
}

// Catalog title -> shelf title: first part only, no editions in brackets.
export function cleanTitle(raw) {
  return titleCase(raw.split(/[;:\n]| — /)[0].replace(/\s*\[[^\]]*\]/g, '').replace(/,?\s*Complete$/, '').trim());
}

// Gutenberg ids by 30-day downloads, most first, from the RDF feed: one
// <pgterms:ebook rdf:about="ebooks/N"> per book with a <pgterms:downloads>.
async function rankedByDownloads() {
  const archive = join(tmpdir(), 'punc-rdf-files.tar.bz2');
  await writeFile(archive, await get('https://www.gutenberg.org/cache/epub/feeds/rdf-files.tar.bz2'));
  const tar = spawn('tar', ['-xjOf', archive]);
  const exited = new Promise((resolve, reject) => tar.on('close', code => (code === 0 ? resolve() : reject(new Error(`tar exited with ${code}`)))));
  const downloads = new Map();
  let id = null;
  for await (const line of createInterface({ input: tar.stdout })) {
    const ebook = line.match(/<pgterms:ebook rdf:about="ebooks\/(\d+)"/);
    if (ebook) id = ebook[1];
    const count = line.match(/<pgterms:downloads[^>]*>(\d+)</);
    if (count && id) downloads.set(id, Number(count[1]));
  }
  await exited;
  await rm(archive);
  return [...downloads].sort((a, b) => b[1] - a[1]).map(([bookId]) => bookId);
}

// Year each work first appeared, by Gutenberg id. Only the work's date, via
// "edition of" or a work item itself: an edition's own date is often the
// ebook's.
async function wikidataYears(ids) {
  const query = `SELECT ?g (MIN(YEAR(?viaWork)) AS ?a) (MIN(YEAR(?own)) AS ?b) WHERE {
    VALUES ?g { ${ids.map(id => `"${id}"`).join(' ')} }
    ?item wdt:P2034 ?g .
    OPTIONAL { ?item wdt:P629 ?work . ?work wdt:P577 ?viaWork }
    OPTIONAL { FILTER NOT EXISTS { ?item wdt:P629 ?w } ?item wdt:P31/wdt:P279* wd:Q7725634 ; wdt:P577 ?own }
  } GROUP BY ?g`;
  const json = JSON.parse((await get(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`)).toString('utf8'));
  const years = new Map();
  for (const row of json.results.bindings) {
    const year = row.a ?? row.b;
    if (year) years.set(row.g.value, Number(year.value));
  }
  return years;
}

// Removes files in dir whose slug isn't on the shelf any more.
async function pruneOrphans(dir, extension, slugs) {
  for (const file of await readdir(dir)) {
    if (file.endsWith(extension) && !slugs.has(file.slice(0, -extension.length))) {
      await rm(join(dir, file));
      console.log(`removed ${join(dir, file)}`);
    }
  }
}

const slugify = s => s.toLowerCase().replace(/æ/g, 'ae').replace(/œ/g, 'oe').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function main() {
  const topArg = process.argv.indexOf('--top');
  const top = topArg === -1 ? DEFAULT_TOP : Number(process.argv[topArg + 1]);
  if (!Number.isInteger(top) || top < 1) throw new Error(`--top needs a whole number, got ${process.argv[topArg + 1]}`);
  await mkdir('site/books', { recursive: true });
  await mkdir('site/covers', { recursive: true });
  const ranked = await rankedByDownloads();
  if (ranked.length < 10000) throw new Error(`Download counts look wrong: ${ranked.length} books`);

  const csv = parseCSV(gunzipSync(await get('https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv.gz')).toString('utf8'));
  const header = csv[0];
  const col = name => header.indexOf(name);
  const byId = new Map(csv.slice(1).map(r => [r[col('Text#')], r]));

  const catalog = [];
  const seenTitles = new Set();
  // Rank among the books that qualify for the shelf, so the top N is N books.
  const rankOf = new Map();
  function* candidates() {
    for (const id of ranked) {
      if (rankOf.size >= top) break;
      yield id;
    }
    yield* EXTRA_IDS.filter(id => !rankOf.has(id));
  }
  for (const id of candidates()) {
    const row = byId.get(id);
    if (!row) { console.warn(`skip ${id}: not in catalog`); continue; }
    const [type, language, rawTitle, authors, shelves] = ['Type', 'Language', 'Title', 'Authors', 'Bookshelves'].map(c => row[col(c)] ?? '');
    if (type !== 'Text' || language !== 'en' || SKIP_SHELVES.test(shelves)) { console.warn(`skip ${id}: ${type} ${language} ${rawTitle.slice(0, 30)}`); continue; }
    const title = TITLES[id] ?? cleanTitle(rawTitle);
    if (seenTitles.has(title)) { console.warn(`skip ${id}: duplicate edition of ${title}`); continue; }
    seenTitles.add(title);
    if (rankOf.size < top) rankOf.set(id, rankOf.size + 1);
    const author = AUTHORS[id] ?? parseAuthor(authors);
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
    catalog.push({
      id: Number(id),
      slug,
      title,
      author,
      genres: GENRES.filter(([, re]) => re.test(shelves)).map(([g]) => g),
      published: null,
      publishedSort: null,
      rank: rankOf.get(id) ?? null,
      cover,
    });
    console.log(`${catalog.length}. ${title} (${author})`);
  }
  const years = await wikidataYears(catalog.filter(b => !(String(b.id) in PUBLISHED)).map(b => String(b.id)));
  for (const book of catalog) Object.assign(book, publicationOf(String(book.id), years.get(String(book.id)) ?? null));
  const undated = catalog.filter(b => b.published === null && !(String(b.id) in PUBLISHED));
  if (undated.length) console.warn(`${undated.length} books have no year (add them to PUBLISHED): ${undated.map(b => `${b.id} ${b.title}`).join('; ')}`);

  const slugs = new Set(catalog.map(b => b.slug));
  await pruneOrphans('site/books', '.txt.gz', slugs);
  await pruneOrphans('site/covers', '.jpg', slugs);
  await pruneOrphans('site/share', '.png', slugs);
  await writeFile('site/catalog.json', JSON.stringify(catalog, null, 2) + '\n');
  console.log(`Wrote ${catalog.length} books to site/catalog.json`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
