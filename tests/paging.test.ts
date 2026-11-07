import { pageLinks } from '../site/src/paging';

describe('pageLinks', () => {
  test.each([
    [1, 1, [1]],
    [1, 3, [1, 2, 3]],
    [1, 21, [1, 2, null, 21]],
    [3, 21, [1, 2, 3, 4, null, 21]],
    [7, 21, [1, null, 6, 7, 8, null, 21]],
    [21, 21, [1, null, 20, 21]],
  ])('page %i of %i', (current, total, links) => {
    expect(pageLinks(current, total)).toEqual(links);
  });

  test('a wider window around the current page', () => {
    expect(pageLinks(10, 21, 3)).toEqual([1, null, 7, 8, 9, 10, 11, 12, 13, null, 21]);
    expect(pageLinks(2, 21, 3)).toEqual([1, 2, 3, 4, 5, null, 21]);
  });
});
