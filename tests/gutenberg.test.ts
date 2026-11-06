// @ts-expect-error: plain ESM maintenance script, no type declarations
import { cleanTitle, parseAuthor, parseCSV, publicationOf, stripGutenberg } from '../site/scripts/fetch-books.mjs';

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
  });

  test('publicationOf takes the Wikidata year only when PUBLISHED has none', () => {
    expect(publicationOf('84', 1993)).toEqual({ published: '1818', publishedSort: 1818 });
    expect(publicationOf('999999', 1920)).toEqual({ published: '1920', publishedSort: 1920 });
    expect(publicationOf('999999')).toEqual({ published: null, publishedSort: null });
  });

  test.each([
    ['A farewell to arms', 'A Farewell to Arms'],
    ['The war of the worlds', 'The War of the Worlds'],
    ['Faust [part 1]; or, a tragedy', 'Faust'],
    ['Middlemarch, Complete', 'Middlemarch'],
    ['Frankenstein; Or, The Modern Prometheus', 'Frankenstein'],
  ])('cleanTitle(%s)', (raw, title) => {
    expect(cleanTitle(raw)).toBe(title);
  });

  test('stripGutenberg keeps only the book between the markers', () => {
    const raw = '﻿License\r\n*** START OF THE PROJECT GUTENBERG EBOOK X ***\r\n[Illustration: a cat]\r\n\r\nCall me Ishmael.\r\n*** END OF THE PROJECT GUTENBERG EBOOK X ***\r\nMore license';
    expect(stripGutenberg(raw)).toBe('Call me Ishmael.\n');
  });

  test('stripGutenberg refuses a file without markers', () => {
    expect(() => stripGutenberg('just text')).toThrow('No Gutenberg START/END markers');
  });
});
