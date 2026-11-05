// @ts-expect-error: plain ESM maintenance script, no type declarations
import { parseAuthor, parseCSV, stripGutenberg } from '../site/scripts/fetch-books.mjs';

describe('Gutenberg catalog parsing', () => {
  test('parseCSV handles quoted commas, doubled quotes and newlines', () => {
    expect(parseCSV('a,b\n"x, y","say ""hi""\nthere"\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"\nthere'],
    ]);
  });

  test.each([
    ['Austen, Jane, 1775-1817', 'Jane Austen', 1775],
    ['Fitzgerald, F. Scott (Francis Scott), 1896-1940', 'F. Scott Fitzgerald', 1896],
    ['Tolstoy, Leo, graf, 1828-1910; Maude, Aylmer [Translator]', 'Leo Tolstoy', 1828],
    ['Plato, 428? BCE-348? BCE; Jowett, Benjamin [Translator]', 'Plato', -428],
    ['', 'Anonymous', null],
  ])('parseAuthor(%s)', (raw, name, born) => {
    expect(parseAuthor(raw)).toMatchObject({ name, born });
  });

  test('stripGutenberg keeps only the book between the markers', () => {
    const raw = '﻿License\r\n*** START OF THE PROJECT GUTENBERG EBOOK X ***\r\n[Illustration: a cat]\r\n\r\nCall me Ishmael.\r\n*** END OF THE PROJECT GUTENBERG EBOOK X ***\r\nMore license';
    expect(stripGutenberg(raw)).toBe('Call me Ishmael.\n');
  });

  test('stripGutenberg refuses a file without markers', () => {
    expect(() => stripGutenberg('just text')).toThrow('No Gutenberg START/END markers');
  });
});
