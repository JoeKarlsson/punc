// Modern books (first published 1930 on) come from HathiTrust's Extracted
// Features: page by page token counts, never the text. Only the marks those
// counts get right are kept; colons, dashes, quotes, apostrophes and brackets
// are garbled by scanning and tokenizing. site/scripts/import-modern.mjs
// reduces each file with modernCounts into site/modern.json.

export const MODERN_MARKS = [',', '.', ';', '?', '!'] as const;

export interface ModernCounts {
  words: number;
  wordsPerSentence: number;
  // Each MODERN_MARKS mark's count, in that order
  counts: number[];
  // The same counts for each tenth of the pages
  tenths: number[][];
}

// The parts of an Extracted Features file this reads.
export interface ExtractedFeatures {
  features: { pages: Array<{ body?: { tokenPosCount?: Record<string, Record<string, number>> } | null }> };
}

// Words as Punc counts them (src/text.ts countWords): a token with a letter or
// digit. The tokenizer splits "don't" into "do" and "n't", which Punc counts
// as one word, so the clitic half doesn't count.
const WORD = /[A-Za-z0-9À-ɏ]/;
const CLITIC = /^(?:n't|'[A-Za-z]+)$/;
// A run of sentence endings ("?!", "...") is one sentence end, as in Punc.
const STOP = /^[.?!]+$/;

export function modernCounts(ef: ExtractedFeatures): ModernCounts {
  const pages = ef.features.pages.map(page => {
    const counts = MODERN_MARKS.map(() => 0);
    let words = 0;
    let stops = 0;
    for (const [token, byPos] of Object.entries(page.body?.tokenPosCount ?? {})) {
      const n = Object.values(byPos).reduce((a, b) => a + b, 0);
      const mark = MODERN_MARKS.indexOf(token as (typeof MODERN_MARKS)[number]);
      if (mark >= 0) counts[mark]! += n;
      if (STOP.test(token)) stops += n;
      else if (WORD.test(token) && !CLITIC.test(token)) words += n;
    }
    return { counts, words, stops };
  });
  const sum = (list: typeof pages) => MODERN_MARKS.map((_, m) => list.reduce((a, p) => a + p.counts[m]!, 0));
  const words = pages.reduce((a, p) => a + p.words, 0);
  const stops = pages.reduce((a, p) => a + p.stops, 0);
  return {
    words,
    wordsPerSentence: stops === 0 ? 0 : words / stops,
    counts: sum(pages),
    tenths: Array.from({ length: 10 }, (_, i) => sum(pages.slice(Math.floor((i * pages.length) / 10), Math.floor(((i + 1) * pages.length) / 10)))),
  };
}
