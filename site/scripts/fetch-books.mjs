// Refreshes the shelf from Project Gutenberg: the most-downloaded English
// books of the last 30 days (counts from Gutenberg's RDF feed; robots.txt
// rules out its search pages) plus EXTRA_IDS, joined with Gutenberg's catalog
// CSV. Downloads each plain text (header and license footer stripped,
// gzipped) to site/books/<slug>.txt.gz and its cover to
// site/covers/<slug>.jpg, skipping files already on disk, deletes the files of
// books that left the shelf, then writes site/catalog.json. Usually run by
// site/scripts/update-shelf.mjs; on its own:
//   node site/scripts/fetch-books.mjs [--top 1000]
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
const DEFAULT_TOP = 1000;
// Books kept on the shelf even when they drop out of the top list
const EXTRA_IDS = ['1079', '12242', '67138'];
// Other editions of books already on the shelf under a different title
const REPEAT_EDITIONS = new Set(['2489', '15877', '55317', '2009', '41537', '1728', '50742', '5314', '27200', '25525']);
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
  // Books Wikidata has no date for: from the book's own title page or
  // copyright line, or the standard first-publication year. Translations
  // take the original's year, like the ones above.
  '49297': null, '47715': null,'78033': null, '78028': null, '78083': null,
  '78032': null, '78012': null, '78109': null, '78073': null, '78088': null, '78045': null,
  '78055': null, '78115': null, '78116': null, '78086': null, '78035': null, '15381': null,
  '1747': null, '78057': null, '38813': null, '3090': null, '24238': null, '71162': null,
  '78118': 1925, '69087': 1926, '61262': 1924, '59892': 1923, '63469': 1951, '78102': 1958,
  '78084': 1930, '78016': 1929, '204': 1911, '78009': 1923, '78017': 1812, '78065': 1938,
  '78122': 1869, '78105': 1930, '78119': 1930, '78025': 1927, '863': 1920, '78022': 1900,
  '78013': ['c. 140', 140], '78124': 1930, '78120': 1927, '78047': 1910, '78029': 1926,
  '78011': 1927, '78039': 1928, '78053': 1914, '78020': 1925, '78077': 1946, '78044': 1873,
  '78090': 1853, '78092': 1830, '78091': 1830, '78087': 1911, '78078': 1917, '78046': 1919,
  '78107': 1923, '78040': 1926, '78104': 1774, '78004': 1774, '78019': 1774, '78075': 1918,
  '78005': 1926, '78117': 1920, '78095': 1908, '78126': 1912, '78111': 1882, '78031': 1882,
  '78103': 1922, '78106': 1923, '78112': 1925, '78015': 1851, '78014': 1851, '78094': 1926,
  '78024': 1930, '78010': 1923, '78060': 1886, '78043': 1896, '78121': 1859, '78114': 1925,
  '78076': 1927, '78048': 1916, '78082': 1894, '78085': 1926, '78067': 1916, '78108': 1930,
  '78127': 1924, '36164': 1796, '78110': 1905, '78051': 1886, '78023': 1930, '78099': 1850,
  '78061': 1850, '78066': 1929, '78072': 1956, '78062': ['15th century', 1450], '78228': 1892,
  '1063': 1846, '57342': ['3rd century', 230], '564': 1870, '223': 1914, '67173': 1923,
  '27673': ['c. 429 BCE', -429], '70854': 1590, '66446': 1923, '67160': 1923, '851': 1682,
  '68957': 1923, '69608': 1923, '583': 1859, '57641': 1921, '730': 1838, '75201': 1929,
  '245': 1883, '70008': 1927, '72824': 1928, '60316': 1801, '76639': 1761, '72679': 1916,
  '60979': 1923, '113': 1911, '3600': 1580, '75288': 1929, '57763': 1904, '45109': ['c. 125', 125],
  '8438': ['c. 340 BCE', -340], '48155': 1905, '69566': ['c. 1550 BCE', -1550], '76178': 1959,
  '30254': 1873, '537': 1922, '1656': ['c. 399 BCE', -399], '72': 1920, '26184': 1944,
  '5827': 1912, '6130': ['8th century BCE', -750], '79': 1993, '2848': ['c. 94', 94],
  '1514': 1600, '521': 1719, '1251': 1485, '164': 1870, '2638': 1869, '4507': 1903,
  '1934': 1794, '28500': 1922, '1212': ['written 1790', 1790], '7256': 1905, '21765': ['8 CE', 8],
  '1600': ['c. 385 BCE', -385], '44526': 1887, '44525': 1887, '1523': 1623, '2038': 1909,
  '76668': 1929, '7142': ['c. 400 BCE', -400], '3800': 1677, '1510': 1598, '52319': 1887,
  '1608': 1848, '1257': 1844, '10615': 1689, '12122': 1902, '271': 1877, '1686': 1913,
  '5788': 1880, '34413': 1798, '1931': 1918, '2376': 1901, '1849': 1903, '59131': ['77', 77],
  '60688': ['77', 77], '16643': 1841, '2087': 1887, '14591': 1808, '26': 1667, '57628': 1890,
  '5000': ['c. 1500', 1500], '51775': ['9th century', 850], '1719': 1911, '22541': 1960,
  '71865': 1925, '11339': ['6th century BCE', -550], '19476': 1901, '46976': ['c. 140', 140],
  '2397': 1903, '24739': 1897, '10636': ['c. 1300', 1300], '18269': 1670, '779': 1604,
  '2707': ['c. 430 BCE', -430], '1974': ['c. 335 BCE', -335], '8581': 1880, '524': 1909,
  '29433': 1836, '2162': 1910, '70200': 1887, '52263': 1889, '228': ['19 BCE', -19], '5682': 1785,
  '58031': 1964, '815': 1835, '1597': 1835, '52190': 1908, '37499': ['1796–1812', 1804],
  '1001': ['c. 1320', 1320], '10661': ['c. 108', 108], '500': 1883, '26315': 1901, '6133': 1907,
  '1874': 1906, '58984': 1917, '43453': 1802, '1946': 1832, '63754': 1939, '2130': 1516,
  '289': 1908, '26659': 1897, '1524': 1603, '70377': 1908, '3330': ['5th century BCE', -475],
  '22163': 1902, '11030': 1861, '10676': 1891, '23784': 1901, '14328': ['c. 524', 524],
  '32474': ['written 1568', 1568], '202': 1855, '59931': 1922, '48438': 1918, '3420': 1792,
  '32155': ['c. 1528', 1528], '39260': 1877, '10623': 1920, '24869': ['c. 300 BCE', -300],
  '18459': 1499, '40284': 1962, '348': ['c. 700 BCE', -700], '46333': 1762,
  '77935': ['c. 200 BCE', -200], '785': ['c. 55 BCE', -55], '45502': 1890, '24793': 1916,
  '37423': 1910, '1533': 1623, '19771': 1837, '48320': 1892, '25851': 1872, '1041': 1609,
  '36462': 1485, '852': 1916, '110': 1891, '4705': 1739, '1268': 1874, '28203': 1864,
  '67804': 1895, '51356': 1872, '47476': 1908, '23639': ['c. 100', 100], '25789': 1883,
  '17450': 1899, '13415': 1899, '76576': 1904, '45315': 1790, '2413': 1857, '7452': 1946,
  '22515': 1855, '14522': 1887, '27997': 1900, '18875': 1915, '7700': ['411 BCE', -411],
  '22091': 1921, '17695': 1950, '21700': 1819, '15272': 1590, '216': ['c. 400 BCE', -400],
  '5921': 1605, '2850': ['c. 75', 75], '31472': 1910, '1672': ['c. 380 BCE', -380], '1658': ['c. 360 BCE', -360],
  '1636': ['c. 370 BCE', -370], '55201': ['c. 375 BCE', -375], '77092': 1928,
  '6762': ['c. 350 BCE', -350], '52958': ['c. 1395', 1395], '59827': 1922, '31635': 1908,
  '1404': 1788, '4367': 1885, '16433': 1921, '23500': 1907, '20439': 1959, '14818': 1907,
  '18151': 1955, '15384': 1916, '74878': 1925, '6435': 1911,
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
async function get(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...UA, ...options.headers } });
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
  // POST: a shelf's worth of ids is too long for a GET URL (414).
  const body = new URLSearchParams({ format: 'json', query });
  const json = JSON.parse((await get('https://query.wikidata.org/sparql', { method: 'POST', body })).toString('utf8'));
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
  const seenSlugs = new Set();
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
    const slug = SLUGS[id] ?? slugify(title);
    // Same title or slug ("Moby Dick", "Moby-Dick"): another edition, which would share the files.
    if (REPEAT_EDITIONS.has(id) || seenTitles.has(title) || seenSlugs.has(slug)) { console.warn(`skip ${id}: duplicate edition of ${title}`); continue; }
    seenTitles.add(title);
    seenSlugs.add(slug);
    if (rankOf.size < top) rankOf.set(id, rankOf.size + 1);
    const author = AUTHORS[id] ?? parseAuthor(authors);

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
