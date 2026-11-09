# Punc

[![Website](https://img.shields.io/badge/website-joekarlsson.github.io%2Fpunc-ff4fd8)](https://joekarlsson.github.io/punc/)
[![Build Status](https://github.com/JoeKarlsson/punc/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/JoeKarlsson/punc/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Punc takes the words out of a book and leaves the punctuation where it was.
This repo has the [website](https://joekarlsson.github.io/punc/) and a
TypeScript library and CLI that count the marks in any text file and draw them
as SVG, PNG or PDF.

![Punc's site: the shelf of books shown as punctuation, then Alice's Adventures in Wonderland with 26,777 words removed and 8,076 marks left, and the book's punctuation laid out in reading order](.github/readme/2026-11-recording.gif)

## Artist statement

A lot of what steers you through a book isn't the words. Punc takes the words
away and leaves the instructions. It's an erasure, like the blackout poems I
make on paper, except a blackout poem keeps a few words and Punc keeps none.

[Read the full statement](https://www.joekarlsson.com/work/punc/).

## Quick start

Node.js 18 or newer.

```bash
git clone https://github.com/JoeKarlsson/punc.git
cd punc
npm install
npm run site:serve           # build the site and serve it at http://localhost:4173
```

Run the CLI on any plain text file:

```bash
npm run build
node dist/cli.js book.txt                  # table of every mark and its count
node dist/cli.js book.txt --all --png      # all six pictures, as PNG
```

Or use the library:

```typescript
import punc, { createSpiralSVG } from 'punc';

const { count } = await punc('alice.txt');              // { ',': 2427, '.': 999, ... }
await createSpiralSVG('alice.txt', { format: 'png' });  // alice.txt-spiral.png
```

The npm release (`punc@1.3.3`) is older and only counts marks and makes PDFs;
build from source for everything above. The marks it tracks are in
`src/mapping.ts`.

## Development

```bash
npm run check        # type check, lint, markdown lint and unit tests
npm run test:e2e     # Playwright tests against the built site
npm run shelf:update # refresh the shelf from Project Gutenberg, then commit and push
```

| Path | What's in it |
| --- | --- |
| `src/` | The library and CLI |
| `site/` | The website: pages, browser code, styles and the build script |
| `site/scripts/` | Shelf refresh and image scripts |
| `e2e/` | Playwright tests |

Every push to `main` runs CI and deploys the site.

## Credits

Punc started in 2016 after Adam J. Calhoun's essay
[Punctuation in novels](https://medium.com/@neuroecology/punctuation-in-novels-8f316d542ec4),
which was inspired by Nicholas Rougeux's
[Between the Words](http://www.c82.net/work/?id=347). Books and covers come
from [Project Gutenberg](https://www.gutenberg.org/).

## License

MIT. See [LICENSE](LICENSE).
