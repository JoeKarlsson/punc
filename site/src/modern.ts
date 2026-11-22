// Modern books (first published 1930 on) come from HathiTrust's Extracted
// Features: page by page token counts, never the text.
// site/scripts/import-modern.mjs reduces each file with modernCounts into
// site/modern.json.
import { foldTypography } from '../../src/text';
import { TRACKED_MARKS } from './patterns';

export interface ModernCounts {
  words: number;
  wordsPerSentence: number;
  // Each TRACKED_MARKS mark's count, in that order
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
const CLITIC = /^(?:n['’]t|['’][A-Za-z]+)$/;
// A run of sentence endings ("?!", "...") is one sentence end, as in Punc.
const STOP = /^[.?!]+$/;
// The tokenizer writes " as `` or '', and spells brackets out: -LRB- for (,
// -RRB- for ), -LSB- for [ and so on. Punc counts ( and ) together, and not [ or {.
const QUOTE_TOKENS = new Set(['``', "''"]);
const ROUND_BRACKET = /-[LR]RB-/g;
const ANY_BRACKET = /-[LR][RSC]B-/g;
const markIndex = new Map(TRACKED_MARKS.map(({ mark }, i) => [mark, i]));
markIndex.set(')', markIndex.get('(')!);
markIndex.set('`', markIndex.get("'")!);

// Counts each mark in a token the way Punc counts a text: every character,
// after folding curly quotes and long dashes to plain ones.
function addMarks(counts: number[], token: string, n: number) {
  if (QUOTE_TOKENS.has(token)) {
    counts[markIndex.get('"')!]! += n;
    return;
  }
  counts[markIndex.get('(')!]! += n * (token.match(ROUND_BRACKET)?.length ?? 0);
  for (const char of foldTypography(token.replace(ANY_BRACKET, ''))) {
    const i = markIndex.get(char);
    if (i !== undefined) counts[i]! += n;
  }
}

export function modernCounts(ef: ExtractedFeatures): ModernCounts {
  const pages = ef.features.pages.map(page => {
    const counts = TRACKED_MARKS.map(() => 0);
    let words = 0;
    let stops = 0;
    for (const [token, byPos] of Object.entries(page.body?.tokenPosCount ?? {})) {
      const n = Object.values(byPos).reduce((a, b) => a + b, 0);
      addMarks(counts, token, n);
      if (STOP.test(token)) stops += n;
      else if (WORD.test(token.replace(ANY_BRACKET, '')) && !CLITIC.test(token)) words += n;
    }
    return { counts, words, stops };
  });
  const sum = (list: typeof pages) => TRACKED_MARKS.map((_, m) => list.reduce((a, p) => a + p.counts[m]!, 0));
  const words = pages.reduce((a, p) => a + p.words, 0);
  const stops = pages.reduce((a, p) => a + p.stops, 0);
  return {
    words,
    wordsPerSentence: stops === 0 ? 0 : words / stops,
    counts: sum(pages),
    tenths: Array.from({ length: 10 }, (_, i) => sum(pages.slice(Math.floor((i * pages.length) / 10), Math.floor(((i + 1) * pages.length) / 10)))),
  };
}
