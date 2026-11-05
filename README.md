# Punc

[![Website](https://img.shields.io/badge/website-joekarlsson.github.io%2Fpunc-ff4fd8)](https://joekarlsson.github.io/punc/)
[![Build Status](https://github.com/JoeKarlsson/punc/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/JoeKarlsson/punc/actions/workflows/ci.yml)
[![Deploy](https://github.com/JoeKarlsson/punc/actions/workflows/pages.yml/badge.svg)](https://github.com/JoeKarlsson/punc/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> What does a book look like without words?

Punc takes the words out of a book and leaves the punctuation where it was.
It's an art project by [Joe Karlsson](https://joekarlsson.com), and it comes in
two parts:

- **[The website](https://joekarlsson.github.io/punc/)**: a shelf of the books
  people read most on Project Gutenberg, each one drawn as punctuation only, and
  a reader that does the same for any `.txt` file you open. Nothing you open is
  uploaded.
- **The library and CLI**: a TypeScript package that counts the marks in a text
  file and draws the same pictures as SVG, PNG or PDF.

[![The Punc website: a ransom note asks what a book looks like without words, next to dithered pink posters for Frankenstein, Pride and Prejudice and Moby-Dick](https://joekarlsson.github.io/punc/og.png)](https://joekarlsson.github.io/punc/)

## The website

[joekarlsson.github.io/punc](https://joekarlsson.github.io/punc/)

- **The shelf**: 89 books, Project Gutenberg's most read this month plus a few
  favorites. The front page features the top four, and the full shelf can be
  searched by title or author, filtered by genre, and sorted by popularity, title,
  author, or how heavily punctuated each book is. Each cover is the book's
  Gutenberg cover dithered to hot pink and black, with the book's punctuation
  fingerprint under it.
- **A page for each book**, like
  [Frankenstein](https://joekarlsson.github.io/punc/books/frankenstein/), with
  four views:
  - **Score**: every mark in reading order.
  - **Spiral**: the whole book wound from the center out. Zoom and drag to
    explore it.
  - **Pages**: the book's pages with every letter erased and the marks left in
    place.
  - **Counts**: how each mark's share changes through the book, tenth by
    tenth, then every mark, most used first.

  Each page also shows the book's **punctuation fingerprint**: ten bars for
  the ten most common marks, on one scale shared by every book.
- **[The map](https://joekarlsson.github.io/punc/map.html)**: every book on the
  shelf placed by its punctuation alone, by pauses (`, ; : -`) per sentence
  ending and by the share of `?` and `!`.
- **[Read your own](https://joekarlsson.github.io/punc/read.html)**: open any
  plain text file and get the same views. It's read in your browser and never
  leaves your computer.
- **[About](https://joekarlsson.github.io/punc/about.html)**: the artist
  statement.

Every page has share links and its own preview card. Score and Spiral can be
downloaded as PNG.

### Working on the site

```bash
npm run site:build   # build the static site into site-dist/
npm run site:serve   # build, then serve it at http://localhost:4173
npm run test:e2e     # Playwright browser tests against the built site
```

| Path | What's in it |
| --- | --- |
| `site/pages/` | HTML for the shelf, reader and About pages |
| `site/src/` | Browser code: analysis, canvas drawing, spiral zoom, dithering, shelf search |
| `site/styles.css` | All styles |
| `site/build.mjs` | Builds `site-dist/`, including one page per book |
| `site/catalog.json`, `site/books/`, `site/covers/` | The shelf: book list, gzipped texts, covers |
| `site/scripts/fetch-books.mjs` | Refreshes the shelf from Project Gutenberg |
| `site/scripts/make-images.mjs` | Redraws the favicons and the share image |
| `e2e/` | Playwright tests |

The shelf is refreshed by hand, not on a schedule: each refresh commits its new
books to git for good, and the shelf is about 23 MB already. To refresh it, run
`node site/scripts/fetch-books.mjs`. It reads
Gutenberg's "Top 100 EBooks last 30 days" and its catalog, skips reference
books, non-English and repeat editions, and downloads anything new. Title and
author fixes go in the script's `TITLES` and `AUTHORS` lists, and first
publication years in `PUBLISHED`, not in `catalog.json`. The script stops if a
new book has no publication year. After changing the shelf or the headline, run
`npm run site:build && node site/scripts/make-images.mjs`.

The site counts marks with the library's own `analyzeText`, so its numbers match
the CLI. Both count curly quotes, long dashes and ellipses as their plain
versions.
Every push to `main` deploys it through `.github/workflows/pages.yml`.

## The library and CLI

The version on npm (`punc@1.3.3`) is an older release that only counts marks and
makes PDFs. Everything below, including the SVG and PNG pictures and the CLI, is
version 2.0, which isn't published to npm yet. To use it now, build it from
source:

```bash
git clone https://github.com/JoeKarlsson/punc.git
cd punc
npm install
npm run build
```

### CLI

```bash
node dist/cli.js book.txt                  # table of every mark and its count
node dist/cli.js book.txt --score --spiral # also write SVGs next to the file
node dist/cli.js book.txt --all --png      # all six pictures, as PNG
```

| Option | Writes |
| --- | --- |
| `--score` | Every mark in reading order, as a grid |
| `--spiral` | Every mark wound into a spiral |
| `--barcode` | A stripe for each mark across the length of the book |
| `--heatmap` | Punctuation density through the book, as a grid |
| `--waveform` | How often each mark appears through the book |
| `--radial` | How often each mark appears overall |
| `--all` | All six |
| `--png` | PNG instead of SVG |

### API

```typescript
import punc, { createPDF, createSpiralSVG, analyzeText } from 'punc';

// Counts for a file
const result = await punc('alice.txt');
result.count;            // { ',': 2427, '.': 999, ... }
result.body;             // the marks only, in order
result.spaced;           // the text with each word replaced by a space

// Pictures
await createPDF('alice.txt');                           // alice.txt-visual.pdf
await createSpiralSVG('alice.txt', { format: 'png' });  // alice.txt-spiral.png

// Strings instead of files
const { positions, totalChars, map } = analyzeText('"Wait," she said.');
```

| Function | Returns |
| --- | --- |
| `punc(file, options?)` | `{ count, body, spaced, wordsPerSentence }` |
| `createPDF(file, options?)` | A PDF of the text with only the marks showing |
| `createScoreSVG`, `createSpiralSVG`, `createBarcodeSVG`, `createHeatmapSVG`, `createWaveformSVG`, `createRadialSVG` `(file, options?)` | `{ success, pathToFile, svg }` |
| `getPositions(file, options?)` | Every mark and its character offset |
| `analyzeText(text, mapping?)` | The same, for a string |
| `windowedDensity(positions, totalChars, windows?)` | Mark counts for each slice of the text |
| `spiralLayout(count, width, height)` | Where each mark sits on the spiral |
| `countWords(text)`, `wordsPerSentence(text)` | Word and sentence counts |
| `defaultMapping()` | Every mark Punc tracks, each counted as 0 |

The SVG functions take `width`, `height`, `background`, `title`, `subtitle`,
`outputPath`, `format` (`'svg'` or `'png'`) and, for the density pictures,
`windows`. Every function also takes `encoding` and a custom `mapping`.

### Which marks count

About a hundred, listed in `src/mapping.ts`:

- Everyday punctuation: `. , ; : ? ! ' " ( ) -`
- Brackets and symbols: `[ ] { } < > / \ | * & @ # ~ ^` and backticks
- Typographic symbols: `§ ¶ ° © ® ™`, currency, arrows and math signs
- Spanish, Arabic and Chinese punctuation: `¿ ¡ ؟ ، ؛ ， 。 ； ： ？ ！`
- A few dozen decorative symbols: stars, hearts, checkmarks and box-drawing lines

## Development

Node.js 18 or newer.

```bash
npm run check        # type check, lint, markdown lint and unit tests
npm run test:e2e     # browser tests for the site
npm run build        # build the library and CLI into dist/
```

`npm run check` and the browser tests run in CI on every push.

## Credits

Punc started in 2016 after Adam J. Calhoun's essay
[Punctuation in novels](https://medium.com/@neuroecology/punctuation-in-novels-8f316d542ec4),
which was inspired by Nicholas Rougeux's
[Between the Words](http://www.c82.net/work/?id=347). The books and covers on
the website come from [Project Gutenberg](https://www.gutenberg.org/).

## License

MIT. See [LICENSE](LICENSE).
