import { bookPageTitle, booksIndexHTML } from '../site/src/seo';

describe('bookPageTitle', () => {
  test('keeps the site name while the title fits in a search result', () => {
    expect(bookPageTitle('Moby-Dick')).toBe('The punctuation of Moby-Dick · Punc');
  });
  test('drops the site name from a long title', () => {
    expect(bookPageTitle('Twenty Thousand Leagues Under the Sea')).toBe('The punctuation of Twenty Thousand Leagues Under the Sea');
  });
  test('drops the leading "The" when the site name alone is not enough', () => {
    expect(bookPageTitle('The Extraordinary Adventures of Arsène Lupin')).toBe('Punctuation of The Extraordinary Adventures of Arsène Lupin');
  });
});

describe('booksIndexHTML', () => {
  test('files titles by letter without a leading article, and escapes them', () => {
    const html = booksIndexHTML([
      { slug: 'the-time-machine', title: 'The Time Machine', author: 'H. G. Wells' },
      { slug: 'emma', title: 'Emma', author: 'Jane Austen' },
      { slug: '1066', title: '1066 & All That', author: 'Sellar' },
      { slug: 'aesthetic', title: 'Æsthetic', author: 'Croce' },
    ]);
    expect(html.indexOf('Æsthetic')).toBeGreaterThan(html.indexOf('id="a"'));
    expect(html.indexOf('id="other"')).toBeLessThan(html.indexOf('id="e"'));
    expect(html.indexOf('id="e"')).toBeLessThan(html.indexOf('id="t"'));
    expect(html).toContain('<a href="books/the-time-machine/">The Time Machine</a>, H. G. Wells');
    expect(html).toContain('1066 &amp; All That');
  });
});
