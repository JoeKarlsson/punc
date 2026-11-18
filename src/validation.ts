import { PuncOptions, PunctuationCount } from './types';
import { defaultMapping } from './mapping';

// Validate options and file path
export function validateOptions(
  filePath: string,
  options?: PuncOptions | string
): PuncOptions {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid file path: expected non-empty string');
  }

  if (filePath.trim().length === 0) {
    throw new Error('File path cannot be empty or whitespace only');
  }

  if (!options) {
    return { encoding: 'utf8', mapping: defaultMapping() };
  }

  if (typeof options === 'string') {
    return { encoding: options as BufferEncoding, mapping: defaultMapping() };
  }

  if (typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('expected options to be either an object or a string');
  }

  // Merge custom mapping with default mapping to ensure all keys are present
  const defaultMap = defaultMapping();
  const customMapping: Partial<PunctuationCount> = options.mapping || {};

  // Only include keys that exist in the default mapping
  const filteredCustomMapping: Partial<PunctuationCount> = {};
  for (const key in customMapping) {
    const value = customMapping[key as keyof PunctuationCount];
    if (key in defaultMap && value !== undefined) {
      filteredCustomMapping[key as keyof PunctuationCount] = value;
    }
  }

  const mergedMapping = { ...defaultMap, ...filteredCustomMapping };

  return {
    encoding: options.encoding || 'utf8',
    mapping: mergedMapping,
  };
}
