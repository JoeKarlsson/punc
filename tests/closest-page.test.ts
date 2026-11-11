import { closestPath } from '../site/src/closest-page';

describe('closestPath', () => {
  const paths = ['about.html', 'numbers.html', 'read.html', 'books/moby-dick/', 'books/emma/', 'books/frankenstein/'];

  it('finds the page a typo meant', () => {
    expect(closestPath('/books/moby-dik/', paths)).toBe('books/moby-dick/');
    expect(closestPath('/abuot.html', paths)).toBe('about.html');
    expect(closestPath('/Books/Frankenstien/', paths)).toBe('books/frankenstein/');
  });

  it('offers nothing when no page is close', () => {
    expect(closestPath('/wp-admin/setup.php', paths)).toBeNull();
    expect(closestPath('/books/ulysses/', paths)).toBeNull();
  });
});
