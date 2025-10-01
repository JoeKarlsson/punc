import { readFile } from 'fs/promises';
import punc, { createPDF, type PunctuationCount } from '../src/index';

describe('Punc', () => {
  describe('Basic functionality', () => {
    test('should exist and be a function', () => {
      expect(typeof punc).toBe('function');
    });

    test('should throw error when filePath is not provided', async () => {
      await expect(punc('')).rejects.toThrow('Punc: file path not given.');
    });

    test('should return a Promise', async () => {
      const result = punc('tests/books/alice.txt');
      expect(result).toBeInstanceOf(Promise);
      
      const resolved = await result;
      expect(resolved).toHaveProperty('body');
      expect(resolved).toHaveProperty('count');
      expect(resolved).toHaveProperty('wordsPerSentence');
      expect(resolved).toHaveProperty('spaced');
    });
  });

  describe('Punctuation counting', () => {
    test('should count punctuation correctly', async () => {
      const expectedCount: PunctuationCount = {
        ';': 2,
        ':': 0,
        "'": 1,
        '"': 2,
        ',': 2,
        '!': 0,
        '?': 0,
        '.': 2,
        '(': 1,
        ')': 0,
        '-': 3,
      };

      const result = await punc('tests/books/alice.txt');
      
      expect(result.count).toBeDefined();
      
      for (const [key, expectedValue] of Object.entries(expectedCount)) {
        expect(result.count[key as keyof PunctuationCount]).toBe(expectedValue);
      }
    });

    test('should return punctuation body correctly', async () => {
      const result = await punc('tests/books/alice.txt');
      expect(result.body).toBe(`-;,.'(-;-.,""`);
    });

    test('should calculate words per sentence correctly', async () => {
      const result = await punc('tests/books/word_count.txt');
      expect(result.wordsPerSentence).toBe(2.5);
    });

    test('should return spaced text correctly', async () => {
      const result = await punc('tests/books/word_count.txt');
      expect(result.spaced).toBe(' .    !      ?        .');
    });
  });

  describe('Options handling', () => {
    test('should handle string encoding option', async () => {
      const result = await punc('tests/books/alice.txt', 'utf8');
      expect(result).toBeDefined();
    });

    test('should handle object options', async () => {
      const customMapping: PunctuationCount = {
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

      const result = await punc('tests/books/alice.txt', {
        encoding: 'utf8',
        mapping: customMapping,
      });

      expect(result.count).toEqual(customMapping);
    });

    test('should throw error for invalid options type', async () => {
      await expect(punc('tests/books/alice.txt', 123 as any)).rejects.toThrow(
        'Punc: expected options to be either an object or a string'
      );
    });
  });
});

describe('createPDF', () => {
  test('should exist and be a function', () => {
    expect(typeof createPDF).toBe('function');
  });

  test('should throw error when filePath is not provided', async () => {
    await expect(createPDF('')).rejects.toThrow('Punc: file path not given.');
  });

  test('should create PDF file successfully', async () => {
    const result = await createPDF('tests/books/alice.txt');
    
    expect(result.success).toBe(true);
    expect(result.pathToFile).toBe('tests/books/alice.txt-visual.pdf');
    
    // Check if file exists
    try {
      await readFile(result.pathToFile);
      // Clean up
      const { unlink } = await import('fs/promises');
      await unlink(result.pathToFile);
    } catch (error) {
      fail('PDF file was not created');
    }
  });
});
