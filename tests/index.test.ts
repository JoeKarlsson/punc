import punc, { createPDF, defaultMapping, validateOptions } from '../src/index';
import {
  PunctuationCount,
  PuncOptions,
  PuncResult,
  PDFResult,
} from '../src/types';

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

  describe('Basic functionality verification', () => {
    test('should work with basic text file', async () => {
      const result = await punc('tests/books/alice.txt');
      expect(result).toBeDefined();
      expect(result.body).toBeDefined();
      expect(result.count).toBeDefined();
      expect(result.wordsPerSentence).toBeDefined();
      expect(result.spaced).toBeDefined();
    });

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

    test('should validate options correctly', () => {
      const result = validateOptions('test.txt', { encoding: 'utf8' });
      expect(result.encoding).toBe('utf8');
      expect(result.mapping).toBeDefined();
    });

    test('should create default mapping', () => {
      const mapping = defaultMapping();
      expect(mapping).toBeDefined();
      expect(typeof mapping).toBe('object');
      expect(mapping['!']).toBe(0);
      expect(mapping['?']).toBe(0);
      expect(mapping['.']).toBe(0);
    });
  });
});
