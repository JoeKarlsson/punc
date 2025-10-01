import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { PuncOptions, PuncResult } from './types';
import { validateOptions } from './validation';
import {
  removeAndReplace,
  findAndCount,
  findWordsPerSentence,
} from './streams';

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
