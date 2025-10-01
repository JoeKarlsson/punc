import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import PDFDocument from 'pdfkit';
import through2 from 'through2';

// Types
export interface PunctuationCount {
  // Basic punctuation
  ';': number;
  ':': number;
  "'": number;
  '"': number;
  ',': number;
  '!': number;
  '?': number;
  '.': number;
  '(': number;
  ')': number;
  '-': number;

  // Unicode symbols
  '★': number;
  '♥': number;
  '♦': number;
  '♠': number;
  '♣': number;
  '→': number;
  '←': number;
  '↑': number;
  '↓': number;
  '∞': number;
  '§': number;
  '¶': number;

  // Repeated punctuation
  '!!!': number;
  '???': number;
  '...': number;
  '---': number;

  // Math operators
  '+': number;
  '*': number;
  '/': number;
  '=': number;
  '≠': number;
  '≤': number;
  '≥': number;
  '±': number;
  '×': number;
  '÷': number;

  // Currency
  $: number;
  '€': number;
  '£': number;
  '¥': number;
  '¢': number;

  // Percent and degree
  '%': number;
  '°': number;

  // Copyright/Trademark
  '©': number;
  '®': number;
  '™': number;

  // Musical notes
  '♪': number;
  '♫': number;
  '♬': number;
  '♭': number;
  '♯': number;

  // Arrows
  '↔': number;
  '↕': number;
  '↗': number;
  '↘': number;
  '↙': number;
  '↖': number;

  // Geometric shapes
  '○': number;
  '●': number;
  '□': number;
  '■': number;
  '△': number;
  '▲': number;
  '▽': number;
  '▼': number;

  // Lines and borders
  '│': number;
  '─': number;
  '┌': number;
  '┐': number;
  '└': number;
  '┘': number;
  '├': number;
  '┤': number;
  '┬': number;
  '┴': number;

  // International punctuation
  '¿': number; // Spanish
  '¡': number; // Spanish
  '؟': number; // Arabic
  '،': number; // Arabic
  '؛': number; // Arabic
  '，': number; // Chinese
  '。': number; // Chinese
  '；': number; // Chinese
  '：': number; // Chinese
  '？': number; // Chinese
  '！': number; // Chinese

  // Programming & Technical
  '[': number;
  ']': number;
  '{': number;
  '}': number;
  '<': number;
  '>': number;
  '`': number;
  '|': number;
  '\\': number;
  '~': number;
  '^': number;
  '&': number;
  '@': number;
  '#': number;

  // Visual & Decorative
  '☆': number;
  '✦': number;
  '✧': number;
  '♡': number;
  '❤': number;
  '💙': number;
  '💚': number;
  '💛': number;
  '💜': number;
  '✓': number;
  '✔': number;
  '☑': number;
  '✗': number;
  '✘': number;
  '☒': number;
}

export interface PuncOptions {
  encoding?: BufferEncoding;
  mapping?: PunctuationCount;
}

export interface PuncResult {
  body: string;
  count: PunctuationCount;
  wordsPerSentence: number;
  spaced: string;
}

export interface PDFResult {
  success: boolean;
  pathToFile: string;
}

// Default punctuation mapping
function defaultMapping(): PunctuationCount {
  return {
    // Basic punctuation
    ';': 0,
    ':': 0,
    "'": 0,
    '"': 0,
    ',': 0,
    '!': 0,
    '?': 0,
    '.': 0,
    '(': 0,
    ')': 0,
    '-': 0,

    // Unicode symbols
    '★': 0,
    '♥': 0,
    '♦': 0,
    '♠': 0,
    '♣': 0,
    '→': 0,
    '←': 0,
    '↑': 0,
    '↓': 0,
    '∞': 0,
    '§': 0,
    '¶': 0,

    // Repeated punctuation
    '!!!': 0,
    '???': 0,
    '...': 0,
    '---': 0,

    // Math operators
    '+': 0,
    '*': 0,
    '/': 0,
    '=': 0,
    '≠': 0,
    '≤': 0,
    '≥': 0,
    '±': 0,
    '×': 0,
    '÷': 0,

    // Currency
    $: 0,
    '€': 0,
    '£': 0,
    '¥': 0,
    '¢': 0,

    // Percent and degree
    '%': 0,
    '°': 0,

    // Copyright/Trademark
    '©': 0,
    '®': 0,
    '™': 0,

    // Musical notes
    '♪': 0,
    '♫': 0,
    '♬': 0,
    '♭': 0,
    '♯': 0,

    // Arrows
    '↔': 0,
    '↕': 0,
    '↗': 0,
    '↘': 0,
    '↙': 0,
    '↖': 0,

    // Geometric shapes
    '○': 0,
    '●': 0,
    '□': 0,
    '■': 0,
    '△': 0,
    '▲': 0,
    '▽': 0,
    '▼': 0,

    // Lines and borders
    '│': 0,
    '─': 0,
    '┌': 0,
    '┐': 0,
    '└': 0,
    '┘': 0,
    '├': 0,
    '┤': 0,
    '┬': 0,
    '┴': 0,

    // International punctuation
    '¿': 0, // Spanish
    '¡': 0, // Spanish
    '؟': 0, // Arabic
    '،': 0, // Arabic
    '؛': 0, // Arabic
    '，': 0, // Chinese
    '。': 0, // Chinese
    '；': 0, // Chinese
    '：': 0, // Chinese
    '？': 0, // Chinese
    '！': 0, // Chinese

    // Programming & Technical
    '[': 0,
    ']': 0,
    '{': 0,
    '}': 0,
    '<': 0,
    '>': 0,
    '`': 0,
    '|': 0,
    '\\': 0,
    '~': 0,
    '^': 0,
    '&': 0,
    '@': 0,
    '#': 0,

    // Visual & Decorative
    '☆': 0,
    '✦': 0,
    '✧': 0,
    '♡': 0,
    '❤': 0,
    '💙': 0,
    '💚': 0,
    '💛': 0,
    '💜': 0,
    '✓': 0,
    '✔': 0,
    '☑': 0,
    '✗': 0,
    '✘': 0,
    '☒': 0,
  };
}

// Validate options
function validateOptions(
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

  if (typeof options !== 'object') {
    throw new TypeError('expected options to be either an object or a string');
  }

  // Merge custom mapping with default mapping to ensure all keys are present
  const defaultMap = defaultMapping();
  const customMapping = options.mapping || {};
  const mergedMapping = { ...defaultMap, ...customMapping };

  return {
    encoding: options.encoding || 'utf8',
    mapping: mergedMapping,
  };
}

// Transform stream to remove and replace text
function removeAndReplace(
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
function findWordsPerSentence(changeCount: (count: number) => void): Transform {
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
function findAndCount(map: PunctuationCount, dest: string[]): Transform {
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
            console.warn(`Warning: Key '${key}' not found in punctuation map`);
            continue;
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
      for (let i = 0; i < chunkStr.length; i++) {
        const punctuation = chunkStr[i];

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
      callback(
        new Error(`Punctuation detection error: ${errorMessage}`),
        undefined
      );
    }
  });
}

// Main Punc function
export async function punc(
  filePath: string,
  options?: PuncOptions | string
): Promise<PuncResult> {
  const validatedOptions = validateOptions(filePath, options);
  const punctuationStore: string[] = [];
  let wordsPerSent = 0;
  let spacedOutBody = '';

  return new Promise((resolve, reject) => {
    try {
      const readStream = createReadStream(filePath, {
        encoding: validatedOptions.encoding,
      });

      // Add error handling to read stream
      readStream.on('error', error => {
        reject(new Error(`File read error: ${error.message}`));
      });

      pipeline(
        readStream,
        removeAndReplace(/[\r\n]/g, ''),
        removeAndReplace(/[\s]+/g, ' '),
        findAndCount(validatedOptions.mapping!, punctuationStore),
        findWordsPerSentence(count => {
          if (typeof count === 'number' && !isNaN(count)) {
            wordsPerSent = count;
          } else {
            console.warn('Warning: Invalid words per sentence count:', count);
            wordsPerSent = 0;
          }
        }),
        removeAndReplace(/[a-zA-Z\d]+/g, ' ', spaced => {
          if (typeof spaced === 'string') {
            spacedOutBody = spaced;
          } else {
            console.warn('Warning: Invalid spaced text:', spaced);
            spacedOutBody = '';
          }
        })
      )
        .then(() => {
          try {
            // Validate results before returning
            if (!Array.isArray(punctuationStore)) {
              throw new Error('Invalid punctuation store: expected array');
            }

            if (
              !validatedOptions.mapping ||
              typeof validatedOptions.mapping !== 'object'
            ) {
              throw new Error('Invalid mapping: expected object');
            }

            if (typeof wordsPerSent !== 'number' || isNaN(wordsPerSent)) {
              console.warn(
                'Warning: Invalid wordsPerSentence, defaulting to 0'
              );
              wordsPerSent = 0;
            }

            if (typeof spacedOutBody !== 'string') {
              console.warn(
                'Warning: Invalid spacedOutBody, defaulting to empty string'
              );
              spacedOutBody = '';
            }

            resolve({
              body: punctuationStore.join(''),
              count: validatedOptions.mapping,
              wordsPerSentence: wordsPerSent,
              spaced: spacedOutBody,
            });
          } catch (validationError) {
            reject(
              new Error(
                `Result validation error: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`
              )
            );
          }
        })
        .catch(error => {
          reject(new Error(`Pipeline error: ${error.message}`));
        });
    } catch (setupError) {
      reject(
        new Error(
          `Setup error: ${setupError instanceof Error ? setupError.message : 'Unknown error'}`
        )
      );
    }
  });
}

// Create PDF function
export async function createPDF(
  filePath: string,
  options?: PuncOptions | string
): Promise<PDFResult> {
  const validatedOptions = validateOptions(filePath, options);
  const newFileName = `${filePath}-visual.pdf`;

  return new Promise((resolve, reject) => {
    const readStream = createReadStream(filePath, {
      encoding: validatedOptions.encoding,
    });

    // Add error handling to read stream
    readStream.on('error', error => {
      reject(new Error(`File read error: ${error.message}`));
    });

    const pdf = new PDFDocument();
    const writeStream = createWriteStream(newFileName);

    // Add error handling to write stream
    writeStream.on('error', error => {
      reject(new Error(`File write error: ${error.message}`));
    });

    pdf.pipe(writeStream);

    let processedText = '';

    pipeline(
      readStream,
      removeAndReplace(/[a-zA-Z\d]+/g, ' ', chunk => {
        processedText += chunk;
      })
    )
      .then(() => {
        pdf
          .font('lib/fonts/Inconsolata-Regular.ttf')
          .fontSize(25)
          .text(processedText);

        pdf.end();

        writeStream.on('finish', () => {
          resolve({ success: true, pathToFile: newFileName });
        });
      })
      .catch(error => {
        reject(new Error(`Pipeline error: ${error.message}`));
      });
  });
}

// Default export for backward compatibility
export default punc;
