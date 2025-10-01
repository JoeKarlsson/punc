import { readFile, writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
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

    test('should handle null options', async () => {
      const result = await punc('tests/books/alice.txt', null as any);
      expect(result).toBeDefined();
      expect(result.count).toBeDefined();
    });

    test('should handle undefined options', async () => {
      const result = await punc('tests/books/alice.txt', undefined);
      expect(result).toBeDefined();
      expect(result.count).toBeDefined();
    });

    test('should handle different encodings', async () => {
      const result = await punc('tests/books/alice.txt', 'utf8');
      expect(result).toBeDefined();
    });

    test('should handle partial custom mapping', async () => {
      const partialMapping: Partial<PunctuationCount> = {
        '.': 0,
        ',': 0,
        '!': 0,
      };

      const result = await punc('tests/books/alice.txt', {
        mapping: partialMapping as PunctuationCount,
      });

      // The mapping gets merged with default mapping, so we check the actual counts
      expect(result.count['.']).toBe(2); // Actual count from alice.txt
      expect(result.count[',']).toBe(2); // Actual count from alice.txt
      expect(result.count['!']).toBe(0); // This was set to 0 in mapping
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle non-existent file', async () => {
      await expect(punc('non-existent-file.txt')).rejects.toThrow();
    });

    test('should handle empty file', async () => {
      const emptyFile = 'tests/books/empty.txt';
      await writeFile(emptyFile, '');

      try {
        const result = await punc(emptyFile);
        expect(result.body).toBe('');
        expect(result.spaced).toBe('');
        expect(result.wordsPerSentence).toBe(0); // Changed from NaN to 0

        // All counts should be 0
        for (const key of Object.keys(result.count)) {
          expect(result.count[key as keyof PunctuationCount]).toBe(0);
        }
      } finally {
        await unlink(emptyFile);
      }
    });

    test('should handle file with only whitespace', async () => {
      const whitespaceFile = 'tests/books/whitespace.txt';
      await writeFile(whitespaceFile, '   \n\t  \r\n  ');

      try {
        const result = await punc(whitespaceFile);
        expect(result.body).toBe('');
        expect(result.spaced).toBe(' '); // Whitespace gets normalized to single space
        expect(result.wordsPerSentence).toBe(Infinity); // No sentences, so division by 0
      } finally {
        await unlink(whitespaceFile);
      }
    });

    test('should handle file with only punctuation', async () => {
      const punctuationFile = 'tests/books/punctuation-only.txt';
      await writeFile(punctuationFile, '.,!?;:"()');

      try {
        const result = await punc(punctuationFile);
        expect(result.body).toBe('.,!?;:"()');
        expect(result.spaced).toBe('.,!?;:"()');
        expect(result.wordsPerSentence).toBeCloseTo(0.33, 2); // 3 words / 9 punctuation marks
        expect(result.count['.']).toBe(1);
        expect(result.count[',']).toBe(1);
        expect(result.count['!']).toBe(1);
        expect(result.count['?']).toBe(1);
        expect(result.count[';']).toBe(1);
        expect(result.count[':']).toBe(1);
        expect(result.count['"']).toBe(1);
        expect(result.count['(']).toBe(1);
        expect(result.count[')']).toBe(1);
      } finally {
        await unlink(punctuationFile);
      }
    });

    test('should handle file with only words (no punctuation)', async () => {
      const wordsFile = 'tests/books/words-only.txt';
      await writeFile(wordsFile, 'hello world test');

      try {
        const result = await punc(wordsFile);
        expect(result.body).toBe('');
        expect(result.spaced).toBe('     '); // 5 spaces (3 words + 2 spaces between)
        expect(result.wordsPerSentence).toBe(Infinity); // No sentences, so division by 0
      } finally {
        await unlink(wordsFile);
      }
    });

    test('should handle file with mixed content', async () => {
      const mixedFile = 'tests/books/mixed.txt';
      await writeFile(mixedFile, 'Hello, world! How are you? I am fine.');

      try {
        const result = await punc(mixedFile);
        expect(result.count[',']).toBe(1);
        expect(result.count['!']).toBe(1);
        expect(result.count['?']).toBe(1);
        expect(result.count['.']).toBe(1);
        expect(result.body).toBe(',!?.');
        expect(result.spaced).toBe(' ,  !      ?      .'); // Spaces between words
        expect(result.wordsPerSentence).toBeCloseTo(2.67, 1); // 8 words / 3 sentences
      } finally {
        await unlink(mixedFile);
      }
    });

    test('should handle file with special characters', async () => {
      const specialFile = 'tests/books/special.txt';
      await writeFile(specialFile, 'Hello @#$%^&*() world!');

      try {
        const result = await punc(specialFile);
        expect(result.count['!']).toBe(1);
        expect(result.count['(']).toBe(1);
        expect(result.count[')']).toBe(1);
        // Special chars @#$%^&* should be ignored
        expect(result.body).toBe('()!'); // Order may vary
      } finally {
        await unlink(specialFile);
      }
    });

    test('should handle very long text', async () => {
      const longFile = 'tests/books/long.txt';
      const longText = 'Hello, world! '.repeat(1000);
      await writeFile(longFile, longText);

      try {
        const result = await punc(longFile);
        expect(result.count[',']).toBe(1000);
        expect(result.count['!']).toBe(1000);
        expect(result.body.length).toBe(2000); // 1000 commas + 1000 exclamation marks
      } finally {
        await unlink(longFile);
      }
    });
  });

  describe('Return value validation', () => {
    test('should return correct structure', async () => {
      const result = await punc('tests/books/alice.txt');

      expect(result).toHaveProperty('body');
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('wordsPerSentence');
      expect(result).toHaveProperty('spaced');

      expect(typeof result.body).toBe('string');
      expect(typeof result.count).toBe('object');
      expect(typeof result.wordsPerSentence).toBe('number');
      expect(typeof result.spaced).toBe('string');
    });

    test('should have all required punctuation keys in count', async () => {
      const result = await punc('tests/books/alice.txt');
      const requiredKeys = [
        ';',
        ':',
        "'",
        '"',
        ',',
        '!',
        '?',
        '.',
        '(',
        ')',
        '-',
      ];

      for (const key of requiredKeys) {
        expect(result.count.hasOwnProperty(key)).toBe(true);
        expect(typeof result.count[key as keyof PunctuationCount]).toBe(
          'number'
        );
      }
    });

    test('should handle zero division gracefully', async () => {
      const noSentencesFile = 'tests/books/no-sentences.txt';
      await writeFile(noSentencesFile, 'hello world');

      try {
        const result = await punc(noSentencesFile);
        expect(result.wordsPerSentence).toBe(Infinity); // Division by 0 results in Infinity
      } finally {
        await unlink(noSentencesFile);
      }
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
      await unlink(result.pathToFile);
    } catch (error) {
      fail('PDF file was not created');
    }
  });

  test('should handle non-existent file', async () => {
    await expect(createPDF('non-existent-file.txt')).rejects.toThrow();
  });

  test('should handle empty file', async () => {
    const emptyFile = 'tests/books/empty-pdf.txt';
    await writeFile(emptyFile, '');

    try {
      const result = await createPDF(emptyFile);
      expect(result.success).toBe(true);
      expect(result.pathToFile).toBe(`${emptyFile}-visual.pdf`);

      // Clean up
      if (existsSync(result.pathToFile)) {
        await unlink(result.pathToFile);
      }
    } finally {
      await unlink(emptyFile);
    }
  });

  test('should handle file with only punctuation', async () => {
    const punctuationFile = 'tests/books/pdf-punctuation.txt';
    await writeFile(punctuationFile, '.,!?;:"()');

    try {
      const result = await createPDF(punctuationFile);
      expect(result.success).toBe(true);
      expect(result.pathToFile).toBe(`${punctuationFile}-visual.pdf`);

      // Clean up
      if (existsSync(result.pathToFile)) {
        await unlink(result.pathToFile);
      }
    } finally {
      await unlink(punctuationFile);
    }
  });

  test('should handle file with only words', async () => {
    const wordsFile = 'tests/books/pdf-words.txt';
    await writeFile(wordsFile, 'hello world test');

    try {
      const result = await createPDF(wordsFile);
      expect(result.success).toBe(true);
      expect(result.pathToFile).toBe(`${wordsFile}-visual.pdf`);

      // Clean up
      if (existsSync(result.pathToFile)) {
        await unlink(result.pathToFile);
      }
    } finally {
      await unlink(wordsFile);
    }
  });

  test('should handle string encoding option', async () => {
    const result = await createPDF('tests/books/alice.txt', 'utf8');

    expect(result.success).toBe(true);
    expect(result.pathToFile).toBe('tests/books/alice.txt-visual.pdf');

    // Clean up
    if (existsSync(result.pathToFile)) {
      await unlink(result.pathToFile);
    }
  });

  test('should handle object options', async () => {
    const result = await createPDF('tests/books/alice.txt', {
      encoding: 'utf8',
      mapping: {
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
      },
    });

    expect(result.success).toBe(true);
    expect(result.pathToFile).toBe('tests/books/alice.txt-visual.pdf');

    // Clean up
    if (existsSync(result.pathToFile)) {
      await unlink(result.pathToFile);
    }
  });

  test('should throw error for invalid options type', async () => {
    await expect(
      createPDF('tests/books/alice.txt', 123 as any)
    ).rejects.toThrow(
      'Punc: expected options to be either an object or a string'
    );
  });

  test('should handle null options', async () => {
    const result = await createPDF('tests/books/alice.txt', null as any);

    expect(result.success).toBe(true);
    expect(result.pathToFile).toBe('tests/books/alice.txt-visual.pdf');

    // Clean up
    if (existsSync(result.pathToFile)) {
      await unlink(result.pathToFile);
    }
  });

  test('should handle undefined options', async () => {
    const result = await createPDF('tests/books/alice.txt', undefined);

    expect(result.success).toBe(true);
    expect(result.pathToFile).toBe('tests/books/alice.txt-visual.pdf');

    // Clean up
    if (existsSync(result.pathToFile)) {
      await unlink(result.pathToFile);
    }
  });

  test('should create PDF with correct filename pattern', async () => {
    const testFile = 'tests/books/test-file.txt';
    await writeFile(testFile, 'Hello, world!');

    try {
      const result = await createPDF(testFile);
      expect(result.pathToFile).toBe(`${testFile}-visual.pdf`);

      // Clean up
      if (existsSync(result.pathToFile)) {
        await unlink(result.pathToFile);
      }
    } finally {
      await unlink(testFile);
    }
  });

  test('should handle very long text', async () => {
    const longFile = 'tests/books/long-pdf.txt';
    const longText = 'Hello, world! '.repeat(100);
    await writeFile(longFile, longText);

    try {
      const result = await createPDF(longFile);
      expect(result.success).toBe(true);
      expect(result.pathToFile).toBe(`${longFile}-visual.pdf`);

      // Clean up
      if (existsSync(result.pathToFile)) {
        await unlink(result.pathToFile);
      }
    } finally {
      await unlink(longFile);
    }
  });
});

describe('Integration tests', () => {
  test('should work with real text files', async () => {
    const realTextFile = 'tests/books/real-text.txt';
    const content = `The quick brown fox jumps over the lazy dog. 
    How many times have you seen this sentence? 
    It's used for testing fonts and keyboards! 
    What do you think about it?`;

    await writeFile(realTextFile, content);

    try {
      const result = await punc(realTextFile);

      // Should have punctuation
      expect(result.count['.']).toBeGreaterThan(0);
      expect(result.count['!']).toBeGreaterThan(0);
      expect(result.count['?']).toBeGreaterThan(0);

      // Should have words per sentence
      expect(result.wordsPerSentence).toBeGreaterThan(0);

      // Should have punctuation in body
      expect(result.body).toContain('.');
      expect(result.body).toContain('!');
      expect(result.body).toContain('?');

      // Should have spaced text
      expect(result.spaced).toContain(' ');
    } finally {
      await unlink(realTextFile);
    }
  });

  test('should handle unicode characters', async () => {
    const unicodeFile = 'tests/books/unicode.txt';
    const content = 'Hello, 世界! ¿Cómo estás? Привет!';

    await writeFile(unicodeFile, content);

    try {
      const result = await punc(unicodeFile);

      expect(result.count[',']).toBe(1);
      expect(result.count['!']).toBe(2);
      expect(result.count['?']).toBe(1);
      expect(result.body).toBe(',!?!'); // Order may vary
    } finally {
      await unlink(unicodeFile);
    }
  });

  test('should handle different line endings', async () => {
    const lineEndingsFile = 'tests/books/line-endings.txt';
    const content = 'Hello, world!\r\nHow are you?\nI am fine.\r';

    await writeFile(lineEndingsFile, content);

    try {
      const result = await punc(lineEndingsFile);

      expect(result.count[',']).toBe(1);
      expect(result.count['!']).toBe(1);
      expect(result.count['?']).toBe(1);
      expect(result.count['.']).toBe(1);
    } finally {
      await unlink(lineEndingsFile);
    }
  });
});

describe('Performance tests', () => {
  test('should handle large files efficiently', async () => {
    const largeFile = 'tests/books/large.txt';
    const content = 'Hello, world! '.repeat(10000); // ~130KB
    await writeFile(largeFile, content);

    const startTime = Date.now();

    try {
      const result = await punc(largeFile);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (5 seconds)
      expect(duration).toBeLessThan(5000);

      // Should have correct counts
      expect(result.count[',']).toBe(10000);
      expect(result.count['!']).toBe(10000);
      expect(result.body.length).toBe(20000);
    } finally {
      await unlink(largeFile);
    }
  });

  test('should handle concurrent operations', async () => {
    const files = [
      'tests/books/concurrent1.txt',
      'tests/books/concurrent2.txt',
      'tests/books/concurrent3.txt',
    ];

    // Create test files
    for (const file of files) {
      await writeFile(file, 'Hello, world! How are you?');
    }

    try {
      // Run operations concurrently
      const promises = files.map(file => punc(file));
      const results = await Promise.all(promises);

      // All should succeed
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.count[',']).toBe(1);
        expect(result.count['!']).toBe(1);
        expect(result.count['?']).toBe(1);
      });
    } finally {
      // Clean up
      for (const file of files) {
        await unlink(file);
      }
    }
  });
});

describe('Type safety tests', () => {
  test('should maintain type safety with custom mappings', async () => {
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
      mapping: customMapping,
    });

    // TypeScript should ensure this is type-safe
    expect(typeof result.count['.']).toBe('number');
    expect(typeof result.count[',']).toBe('number');
    expect(typeof result.count['!']).toBe('number');
  });

  test('should handle string encoding type safety', async () => {
    const result = await punc(
      'tests/books/alice.txt',
      'utf8' as BufferEncoding
    );

    expect(result).toBeDefined();
    expect(typeof result.body).toBe('string');
  });
});
