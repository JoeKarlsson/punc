import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import PDFDocument from 'pdfkit';
import through2 from 'through2';

// Types
export interface PunctuationCount {
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
  };
}

// Validate options
function validateOptions(
  filePath: string,
  options?: PuncOptions | string
): PuncOptions {
  if (!filePath) {
    throw new Error('Punc: file path not given.');
  }

  if (!options) {
    return { encoding: 'utf8', mapping: defaultMapping() };
  }

  if (typeof options === 'string') {
    return { encoding: options as BufferEncoding, mapping: defaultMapping() };
  }

  if (typeof options !== 'object') {
    throw new TypeError(
      `Punc: expected options to be either an object or a string, but got ${typeof options} instead`
    );
  }

  return {
    encoding: options.encoding || 'utf8',
    mapping: options.mapping || defaultMapping(),
  };
}

// Transform stream to remove and replace text
function removeAndReplace(
  regex: RegExp,
  replace: string,
  dest?: (chunk: string) => void
): Transform {
  return through2.obj(function (
    chunk: Buffer,
    _: any,
    callback: (error: Error | null, data?: any) => void
  ) {
    const result = chunk.toString().replace(regex, replace);
    if (dest) dest(result);
    callback(null, result);
  });
}

// Transform stream to find words per sentence
function findWordsPerSentence(changeCount: (count: number) => void): Transform {
  return through2.obj(function (
    chunk: Buffer,
    _: any,
    callback: (error: Error | null, data?: any) => void
  ) {
    const chunkStr = chunk.toString();
    const periodCount = (chunkStr.match(/\.|\?|\!/g) || []).length;
    const wordCount = chunkStr.split(' ').length;
    changeCount(wordCount / periodCount);
    callback(null, chunkStr);
  });
}

// Transform stream to find and count punctuation
function findAndCount(map: PunctuationCount, dest: string[]): Transform {
  return through2.obj(function (
    chunk: Buffer,
    _: any,
    callback: (error: Error | null, data?: any) => void
  ) {
    const chunkStr = chunk.toString();
    for (const punctuation of chunkStr) {
      if (punctuation in map) {
        map[punctuation as keyof PunctuationCount]++;
        dest.push(punctuation);
      }
    }
    callback(null, chunkStr);
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
    const readStream = createReadStream(filePath, {
      encoding: validatedOptions.encoding,
    });

    pipeline(
      readStream,
      removeAndReplace(/[\r\n]/g, ''),
      removeAndReplace(/[\s]+/g, ' '),
      findAndCount(validatedOptions.mapping!, punctuationStore),
      findWordsPerSentence(count => (wordsPerSent = count)),
      removeAndReplace(/[a-zA-Z\d]+/g, ' ', spaced => (spacedOutBody = spaced))
    )
      .then(() => {
        resolve({
          body: punctuationStore.join(''),
          count: validatedOptions.mapping!,
          wordsPerSentence: wordsPerSent,
          spaced: spacedOutBody,
        });
      })
      .catch(reject);
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
    const pdf = new PDFDocument();
    const writeStream = createWriteStream(newFileName);

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

        writeStream.on('error', reject);
      })
      .catch(reject);
  });
}

// Default export for backward compatibility
export default punc;
