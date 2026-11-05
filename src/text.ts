// Pure text analysis with no Node dependencies, shared by the Node library
// (analysis.ts) and the browser site (site/src).
import { defaultMapping } from './mapping';
import { PunctuationCount, PuncPosition } from './types';

export interface TextAnalysis {
  positions: PuncPosition[];
  totalChars: number;
  map: PunctuationCount;
}

// Same normalization as the stream pipeline: drop line breaks, collapse runs
// of whitespace to one space, then record each mapped mark and its offset.
export function analyzeText(
  text: string,
  mapping: PunctuationCount = defaultMapping()
): TextAnalysis {
  const normalized = text.replace(/[\r\n]/g, '').replace(/[\s]+/g, ' ');
  const positions: PuncPosition[] = [];
  let offset = 0;
  for (const char of normalized) {
    if (char in mapping) {
      positions.push({ char, offset });
      mapping[char as keyof PunctuationCount]++;
    }
    offset++;
  }
  return { positions, totalChars: offset, map: mapping };
}

// Words over sentence-ending runs (". ? !" and repeats like "?!" count once),
// across the whole text. Returns 0 when there are no sentence endings.
export function wordsPerSentence(text: string): number {
  const words = text.match(/[A-Za-z0-9À-ɏ]+(?:['’][A-Za-z]+)*/g)?.length ?? 0;
  const sentences = text.match(/[.?!]+/g)?.length ?? 0;
  return sentences === 0 ? 0 : words / sentences;
}
