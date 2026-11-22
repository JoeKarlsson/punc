import { analyzeText, countWords, wordsPerSentence } from '../src/text';
import { modernCounts } from '../site/src/modern';
import { TRACKED_MARKS } from '../site/src/patterns';

// One page of Extracted Features token counts for this sentence, split the
// way HathiTrust's tokenizer splits it: curly quotes stay, " becomes `` and
// '', brackets are spelled out, and "don't" is "do" and "n't".
const sentence = `“Don’t go,” said O’Brien (twice) -- and "left"; ...yes. Why not?! Fine.`;
const tokens: Record<string, number> = {
  '“': 1, Do: 1, 'n’t': 1, go: 1, ',': 1, '”': 1, said: 1, 'O’Brien': 1, '-LRB-': 1, twice: 1, '-RRB-': 1, '--': 1,
  and: 1, '``': 1, left: 1, "''": 1, ';': 1, '...': 1, yes: 1, '.': 2, Why: 1, not: 1, '?!': 1, Fine: 1,
};
const page = { body: { tokenPosCount: Object.fromEntries(Object.entries(tokens).map(([t, n]) => [t, { X: n }])) } };

// Punc's own count of each tracked mark in the sentence, ( and ) together.
const puncCounts = (text: string) => {
  const chars = analyzeText(text).positions.map(p => (p.char === ')' ? '(' : p.char));
  return TRACKED_MARKS.map(({ mark }) => chars.filter(c => c === mark).length);
};

describe('modernCounts', () => {
  test('counts words, sentence ends and every tracked mark the way Punc counts the same text', () => {
    const counts = modernCounts({ features: { pages: [page] } });
    expect(counts.words).toBe(countWords(sentence));
    expect(counts.wordsPerSentence).toBe(wordsPerSentence(sentence));
    expect(counts.counts).toEqual(puncCounts(sentence));
  });

  test('splits the counts into tenths of the pages, and empty pages count nothing', () => {
    const pages = Array.from({ length: 20 }, (_, i) => (i === 19 ? page : { body: null }));
    const { tenths, counts } = modernCounts({ features: { pages } });
    expect(tenths).toHaveLength(10);
    expect(tenths.slice(0, 9).flat().every(n => n === 0)).toBe(true);
    expect(tenths[9]).toEqual(counts);
  });
});
