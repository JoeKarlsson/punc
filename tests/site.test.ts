import { analyzeText, wordsPerSentence } from '../src/text';
import { spiralLayout } from '../src/layout';
import { analyzeBook, erasedPages, foldTypography } from '../site/src/analyze';

describe('analyzeText', () => {
  test('records each mapped mark with its offset after whitespace collapses', () => {
    const { positions, totalChars, map } = analyzeText('Hi,  you.\nYes!');
    expect(positions).toEqual([
      { char: ',', offset: 2 },
      { char: '.', offset: 7 },
      { char: '!', offset: 11 },
    ]);
    expect(totalChars).toBe(12);
    expect(map[',']).toBe(1);
  });
});

describe('wordsPerSentence', () => {
  test('divides words by sentence-ending runs', () => {
    expect(wordsPerSentence("It's late. Is it?! Go")).toBe(5 / 2);
  });
  test('is 0 with no sentence endings', () => {
    expect(wordsPerSentence('no ending here')).toBe(0);
  });
});

describe('site analysis', () => {
  test('folds curly quotes and long dashes into the counted ASCII marks', () => {
    expect(foldTypography('“Hi—there’s…”')).toBe('"Hi-there\'s..."');
    const book = analyzeBook('“No,” she said.');
    expect(book.marks).toEqual(['"', ',', '"', '.']);
    expect(book.counts[0]).toEqual(['"', 2]);
  });

  test('erasedPages blanks letters, keeps marks and breaks pages between words', () => {
    const pages = erasedPages('One, _two_.\nThree!\n\nFour; five six seven eight', 20);
    expect(pages.join('')).not.toMatch(/[A-Za-z_]/);
    expect(pages[0]).toBe('   ,      .      !');
    expect(pages.every(p => p.length <= 20)).toBe(true);
    expect(pages.join('').replace(/\s/g, '')).toBe(',.!;');
  });

  test('erasedPages still pages a long run with no marks', () => {
    expect(erasedPages('word '.repeat(100), 50).length).toBeGreaterThan(5);
  });
});

describe('spiralLayout', () => {
  test('places every mark inside the canvas', () => {
    const { points } = spiralLayout(500, 400, 400);
    expect(points).toHaveLength(500);
    expect(points.every(p => p.x > 0 && p.x < 400 && p.y > 0 && p.y < 400)).toBe(true);
  });
});
