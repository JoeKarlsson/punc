import punc, { createPDF, defaultMapping, validateOptions } from '../src/index';
import {
  PunctuationCount,
  PuncOptions,
  PuncResult,
  PDFResult,
} from '../src/types';
import { writeFile, unlink } from 'fs/promises';

describe('Main Exports', () => {
  describe('Default export', () => {
    test('should export punc as default', () => {
      expect(typeof punc).toBe('function');
    });
  });

  describe('Named exports', () => {
    test('should export createPDF function', () => {
      expect(typeof createPDF).toBe('function');
    });

    test('should export defaultMapping function', () => {
      expect(typeof defaultMapping).toBe('function');
    });

    test('should export validateOptions function', () => {
      expect(typeof validateOptions).toBe('function');
    });
  });

  describe('Type exports', () => {
    test('should export PunctuationCount type', () => {
      const mapping: PunctuationCount = { '!': 0 } as PunctuationCount;
      expect(typeof mapping).toBe('object');
    });

    test('should export PuncOptions type', () => {
      const options: PuncOptions = { encoding: 'utf8' };
      expect(typeof options).toBe('object');
    });

    test('should export PuncResult type', () => {
      const result: PuncResult = {
        body: 'test',
        count: {} as PunctuationCount,
        wordsPerSentence: 0,
        spaced: 'test',
      };
      expect(typeof result).toBe('object');
    });

    test('should export PDFResult type', () => {
      const result: PDFResult = {
        success: true,
        pathToFile: 'test.pdf',
      };
      expect(typeof result).toBe('object');
    });
  });
});

describe('Core Functionality', () => {
  describe('punc function', () => {
    test('should work with basic text file', async () => {
      const result = await punc('tests/books/alice.txt');
      expect(result).toBeDefined();
      expect(result.body).toBeDefined();
      expect(result.count).toBeDefined();
      expect(result.wordsPerSentence).toBeDefined();
      expect(result.spaced).toBeDefined();
    });

    test('should count basic punctuation correctly', async () => {
      const testFile = 'tests/test-basic.txt';
      await writeFile(testFile, 'Hello! How are you? Fine.');

      try {
        const result = await punc(testFile);
        expect(result.count['!']).toBe(1);
        expect(result.count['?']).toBe(1);
        expect(result.count['.']).toBe(1);
        expect(result.spaced).toBe(' !      ?  .');
      } finally {
        await unlink(testFile);
      }
    });

    test('should count repeated punctuation patterns', async () => {
      const testFile = 'tests/test-repeated.txt';
      await writeFile(testFile, 'Wow!!! Really??? Yes...');

      try {
        const result = await punc(testFile);
        expect(result.count['!!!']).toBe(1);
        expect(result.count['???']).toBe(1);
        expect(result.count['...']).toBe(1);
      } finally {
        await unlink(testFile);
      }
    });

    test('should handle unicode punctuation', async () => {
      const testFile = 'tests/test-unicode.txt';
      await writeFile(testFile, '★♥→ ¿Cómo estás? ¡Bien!');

      try {
        const result = await punc(testFile);
        expect(result.count['★']).toBe(1);
        expect(result.count['♥']).toBe(1);
        expect(result.count['→']).toBe(1);
        expect(result.count['¿']).toBe(1);
        expect(result.count['¡']).toBe(1);
      } finally {
        await unlink(testFile);
      }
    });

    test('should handle programming symbols', async () => {
      const testFile = 'tests/test-programming.txt';
      await writeFile(
        testFile,
        'function() { return [1, 2, 3]; } <div>Hello</div>'
      );

      try {
        const result = await punc(testFile);
        expect(result.count['[']).toBe(1);
        expect(result.count[']']).toBe(1);
        expect(result.count['{']).toBe(1);
        expect(result.count['}']).toBe(1);
        expect(result.count['<']).toBe(2);
        expect(result.count['>']).toBe(2);
      } finally {
        await unlink(testFile);
      }
    });

    test('should calculate words per sentence correctly', async () => {
      const testFile = 'tests/test-words.txt';
      await writeFile(testFile, 'Hello world. How are you? Fine.');

      try {
        const result = await punc(testFile);
        expect(result.wordsPerSentence).toBe(2); // 4 words / 2 sentences = 2
      } finally {
        await unlink(testFile);
      }
    });

    test('should handle empty file', async () => {
      const testFile = 'tests/test-empty.txt';
      await writeFile(testFile, '');

      try {
        const result = await punc(testFile);
        expect(result.body).toBe('');
        expect(result.spaced).toBe('');
        expect(result.wordsPerSentence).toBe(0);
      } finally {
        await unlink(testFile);
      }
    });

    test('should handle file with no punctuation', async () => {
      const testFile = 'tests/test-no-punct.txt';
      await writeFile(testFile, 'Hello world how are you');

      try {
        const result = await punc(testFile);
        expect(result.count['!']).toBe(0);
        expect(result.count['?']).toBe(0);
        expect(result.count['.']).toBe(0);
        expect(result.wordsPerSentence).toBe(Infinity);
      } finally {
        await unlink(testFile);
      }
    });

    test('should handle large files', async () => {
      const testFile = 'tests/test-large.txt';
      const largeText = 'Hello! '.repeat(1000) + 'How are you? '.repeat(1000);
      await writeFile(testFile, largeText);

      try {
        const result = await punc(testFile);
        expect(result.count['!']).toBe(1000);
        expect(result.count['?']).toBe(1000);
        expect(result.body.length).toBeGreaterThanOrEqual(2000);
      } finally {
        await unlink(testFile);
      }
    });

    test('should handle non-existent file', async () => {
      await expect(punc('non-existent-file.txt')).rejects.toThrow();
    });
  });

  describe('defaultMapping function', () => {
    test('should create default mapping', () => {
      const mapping = defaultMapping();
      expect(mapping).toBeDefined();
      expect(typeof mapping).toBe('object');
      expect(mapping['!']).toBe(0);
      expect(mapping['?']).toBe(0);
      expect(mapping['.']).toBe(0);
    });

    test('should have all required punctuation keys', () => {
      const mapping = defaultMapping();
      expect('[' in mapping).toBe(true);
      expect(']' in mapping).toBe(true);
      expect('{' in mapping).toBe(true);
      expect('}' in mapping).toBe(true);
      expect('(' in mapping).toBe(true);
      expect(')' in mapping).toBe(true);
      expect('"' in mapping).toBe(true);
      expect("'" in mapping).toBe(true);
      expect(';' in mapping).toBe(true);
      expect(':' in mapping).toBe(true);
      expect(',' in mapping).toBe(true);
      expect('!!!' in mapping).toBe(true);
      expect('???' in mapping).toBe(true);
      expect('...' in mapping).toBe(true);
      expect('---' in mapping).toBe(true);
    });

    test('should initialize all values to 0', () => {
      const mapping = defaultMapping();
      Object.values(mapping).forEach(value => {
        expect(value).toBe(0);
      });
    });
  });

  describe('validateOptions function', () => {
    test('should validate options correctly', () => {
      const result = validateOptions('test.txt', { encoding: 'utf8' });
      expect(result.encoding).toBe('utf8');
      expect(result.mapping).toBeDefined();
    });

    test('should use default options when none provided', () => {
      const result = validateOptions('test.txt');
      expect(result.encoding).toBe('utf8');
      expect(result.mapping).toBeDefined();
    });

    test('should merge custom mapping with default mapping', () => {
      const customMapping = { '!': 0, '?': 0 } as PunctuationCount;
      const result = validateOptions('test.txt', { mapping: customMapping });
      expect(result.mapping['!']).toBe(0);
      expect(result.mapping['?']).toBe(0);
      expect(result.mapping['.']).toBe(0); // Should have default keys too
      expect(Object.keys(result.mapping).length).toBeGreaterThan(2);
    });
  });
});

describe('PDF Generation', () => {
  describe('createPDF function', () => {
    test('should create PDF successfully', async () => {
      const result = await createPDF('tests/books/dream_speech');
      expect(result.success).toBe(true);
      expect(result.pathToFile).toBeDefined();

      // Clean up
      const fs = await import('fs/promises');
      try {
        await fs.unlink(result.pathToFile);
      } catch (error) {
        // File might not exist, ignore error
      }
    });

    test('should create PDF with custom options', async () => {
      const result = await createPDF('tests/books/dream_speech', {
        fontSize: 14,
        lineHeight: 1.5,
        margin: 20,
      });
      expect(result.success).toBe(true);
      expect(result.pathToFile).toBeDefined();

      // Clean up
      const fs = await import('fs/promises');
      try {
        await fs.unlink(result.pathToFile);
      } catch (error) {
        // File might not exist, ignore error
      }
    });

    test('should handle non-existent file', async () => {
      await expect(createPDF('non-existent-file.txt')).rejects.toThrow();
    });

    test('should create PDF from test files', async () => {
      const testFile = 'tests/test-pdf.txt';
      await writeFile(testFile, 'Hello! How are you? Fine.');

      try {
        const result = await createPDF(testFile);
        expect(result.success).toBe(true);
        expect(result.pathToFile).toBeDefined();

        // Clean up PDF
        const fs = await import('fs/promises');
        try {
          await fs.unlink(result.pathToFile);
        } catch (error) {
          // File might not exist, ignore error
        }
      } finally {
        await unlink(testFile);
      }
    });
  });
});

describe('Integration Tests', () => {
  test('should work with Alice in Wonderland', async () => {
    const result = await punc('tests/books/alice.txt');
    expect(result.body.length).toBeGreaterThan(10);
    expect(result.wordsPerSentence).toBeGreaterThan(0);
    expect(result.count).toBeDefined();
  });

  test('should work with dream speech', async () => {
    const result = await punc('tests/books/dream_speech');
    expect(result.body.length).toBeGreaterThan(100);
    expect(result.wordsPerSentence).toBeGreaterThan(0);
    expect(result.count).toBeDefined();
  });

  test('should work with word count file', async () => {
    const result = await punc('tests/books/word_count.txt');
    expect(result.body).toBeDefined();
    expect(result.count).toBeDefined();
  });
});
