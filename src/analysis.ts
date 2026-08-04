import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import through2 from 'through2';
import { PuncOptions, PunctuationCount, PuncPosition, DensityWindow } from './types';
import { validateOptions } from './validation';
import { removeAndReplace } from './streams';

export async function getPositions(
  filePath: string,
  options?: PuncOptions | string
): Promise<{ positions: PuncPosition[]; totalChars: number; map: PunctuationCount }> {
  const validatedOptions = validateOptions(filePath, options);
  const positions: PuncPosition[] = [];
  const map = validatedOptions.mapping!;
  let offset = 0;

  await pipeline(
    createReadStream(filePath, { encoding: validatedOptions.encoding }),
    removeAndReplace(/[\r\n]/g, ''),
    removeAndReplace(/[\s]+/g, ' '),
    through2.obj(function (
      this: Transform,
      chunk: Buffer | string,
      _: unknown,
      callback: (err: Error | null, data?: string) => void
    ) {
      const str = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      for (const char of Array.from(str)) {
        if (char in map) {
          positions.push({ char, offset });
          map[char as keyof PunctuationCount]++;
        }
        offset++;
      }
      callback(null, str);
    })
  );

  return { positions, totalChars: offset, map };
}

export function windowedDensity(
  positions: PuncPosition[],
  totalChars: number,
  windows = 100
): DensityWindow[] {
  if (totalChars === 0) return [];
  const windowSize = Math.max(1, Math.ceil(totalChars / windows));
  const actualWindows = Math.ceil(totalChars / windowSize);
  const result: DensityWindow[] = [];

  for (let i = 0; i < actualWindows; i++) {
    const startOffset = i * windowSize;
    const endOffset = Math.min(startOffset + windowSize, totalChars);
    const inWindow = positions.filter(p => p.offset >= startOffset && p.offset < endOffset);

    const counts: Partial<PunctuationCount> = {};
    for (const { char } of inWindow) {
      const key = char as keyof PunctuationCount;
      counts[key] = ((counts[key] as number | undefined) ?? 0) + 1;
    }

    const charsInWindow = endOffset - startOffset;
    result.push({
      index: i,
      startOffset,
      endOffset,
      counts,
      totalPunctuation: inWindow.length,
      density: (inWindow.length / charsInWindow) * 100,
    });
  }

  return result;
}
