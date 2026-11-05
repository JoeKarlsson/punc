import { Transform } from 'stream';
import through2 from 'through2';
import { PunctuationCount } from './types';
import { countWords } from './text';

// Transform stream to remove and replace text
export function removeAndReplace(
  regex: RegExp,
  replace: string,
  dest?: (chunk: string) => void
): Transform {
  return through2.obj(function (
    chunk: Buffer | string,
    _: unknown,
    callback: (error: Error | null, data?: string) => void
  ) {
    const chunkStr = typeof chunk === 'string' ? chunk : chunk.toString();
    const result = chunkStr.replace(regex, replace);
    if (dest) dest(result);
    callback(null, result);
  });
}

// Transform stream that applies a text function to every chunk
export function mapText(fn: (text: string) => string): Transform {
  return through2.obj(function (
    chunk: Buffer | string,
    _: unknown,
    callback: (error: Error | null, data?: string) => void
  ) {
    callback(null, fn(typeof chunk === 'string' ? chunk : chunk.toString()));
  });
}

// Transform stream to find words per sentence across the whole stream.
// Reports once, at the end: 0 for no text, Infinity for words with no
// sentence ending, otherwise words over sentence-ending runs (as in
// wordsPerSentence). A word or run of marks cut off at the end of a chunk is
// held back and counted with the next one, so chunk size doesn't change it.
export function findWordsPerSentence(
  changeCount: (count: number) => void
): Transform {
  let words = 0;
  let sentenceEnds = 0;
  let carry = '';
  const tally = (text: string) => {
    words += countWords(text);
    sentenceEnds += text.match(/[.?!]+/g)?.length ?? 0;
  };
  return through2.obj(
    function (
      chunk: Buffer | string,
      _: unknown,
      callback: (error: Error | null, data?: string) => void
    ) {
      const chunkStr = typeof chunk === 'string' ? chunk : chunk.toString();
      const text = carry + chunkStr;
      carry = text.match(/[^\s]+$/)?.[0] ?? '';
      tally(text.slice(0, text.length - carry.length));
      callback(null, chunkStr);
    },
    function (callback: () => void) {
      tally(carry);
      changeCount(sentenceEnds > 0 ? words / sentenceEnds : words > 0 ? Infinity : 0);
      callback();
    }
  );
}

// Transform stream to find and count punctuation
export function findAndCount(map: PunctuationCount, dest: string[]): Transform {
  return through2.obj(function (
    this: Transform,
    chunk: Buffer | string,
    _: unknown,
    callback: (error: Error | null, data?: string) => void
  ) {
    try {
      // Validate input parameters
      if (typeof chunk !== 'string' && !Buffer.isBuffer(chunk)) {
        throw new Error('Invalid chunk: expected Buffer or string');
      }

      if (!map || typeof map !== 'object') {
        throw new Error('Invalid punctuation map: expected object');
      }

      if (!Array.isArray(dest)) {
        throw new Error('Invalid destination array: expected array');
      }

      const chunkStr =
        typeof chunk === 'string' ? chunk : chunk.toString('utf8');

      if (typeof chunkStr !== 'string') {
        throw new Error('Failed to convert chunk to string');
      }

      // Handle repeated punctuation patterns first
      const repeatedPatterns = [
        { pattern: /!!!+/g, key: '!!!' as keyof PunctuationCount },
        { pattern: /\?\?\?+/g, key: '???' as keyof PunctuationCount },
        { pattern: /\.\.\.+/g, key: '...' as keyof PunctuationCount },
        { pattern: /---+/g, key: '---' as keyof PunctuationCount },
      ];

      for (const { pattern, key } of repeatedPatterns) {
        try {
          if (!(key in map)) {
            continue; // Skip patterns not in the mapping
          }

          const matches = chunkStr.match(pattern);
          if (matches && Array.isArray(matches)) {
            const count = matches.length;
            if (typeof map[key] === 'number' && !isNaN(map[key])) {
              map[key] += count;
              dest.push(...matches);
            } else {
              // Initialize invalid count values to 0 and continue processing
              map[key] = count;
              dest.push(...matches);
            }
          }
        } catch (patternError) {
          console.warn(
            `Warning: Error processing pattern for key '${key}':`,
            patternError
          );
        }
      }

      // Handle single character punctuation
      // Use Array.from to properly handle Unicode characters
      const characters = Array.from(chunkStr);
      for (let i = 0; i < characters.length; i++) {
        const punctuation = characters[i];

        try {
          if (punctuation && punctuation in map) {
            const key = punctuation as keyof PunctuationCount;

            if (typeof map[key] === 'number' && !isNaN(map[key])) {
              map[key]++;
              dest.push(punctuation);
            } else {
              // Initialize invalid count values to 1 and continue processing
              map[key] = 1;
              dest.push(punctuation);
            }
          }
        } catch (charError) {
          console.warn(
            `Warning: Error processing character '${punctuation}':`,
            charError
          );
        }
      }

      callback(null, chunkStr);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error in punctuation detection';
      const streamError = new Error(
        `Punctuation detection error: ${errorMessage}`
      );
      this.emit('error', streamError);
      callback(streamError, undefined);
    }
  });
}
