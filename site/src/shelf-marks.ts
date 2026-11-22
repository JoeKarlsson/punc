// What the site keeps for each shelf book instead of its text. The importer
// (site/scripts/analyze-books.mjs) analyzes a book once and writes this to
// site/marks/<slug>.json.gz; the build and the book page read only that, so no
// book text is committed or shipped.
import { analyzeBook, erasedPages } from './analyze';
import { countDashes, dialogueShare, touchingClusters } from './numbers';

export interface ShelfMarks {
  // Every counted mark in reading order, one character each.
  marks: string;
  counts: Array<[mark: string, count: number]>;
  wordCount: number;
  wordsPerSentence: number;
  dashes: number;
  dialogue: number;
  clusters: Array<[cluster: string, count: number]>;
  // The Pages view, each page packed with packPage.
  pages: string[];
}

export function shelfMarks(rawText: string): ShelfMarks {
  const book = analyzeBook(rawText);
  return {
    marks: book.marks.join(''),
    counts: book.counts,
    wordCount: book.wordCount,
    wordsPerSentence: book.wordsPerSentence,
    dashes: countDashes(book.text),
    dialogue: dialogueShare(book.text),
    clusters: [...touchingClusters(book.text)],
    pages: erasedPages(book.text).map(packPage),
  };
}

// An erased page is mostly spaces; each run of them is written as its length.
// Digits are never counted marks, so the numbers can't be mistaken for one.
export const packPage = (page: string): string => page.replace(/ +/g, run => String(run.length));
export const unpackPage = (packed: string): string => packed.replace(/\d+/g, n => ' '.repeat(Number(n)));
