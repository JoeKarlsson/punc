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
});
