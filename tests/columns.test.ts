import { fromColumns, toColumns } from '../site/src/columns';
import { bylineOf, perMille } from '../site/src/card';

describe('columns', () => {
  test('round-trip rows, with a field a row lacks as null', () => {
    const rows = [{ slug: 'a', rank: 1 as number | null }, { slug: 'b' }];
    const columns = toColumns(rows);
    expect(columns).toEqual({ slug: ['a', 'b'], rank: [1, null] });
    expect(fromColumns(columns)).toEqual([{ slug: 'a', rank: 1 }, { slug: 'b', rank: null }]);
  });

  test('refuse columns of different lengths', () => {
    expect(() => fromColumns({ slug: ['a', 'b'], rank: [1] })).toThrow('Column rank has 1 entries, not 2');
  });
});

describe('shelf cards', () => {
  test('keep a mark that is there, however rare', () => {
    expect([0, 0.0004, 0.0126, 0.3937].map(perMille)).toEqual([0, 1, 13, 394]);
  });

  test('show the year as written, the sort year, or none', () => {
    expect(bylineOf({ author: 'Homer', yearLabel: '8th century BCE', publishedSort: -750 })).toBe('Homer, 8th century BCE');
    expect(bylineOf({ author: 'Jane Austen', yearLabel: null, publishedSort: 1813 })).toBe('Jane Austen, 1813');
    expect(bylineOf({ author: 'Anonymous', yearLabel: '', publishedSort: 1800 })).toBe('Anonymous');
    expect(bylineOf({ author: 'Anonymous', yearLabel: null, publishedSort: null })).toBe('Anonymous');
  });
});
