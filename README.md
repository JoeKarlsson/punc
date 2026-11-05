# Punc

[![npm version](https://img.shields.io/npm/v/punc.svg)](https://www.npmjs.com/package/punc)
[![Build Status](https://github.com/JoeKarlsson/punc/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/JoeKarlsson/punc/actions)
[![Coverage Status](https://codecov.io/gh/JoeKarlsson/punc/branch/main/graph/badge.svg)](https://codecov.io/gh/JoeKarlsson/punc)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Ever wonder what your favorite books look like without words?

Punc is a modern TypeScript library for analyzing punctuation patterns in text
files. It extracts punctuation marks, counts their frequency, calculates words
per sentence, and can generate PDF visualizations showing only the punctuation.

![Punctuation Visualization](https://cloud.githubusercontent.com/assets/3915598/13369726/783be3d0-dc9c-11e5-846a-5f1ec6517966.png)

## Features

- 🔍 **Punctuation Analysis**: Extract and count punctuation marks from text files
- 📊 **Statistical Analysis**: Calculate words-per-sentence averages
- 📄 **PDF Generation**: Create visual PDFs showing only punctuation patterns
- 🎯 **TypeScript Support**: Full type safety and IntelliSense support
- 🚀 **Modern ES Modules**: Built with latest JavaScript standards
- ✅ **Comprehensive Testing**: 100% test coverage with Jest
- 🔧 **Developer Experience**: ESLint, Prettier, and automated CI/CD

## Website

The [Punc website](https://joekarlsson.github.io/punc/) shows a shelf of public
domain books as punctuation only, and opens any `.txt` file you drop in.
Everything runs in the browser.

```bash
npm run site:build   # build the static site into site-dist/
npm run site:serve   # build, then serve it at http://localhost:4173
npm run test:e2e     # Playwright browser tests against the built site
```

The site lives in `site/`: page fragments in `site/pages`, browser code in
`site/src`, gzipped shelf books in `site/books` and covers in `site/covers`
(listed in `site/catalog.json`). `node site/scripts/fetch-books.mjs` refreshes
the shelf from Project Gutenberg's most-read list, and
`node site/scripts/make-images.mjs` redraws the favicons and share image. It uses
the library's own `analyzeText` and `spiralLayout`, so it counts marks the same
way the CLI does. Pushes to `main` deploy it through
`.github/workflows/pages.yml`.

## Installation

```bash
npm install punc
```

## Quick Start

```typescript
import punc, { createPDF } from 'punc';

// Analyze punctuation in a text file
const result = await punc('path/to/your/file.txt');

console.log('Punctuation counts:', result.count);
console.log('Punctuation only:', result.body);
console.log('Words per sentence:', result.wordsPerSentence);
console.log('Spaced text:', result.spaced);

// Generate a PDF visualization
const pdfResult = await createPDF('path/to/your/file.txt');
console.log('PDF created:', pdfResult.pathToFile);
```

## API Reference

### `punc(filePath, options?)`

Analyzes punctuation in a text file and returns detailed statistics.

**Parameters:**

- `filePath` (string): Path to the text file to analyze
- `options` (PuncOptions | string, optional): Configuration options

**Returns:** `Promise<PuncResult>`

**Example:**

```typescript
const result = await punc('alice.txt', {
  encoding: 'utf8',
  mapping: {
    ';': 0, ':': 0, "'": 0, '"': 0, ',': 0,
    '!': 0, '?': 0, '.': 0, '(': 0, ')': 0, '-': 0
  }
});
```

### `createPDF(filePath, options?)`

Creates a PDF visualization showing only punctuation marks.

**Parameters:**

- `filePath` (string): Path to the text file
- `options` (PuncOptions | string, optional): Configuration options

**Returns:** `Promise<PDFResult>`

**Example:**

```typescript
const pdfResult = await createPDF('alice.txt');
console.log('PDF saved to:', pdfResult.pathToFile);
```

## Types

```typescript
interface PunctuationCount {
  ';': number;
  ':': number;
  "'": number;
  '"': number;
  ',': number;
  '!': number;
  '?': number;
  '.': number;
  '(': number;
  ')': number;
  '-': number;
}

interface PuncResult {
  body: string;              // Punctuation marks only
  count: PunctuationCount;   // Count of each punctuation mark
  wordsPerSentence: number;  // Average words per sentence
  spaced: string;           // Text with words replaced by spaces
}

interface PDFResult {
  success: boolean;
  pathToFile: string;
}
```

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
git clone https://github.com/JoeKarlsson/punc.git
cd punc
npm install
```

### Available Scripts

```bash
npm run build          # Build the project (TypeScript + ESBuild)
npm run dev           # Watch mode for development
npm test              # Run tests with Jest
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run lint          # Run ESLint code quality checks
npm run lint:fix      # Fix ESLint issues automatically
npm run format        # Format code with Prettier
npm run type-check    # Check TypeScript types without emitting files
npm run markdown-lint # Check and fix markdown formatting
npm run check         # Run all checks (type-check + lint + markdown-lint + test)
npm run clean         # Clean build artifacts
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Punctuation Marks

The library tracks these punctuation marks:

- `;` - Semicolon
- `:` - Colon
- `'` - Single quote
- `"` - Double quote
- `,` - Comma
- `!` - Exclamation mark
- `?` - Question mark
- `.` - Period
- `(` - Opening parenthesis
- `)` - Closing parenthesis
- `-` - Hyphen/dash

## Inspiration

This project was inspired by [this article](https://medium.com/@neuroecology/punctuation-in-novels-8f316d542ec4#.6e7lvvwp8)
on Medium, which was in turn inspired by [this person's work](http://www.c82.net/work/?id=347).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.
