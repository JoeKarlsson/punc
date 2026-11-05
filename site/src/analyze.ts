// Book analysis for the site, used in the browser (reader.ts) and at build
// time (site/build.mjs, for the shelf covers). Counting is the library's own
// analyzeText, so the site and the CLI agree.
import { analyzeText, wordsPerSentence } from '../../src/text';
import { defaultMapping } from '../../src/mapping';
import type { PunctuationCount } from '../../src/types';

export interface BookAnalysis {
  marks: string[];
  counts: Array<[mark: string, count: number]>;
  wordsPerSentence: number;
  text: string;
}

// Modern editions set quotes and dashes typographically; the mapping counts
// the ASCII marks, so fold them first or most dialogue would disappear.
export function foldTypography(text: string): string {
  return text
    .replace(/[“”„«»]/g, '"')
    .replace(/[‘’‚]/g, "'")
    .replace(/[–—―]/g, '-')
    .replace(/…/g, '...');
}

export function analyzeBook(rawText: string): BookAnalysis {
  const text = foldTypography(rawText);
  const { positions, map } = analyzeText(text);
  const counts = (Object.entries(map) as Array<[keyof PunctuationCount, number]>)
    .filter(([, n]) => n > 0)
    .sort(([, a], [, b]) => b - a);
  return {
    marks: positions.map(p => p.char),
    counts,
    wordsPerSentence: wordsPerSentence(text),
    text,
  };
}

// Everything but the counted marks becomes a space, so a page keeps its shape
// and only the marks show. Paragraphs are reflowed (hard line wraps joined) and split into
// pages of about `pageChars` characters, broken between words.
export function erasedPages(text: string, pageChars = 1400): string[] {
  const counted = defaultMapping();
  const erase = (word: string) => Array.from(word, char => (char in counted ? char : ' ')).join('');
  const pages: string[] = [];
  let page = '';
  let wordsOnPage = 0;
  for (const paragraph of text.split(/\n\s*\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    for (const word of words) {
      if (wordsOnPage > 0 && page.length + word.length + 1 > pageChars) {
        pages.push(page.trimEnd());
        page = '';
        wordsOnPage = 0;
      }
      page += (page === '' || page.endsWith('\n') ? '' : ' ') + erase(word);
      wordsOnPage++;
    }
    page += '\n\n';
  }
  if (wordsOnPage > 0) pages.push(page.trimEnd());
  return pages;
}
