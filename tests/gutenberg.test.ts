// @ts-expect-error: plain ESM maintenance script, no type declarations
import { parseAuthor, parseCSV, publicationOf, stripGutenberg } from '../site/scripts/fetch-books.mjs';
import catalog from '../site/catalog.json';

describe('Gutenberg catalog parsing', () => {
  test('parseCSV handles quoted commas, doubled quotes and newlines', () => {
    expect(parseCSV('a,b\n"x, y","say ""hi""\nthere"\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"\nthere'],
    ]);
  });

  test.each([
    ['Austen, Jane, 1775-1817', 'Jane Austen'],
    ['Fitzgerald, F. Scott (Francis Scott), 1896-1940', 'F. Scott Fitzgerald'],
    ['Tolstoy, Leo, graf, 1828-1910; Maude, Aylmer [Translator]', 'Leo Tolstoy'],
    ['Plato, 428? BCE-348? BCE; Jowett, Benjamin [Translator]', 'Plato'],
    ['', 'Anonymous'],
  ])('parseAuthor(%s)', (raw, name) => {
    expect(parseAuthor(raw)).toBe(name);
  });

  test('publicationOf gives a label and a sortable year', () => {
    expect(publicationOf('84')).toEqual({ published: '1818', publishedSort: 1818 });
    expect(publicationOf('1497')).toEqual({ published: 'c. 375 BCE', publishedSort: -375 });
    expect(publicationOf('2148')).toEqual({ published: null, publishedSort: null });
    expect(() => publicationOf('999999')).toThrow('add it to PUBLISHED');
  });

  test('every book on the shelf has a publication entry', () => {
    for (const book of catalog) expect(() => publicationOf(String(book.id))).not.toThrow();
  });

  test('stripGutenberg keeps only the book between the markers', () => {
    const raw = '﻿License\r\n*** START OF THE PROJECT GUTENBERG EBOOK X ***\r\n[Illustration: a cat]\r\n\r\nCall me Ishmael.\r\n*** END OF THE PROJECT GUTENBERG EBOOK X ***\r\nMore license';
    expect(stripGutenberg(raw)).toBe('Call me Ishmael.\n');
  });

  test('stripGutenberg refuses a file without markers', () => {
    expect(() => stripGutenberg('just text')).toThrow('No Gutenberg START/END markers');
  });
});
