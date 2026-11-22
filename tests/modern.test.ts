import { countWords, wordsPerSentence } from '../src/text';
import { modernCounts } from '../site/src/modern';

// One page of Extracted Features token counts, as HathiTrust's tokenizer
// splits "Don't go, Tom. Why not?! Fine; ...yes."
const sentence = "Don't go, Tom. Why not?! Fine; ...yes.";
const page = {
  body: {
    tokenPosCount: {
      Do: { VBP: 1 }, "n't": { RB: 1 }, go: { VB: 1 }, ',': { ',': 1 }, Tom: { NNP: 1 }, '.': { '.': 2 },
      Why: { WRB: 1 }, not: { RB: 1 }, '?!': { '.': 1 }, Fine: { JJ: 1 }, ';': { ':': 1 }, '...': { ':': 1 }, yes: { UH: 1 },
    },
  },
};

describe('modernCounts', () => {
  test('counts words and sentence ends the way Punc counts the same text', () => {
    const counts = modernCounts({ features: { pages: [page] } });
    expect(counts.words).toBe(countWords(sentence));
    // Punc sees four sentence-end runs: ".", "?!", "...", "."
    expect(counts.wordsPerSentence).toBe(wordsPerSentence(sentence));
    // , . ; ? ! : the "?!" and "..." tokens aren't single marks
    expect(counts.counts).toEqual([1, 2, 1, 0, 0]);
  });

  test('splits the counts into tenths of the pages, and empty pages count nothing', () => {
    const pages = Array.from({ length: 20 }, (_, i) => (i === 19 ? page : { body: null }));
    const { tenths, counts } = modernCounts({ features: { pages } });
    expect(tenths).toHaveLength(10);
    expect(tenths.slice(0, 9).flat().every(n => n === 0)).toBe(true);
    expect(tenths[9]).toEqual(counts);
  });
});
