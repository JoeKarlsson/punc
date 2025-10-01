import { Transform } from 'stream';
import through2 from 'through2';
import { PunctuationCount } from './types';

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

// Transform stream to find words per sentence
export function findWordsPerSentence(
  changeCount: (count: number) => void
): Transform {
  return through2.obj(function (
    chunk: Buffer | string,
    _: unknown,
    callback: (error: Error | null, data?: string) => void
  ) {
    const chunkStr = typeof chunk === 'string' ? chunk : chunk.toString();
    const periodCount = (chunkStr.match(/\.|\?|\!/g) || []).length;
    const wordCount = chunkStr.split(' ').length;
    changeCount(wordCount / periodCount);
    callback(null, chunkStr);
  });
}

// Transform stream to find and count punctuation
export function findAndCount(map: PunctuationCount, dest: string[]): Transform {
  return through2.obj(function (
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
        { pattern: /---+$/g, key: '---' as keyof PunctuationCount },
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

            if (!(key in map)) {
              console.warn(
                `Warning: Key '${key}' not found in punctuation map`
              );
              continue;
            }

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
