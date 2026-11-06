import {
  authorsWithWorks,
  countDashes,
  dialogueShare,
  fingerprintDistance,
  guessAuthors,
  nextMarkShares,
  spearman,
  touchingClusters,
  trend,
  type BookNumbers,
} from '../site/src/numbers';
import { TRACKED_MARKS } from '../site/src/patterns';

const book = (over: Partial<BookNumbers>): BookNumbers =>
  ({ slug: 's', title: 'T', author: 'A', year: null, yearLabel: null, genres: [], rank: null, words: 0, shares: TRACKED_MARKS.map(() => 0.1), semicolon: 0, comma: 0, colon: 0, dash: 0, exclaim: 0, question: 0, marks: 0, wps: 0, dialogue: 0, ...over }) as BookNumbers;

describe('numbers page measures', () => {
  test('countDashes counts a run once and leaves out rules', () => {
    expect(countDashes('well-known -- then - and ---- and ------------')).toBe(3);
  });

  test('dialogueShare counts words inside double quotes, closing at the paragraph end', () => {
    expect(dialogueShare('"Come here," she said. "Now."')).toBeCloseTo(3 / 5);
    // An unclosed quote stops at the paragraph break
    expect(dialogueShare('"One two\n\nthree four')).toBeCloseTo(2 / 4);
  });

  test('dialogueShare tells single quotes from apostrophes', () => {
    // Two quotes open with single marks; "boys'" and "don't" are apostrophes
    const text = "'I don't know,' he said. 'Ask the boys' mother.'";
    // 7 of its 9 words are quoted
    expect(dialogueShare(text)).toBeCloseTo(7 / 9);
    expect(dialogueShare('')).toBe(0);
  });

  test('touchingClusters finds marks with nothing between them, not rules', () => {
    const clusters = touchingClusters('"Stop!" he said. "Why?" ---- (yes),');
    expect(Object.fromEntries(clusters)).toEqual({ '!"': 1, '?"': 1, '),': 1 });
  });

  test('nextMarkShares gives each mark the share of each mark after it', () => {
    const grid = nextMarkShares([...',.,,.']);
    const at = (m: string) => TRACKED_MARKS.findIndex(t => t.mark === m);
    expect(grid[at(',')]![at('.')]).toBeCloseTo(2 / 3);
    expect(grid[at(',')]![at(',')]).toBeCloseTo(1 / 3);
    expect(grid[at(';')]!.every(v => v === 0)).toBe(true);
  });

  test('spearman is 1 for the same order, -1 for the reverse, and handles ties', () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1);
    expect(spearman([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1);
    expect(spearman([1, 1, 1], [1, 2, 3])).toBe(0);
  });

  test('fingerprintDistance runs from 0 (same) to 1 (nothing shared)', () => {
    expect(fingerprintDistance([0.5, 0.5], [0.5, 0.5])).toBe(0);
    expect(fingerprintDistance([1, 0], [0, 1])).toBeCloseTo(1);
  });

  test('trend takes the median of each span with enough books', () => {
    const books = [1800, 1801, 1802, 1830].map((year, i) => book({ year, semicolon: i }));
    expect(trend(books, 'semicolon', 1800, 1850, 25, 3)).toEqual([{ from: 1800, to: 1825, books: 3, value: 1 }]);
  });

  test('authors need enough different works, volumes of one work counting once', () => {
    const books = [
      book({ author: 'Henry', title: 'Voyages, Vol. 1' }),
      book({ author: 'Henry', title: 'Voyages, Vol. 2' }),
      book({ author: 'Austen', title: 'Emma' }),
      book({ author: 'Austen', title: 'Persuasion' }),
      book({ author: 'Various', title: 'One' }),
      book({ author: 'Various', title: 'Two' }),
    ];
    expect(authorsWithWorks(books, 2).map(a => a.author)).toEqual(['Austen']);
  });

  test('guessAuthors names the author whose other books are closest', () => {
    const comma = TRACKED_MARKS.map((_, i) => (i === 0 ? 0.9 : 0.1 / 9));
    const period = TRACKED_MARKS.map((_, i) => (i === 1 ? 0.9 : 0.1 / 9));
    const authors = [
      { author: 'Commas', books: [book({ author: 'Commas', shares: comma }), book({ author: 'Commas', shares: comma })] },
      { author: 'Periods', books: [book({ author: 'Periods', shares: period }), book({ author: 'Periods', shares: period })] },
    ];
    expect(guessAuthors(authors).every(g => g.guessed === g.book.author)).toBe(true);
  });
});
