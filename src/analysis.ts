import { readFile } from 'fs/promises';
import { PuncOptions, PunctuationCount, PuncPosition, DensityWindow } from './types';
import { validateOptions } from './validation';
import { analyzeText } from './text';

export async function getPositions(
  filePath: string,
  options?: PuncOptions | string
): Promise<{ positions: PuncPosition[]; totalChars: number; map: PunctuationCount }> {
  const validatedOptions = validateOptions(filePath, options);
  const text = await readFile(filePath, { encoding: validatedOptions.encoding ?? 'utf8' });
  return analyzeText(text, validatedOptions.mapping!);
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
