import { fingerprintHTML, mapSVG, markShares, marksThroughBook, niceAxis, shelfPosition, throughBookHTML, TRACKED_MARKS } from '../site/src/patterns';

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
    expect(html).toContain('How far through the book');
    expect(html.match(/class="tb-tick"/g)).toHaveLength(5);
  });

  test('markup escapes the quote marks it prints', () => {
    expect(fingerprintHTML(markShares(marks('"')))).toContain('<span class="fp-mark">&quot;</span>');
  });
});

describe('map axes', () => {
  test.each([
    [6.4, 7, 1, 8],      // the shelf's pauses axis: 0, 1 ... 7
    [13.9, 14, 2, 8],    // the shelf's loudness axis: 0, 2 ... 14
    [88, 100, 20, 6],    // an upload that is almost all ? and !
    [0, 0.5, 0.5, 2],    // a file with no punctuation
  ])('niceAxis(%p) ends at %p', (dataMax, max, step, tickCount) => {
    const axis = niceAxis(dataMax);
    expect(axis.max).toBe(max);
    expect(axis.ticks).toHaveLength(tickCount);
    expect(axis.ticks[1]).toBe(step);
  });

  test('a book on its own page replaces its shelf dot with the highlight', () => {
    const shelf = [
      { slug: 'a', title: 'A', pausesPerStop: 1, loudness: 0.02 },
      { slug: 'b', title: 'B', pausesPerStop: 2, loudness: 0.05 },
    ];
    const svg = mapSVG(shelf, { highlight: { slug: 'a', title: 'A', pausesPerStop: 1, loudness: 0.02 }, root: '../../' });
    expect(svg.match(/class="map-dot"/g)).toHaveLength(1);
    expect(svg).toContain('href="../../books/b/"');
    expect(svg).toContain('class="map-here"');
  });

  test('a label that would run into one already placed is left off', () => {
    const shelf = [
      { slug: 'a', title: 'A Brief Account', pausesPerStop: 8, loudness: 0.001 },
      { slug: 'b', title: 'The Close Neighbour', pausesPerStop: 7.9, loudness: 0.002 },
      { slug: 'c', title: 'Far Away', pausesPerStop: 1, loudness: 0.15 },
    ];
    const svg = mapSVG(shelf, { labelled: ['a', 'b', 'c'] });
    expect(svg).toContain('>A Brief Account</text>');
    expect(svg).not.toContain('>The Close Neighbour</text>');
    expect(svg).toContain('>Far Away</text>');
  });
});
