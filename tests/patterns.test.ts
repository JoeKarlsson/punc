import { fingerprintHTML, markShares, marksThroughBook, shelfPosition, throughBookHTML, TRACKED_MARKS } from '../site/src/patterns';

const marks = (s: string) => [...s];

describe('punctuation measures', () => {
  test('markShares gives each tracked mark its share, parentheses counted together', () => {
    const shares = markShares(marks(',,,.()?!'));
    const share = (m: string) => shares[TRACKED_MARKS.findIndex(t => t.mark === m)];
    expect(share(',')).toBe(3 / 8);
    expect(share('(')).toBe(2 / 8);
    expect(share(';')).toBe(0);
    expect(shares).toHaveLength(10);
  });

  test('marksThroughBook splits the marks into equal slices', () => {
    // Commas in the first half, periods in the second
    const series = marksThroughBook(marks(',,,,,.....'), 2);
    expect(series[0]).toEqual([1, 0]);
    expect(series[1]).toEqual([0, 1]);
  });

  test('shelfPosition counts pauses per stop and the share of ? and !', () => {
    expect(shelfPosition(marks(',,;-.?!"'))).toEqual({ pausesPerStop: 4 / 3, loudness: 2 / 8 });
    expect(shelfPosition([])).toEqual({ pausesPerStop: 0, loudness: 0 });
  });
});

describe('punctuation markup', () => {
  test('a fingerprint has ten fixed slots and an empty bar for a missing mark', () => {
    const html = fingerprintHTML(markShares(marks(',,.')));
    expect(html.match(/class="fp-slot"/g)).toHaveLength(10);
    expect(html).toContain('title="semicolon: 0.0%"><span class="fp-bar" style="height:0.0%">');
    expect(html).toContain('aria-label="Punctuation fingerprint: comma 67%, period 33%');
  });

  test('a fingerprint uses one scale for every book', () => {
    const half = fingerprintHTML(markShares(marks(',.')));
    expect(half).toContain('title="comma: 50%"><span class="fp-bar" style="height:100.0%">');
  });

  test('through-book rows skip marks the book never uses', () => {
    const html = throughBookHTML(marksThroughBook(marks(',.,.,.,.,.')));
    expect(html.match(/<li>/g)).toHaveLength(2);
    expect(html).toContain('peaks at 100%');
  });

  test('markup escapes the quote marks it prints', () => {
    expect(fingerprintHTML(markShares(marks('"')))).toContain('<span class="fp-mark">&quot;</span>');
  });
});
