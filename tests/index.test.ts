import punc, {
  createPDF,
  defaultMapping,
  validateOptions,
  getPositions,
  windowedDensity,
  createBarcodeSVG,
  createHeatmapSVG,
  createWaveformSVG,
  createRadialSVG,
  createScoreSVG,
  createSpiralSVG,
} from '../src/index';
import {
  PunctuationCount,
  PuncOptions,
  PuncResult,
  PDFResult,
} from '../src/types';
import { writeFile, unlink, stat } from 'fs/promises';

const HEMINGWAY = '/Users/joekarlsson/Downloads/literature/ernest-hemingway/hemingway_the-sun-also-rises.txt';
const DICKINSON = '/Users/joekarlsson/Downloads/literature/emily-dickinson/emily-dickinson_complete-poems.txt';

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
        expect(result.wordsPerSentence).toBe(2); // 6 words / 3 terminators = 2
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

    test('should count --- mid-sentence', async () => {
      const testFile = 'tests/test-emdash.txt';
      await writeFile(testFile, 'She waited---and waited---for the reply.');

      try {
        const result = await punc(testFile);
        expect(result.count['---']).toBe(2);
      } finally {
        await unlink(testFile);
      }
    });

    test('body should contain repeated pattern sequences', async () => {
      const testFile = 'tests/test-body-repeated.txt';
      await writeFile(testFile, 'Really!!!');

      try {
        const result = await punc(testFile);
        expect(result.body).toContain('!!!');
      } finally {
        await unlink(testFile);
      }
    });

    test('should accept string encoding shorthand', async () => {
      const testFile = 'tests/test-encoding.txt';
      await writeFile(testFile, 'Hello!');

      try {
        const result = await punc(testFile, 'utf8');
        expect(result.count['!']).toBe(1);
      } finally {
        await unlink(testFile);
      }
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

    test('should accept string as encoding shorthand', () => {
      const result = validateOptions('test.txt', 'ascii');
      expect(result.encoding).toBe('ascii');
      expect(result.mapping).toBeDefined();
    });

    test('should throw on empty file path', () => {
      expect(() => validateOptions('')).toThrow('Invalid file path');
    });

    test('should throw on whitespace-only file path', () => {
      expect(() => validateOptions('   ')).toThrow();
    });

    test('should filter out keys not in the default mapping', () => {
      const customMapping = { '!': 5, notASymbol: 99 } as unknown as PunctuationCount;
      const result = validateOptions('test.txt', { mapping: customMapping });
      expect(result.mapping['!']).toBe(5);
      expect('notASymbol' in result.mapping).toBe(false);
    });
  });
});

describe('PDF Generation', () => {
  describe('createPDF function', () => {
    test('should create PDF successfully', async () => {
      const result = await createPDF('tests/books/dream_speech');
      expect(result.success).toBe(true);
      expect(result.pathToFile).toBeDefined();

      const fileInfo = await stat(result.pathToFile);
      expect(fileInfo.size).toBeGreaterThan(0);

      await unlink(result.pathToFile);
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

describe('Analysis — getPositions', () => {
  test('returns positions and totalChars for a simple file', async () => {
    const testFile = 'tests/test-positions.txt';
    await writeFile(testFile, 'Hello! How are you?');
    try {
      const { positions, totalChars } = await getPositions(testFile);
      expect(positions.length).toBe(2);
      expect(positions[0]?.char).toBe('!');
      expect(positions[1]?.char).toBe('?');
      expect(totalChars).toBeGreaterThan(0);
    } finally {
      await unlink(testFile);
    }
  });

  test('offset increases monotonically', async () => {
    const testFile = 'tests/test-offsets.txt';
    await writeFile(testFile, 'A. B? C!');
    try {
      const { positions } = await getPositions(testFile);
      expect(positions.length).toBe(3);
      const offsets = positions.map(p => p.offset);
      expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
    } finally {
      await unlink(testFile);
    }
  });

  test('returns empty positions for a file with no punctuation', async () => {
    const testFile = 'tests/test-no-punct-positions.txt';
    await writeFile(testFile, 'hello world');
    try {
      const { positions } = await getPositions(testFile);
      expect(positions.length).toBe(0);
    } finally {
      await unlink(testFile);
    }
  });
});

describe('Analysis — windowedDensity', () => {
  test('returns the requested number of windows', () => {
    const positions = [
      { char: '.', offset: 10 },
      { char: ',', offset: 50 },
      { char: '!', offset: 90 },
    ];
    const windows = windowedDensity(positions, 100, 10);
    expect(windows.length).toBe(10);
  });

  test('returns empty array for zero-length document', () => {
    expect(windowedDensity([], 0, 10)).toEqual([]);
  });

  test('each window has a density >= 0', () => {
    const positions = [{ char: '.', offset: 5 }];
    const windows = windowedDensity(positions, 100, 5);
    for (const w of windows) {
      expect(w.density).toBeGreaterThanOrEqual(0);
    }
  });

  test('counts sum to total positions', () => {
    const positions = [
      { char: '.', offset: 10 },
      { char: '.', offset: 40 },
      { char: ',', offset: 70 },
    ];
    const windows = windowedDensity(positions, 100, 5);
    const totalCounted = windows.reduce((sum, w) => sum + w.totalPunctuation, 0);
    expect(totalCounted).toBe(3);
  });
});

describe('SVG Rendering Correctness', () => {
  const LIT_FILE = HEMINGWAY;

  test('radial map has non-zero counts after getPositions', async () => {
    const { map } = await getPositions(LIT_FILE);
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    expect(total).toBeGreaterThan(0);
    expect(map['.']).toBeGreaterThan(0);
    expect(map[',']).toBeGreaterThan(0);
  });

  test('radial SVG contains spoke lines (not "No punctuation found")', async () => {
    const result = await createRadialSVG(LIT_FILE);
    expect(result.svg).not.toContain('No punctuation found');
    expect(result.svg).toContain('<line'); // at least one spoke
    expect(result.svg).toContain('<circle'); // at least one tip dot
    await unlink(result.pathToFile);
  }, 30000);

  test('barcode SVG contains rect elements for each position', async () => {
    const testFile = 'tests/test-barcode-rects.txt';
    await writeFile(testFile, 'Hello! World? Fine.');
    let svgPath: string | undefined;
    try {
      const result = await createBarcodeSVG(testFile);
      svgPath = result.pathToFile;
      // 3 punctuation marks → 3 coloured rects (plus 1 background rect)
      const rectCount = (result.svg.match(/<rect/g) ?? []).length;
      expect(rectCount).toBeGreaterThanOrEqual(4); // at least: 1 bg + 3 punctuation stripes
    } finally {
      await unlink(testFile).catch(() => null);
      if (svgPath) await unlink(svgPath).catch(() => null);
    }
  });

  test('heatmap SVG cell count equals window count', async () => {
    const testFile = 'tests/test-heatmap-cells.txt';
    await writeFile(testFile, 'Hello! World? Yes. Fine, really; indeed: great!');
    try {
      const result = await createHeatmapSVG(testFile, { windows: 10 });
      const { positions, totalChars } = await getPositions(testFile);
      const density = windowedDensity(positions, totalChars, 10);
      const rectCount = (result.svg.match(/<rect/g) ?? []).length;
      // background + cells + legend rect(s)
      expect(rectCount).toBeGreaterThanOrEqual(1 + density.length);
      await unlink(result.pathToFile);
    } finally {
      await unlink(testFile);
    }
  });

  test('waveform SVG contains a path per series', async () => {
    const result = await createWaveformSVG(LIT_FILE);
    // 7 series × 2 paths each (area + line) = 14
    const pathCount = (result.svg.match(/<path/g) ?? []).length;
    expect(pathCount).toBe(14);
    await unlink(result.pathToFile);
  }, 30000);

  test('title appears in barcode SVG when set', async () => {
    const testFile = 'tests/test-title-barcode.txt';
    await writeFile(testFile, 'Hello! World?');
    try {
      const result = await createBarcodeSVG(testFile, {
        title: 'My Great Novel',
        subtitle: 'by Joe Karlsson',
      });
      expect(result.svg).toContain('My Great Novel');
      expect(result.svg).toContain('by Joe Karlsson');
      await unlink(result.pathToFile);
    } finally {
      await unlink(testFile);
    }
  });

  test('auto-title is derived from filename when title not provided', async () => {
    const testFile = 'tests/test-auto-title.txt';
    await writeFile(testFile, 'Hello!');
    try {
      const result = await createBarcodeSVG(testFile);
      // filename 'test-auto-title' → 'Test Auto Title'
      expect(result.svg).toContain('Test Auto Title');
      await unlink(result.pathToFile);
    } finally {
      await unlink(testFile);
    }
  });

  test('radial SVG contains glow filter definition', async () => {
    const result = await createRadialSVG(LIT_FILE);
    expect(result.svg).toContain('<filter id="glow"');
    expect(result.svg).toContain('feGaussianBlur');
    await unlink(result.pathToFile);
  }, 30000);

  test('heatmap SVG contains colour-scale legend gradient', async () => {
    const result = await createHeatmapSVG(LIT_FILE);
    expect(result.svg).toContain('id="hm-legend"');
    await unlink(result.pathToFile);
  }, 30000);
});

describe('SVG Visualizations', () => {
  test('createBarcodeSVG writes a file and returns SVG markup', async () => {
    const testFile = 'tests/test-barcode-input.txt';
    await writeFile(testFile, 'Hello! How are you? Fine.');
    try {
      const result = await createBarcodeSVG(testFile);
      expect(result.success).toBe(true);
      expect(result.svg).toContain('<svg');
      expect(result.svg).toContain('</svg>');
      const info = await stat(result.pathToFile);
      expect(info.size).toBeGreaterThan(0);
      await unlink(result.pathToFile);
    } finally {
      await unlink(testFile);
    }
  });

  test('createHeatmapSVG writes a file and returns SVG markup', async () => {
    const testFile = 'tests/test-heatmap-input.txt';
    await writeFile(testFile, 'Hello! How are you? Fine. Really? Yes!');
    try {
      const result = await createHeatmapSVG(testFile);
      expect(result.success).toBe(true);
      expect(result.svg).toContain('<svg');
      const info = await stat(result.pathToFile);
      expect(info.size).toBeGreaterThan(0);
      await unlink(result.pathToFile);
    } finally {
      await unlink(testFile);
    }
  });

  test('createWaveformSVG writes a file and returns SVG markup', async () => {
    const testFile = 'tests/test-waveform-input.txt';
    await writeFile(testFile, 'Hello! How are you? Fine.');
    try {
      const result = await createWaveformSVG(testFile);
      expect(result.success).toBe(true);
      expect(result.svg).toContain('<svg');
      const info = await stat(result.pathToFile);
      expect(info.size).toBeGreaterThan(0);
      await unlink(result.pathToFile);
    } finally {
      await unlink(testFile);
    }
  });

  test('createRadialSVG writes a file and returns SVG markup', async () => {
    const testFile = 'tests/test-radial-input.txt';
    await writeFile(testFile, 'Hello! How are you? Fine.');
    try {
      const result = await createRadialSVG(testFile);
      expect(result.success).toBe(true);
      expect(result.svg).toContain('<svg');
      const info = await stat(result.pathToFile);
      expect(info.size).toBeGreaterThan(0);
      await unlink(result.pathToFile);
    } finally {
      await unlink(testFile);
    }
  });

  test('SVG output respects custom width and height', async () => {
    const testFile = 'tests/test-svg-dims.txt';
    await writeFile(testFile, 'Hello! World?');
    try {
      const result = await createBarcodeSVG(testFile, { width: 600, height: 100 });
      expect(result.svg).toContain('width="600"');
      expect(result.svg).toContain('height="100"');
      await unlink(result.pathToFile);
    } finally {
      await unlink(testFile);
    }
  });

  test('SVG respects custom outputPath', async () => {
    const testFile = 'tests/test-svg-outpath.txt';
    const outFile = 'tests/custom-output.svg';
    await writeFile(testFile, 'Hello!');
    try {
      const result = await createBarcodeSVG(testFile, { outputPath: outFile });
      expect(result.pathToFile).toBe(outFile);
      const info = await stat(outFile);
      expect(info.size).toBeGreaterThan(0);
      await unlink(outFile);
    } finally {
      await unlink(testFile);
    }
  });

  test('SVG handles file with no punctuation gracefully', async () => {
    const testFile = 'tests/test-svg-nopunct.txt';
    await writeFile(testFile, 'hello world no punctuation here');
    try {
      const radial = await createRadialSVG(testFile);
      expect(radial.svg).toContain('No punctuation found');
      await unlink(radial.pathToFile);
      const barcode = await createBarcodeSVG(testFile);
      expect(barcode.svg).toContain('<svg');
      await unlink(barcode.pathToFile);
    } finally {
      await unlink(testFile);
    }
  });
});

describe('Literature — Hemingway vs Dickinson', () => {
  test('Hemingway: comma-heavy prose (commas > exclamations)', async () => {
    const result = await punc(HEMINGWAY);
    expect(result.count[',']).toBeGreaterThan(result.count['!']);
    expect(result.count['.']).toBeGreaterThan(0);
  });

  test('Dickinson: dash-heavy poetry (dashes recorded)', async () => {
    const result = await punc(DICKINSON);
    expect(result.count['-']).toBeGreaterThan(0);
  });

  test('getPositions returns thousands of positions for a novel', async () => {
    const { positions } = await getPositions(HEMINGWAY);
    expect(positions.length).toBeGreaterThan(5000);
  });

  test('windowedDensity produces 100 windows for Hemingway', async () => {
    const { positions, totalChars } = await getPositions(HEMINGWAY);
    const windows = windowedDensity(positions, totalChars, 100);
    expect(windows.length).toBe(100);
    expect(windows.every(w => w.density >= 0)).toBe(true);
  });

  test('createBarcodeSVG works on a full novel', async () => {
    const result = await createBarcodeSVG(HEMINGWAY);
    expect(result.success).toBe(true);
    const info = await stat(result.pathToFile);
    expect(info.size).toBeGreaterThan(10_000);
    await unlink(result.pathToFile);
  }, 30000);

  test('createHeatmapSVG works on a full poetry collection', async () => {
    const result = await createHeatmapSVG(DICKINSON);
    expect(result.success).toBe(true);
    const info = await stat(result.pathToFile);
    expect(info.size).toBeGreaterThan(1000);
    await unlink(result.pathToFile);
  }, 30000);

  test('createWaveformSVG works on Hemingway', async () => {
    const result = await createWaveformSVG(HEMINGWAY);
    expect(result.success).toBe(true);
    await unlink(result.pathToFile);
  }, 30000);

  test('createRadialSVG works on Dickinson', async () => {
    const result = await createRadialSVG(DICKINSON);
    expect(result.success).toBe(true);
    await unlink(result.pathToFile);
  }, 30000);
});

describe('SVG Rendering Correctness — Score & Spiral', () => {
  test('score SVG contains circle or text elements for marks', async () => {
    const testFile = 'tests/test-score-render.txt';
    await writeFile(testFile, 'Hello! How are you? Fine, really.');
    try {
      const result = await createScoreSVG(testFile);
      expect(result.svg).toContain('<svg');
      // should have marks — either circle dots or text glyphs
      const hasMarks = result.svg.includes('<circle') || result.svg.includes('<text');
      expect(hasMarks).toBe(true);
      await unlink(result.pathToFile);
    } finally {
      await unlink(testFile);
    }
  });

  test('score SVG contains legend items', async () => {
    const testFile = 'tests/test-score-legend.txt';
    await writeFile(testFile, 'Hello! World?');
    try {
      const result = await createScoreSVG(testFile);
      expect(result.svg).toContain('reading order');
      await unlink(result.pathToFile);
    } finally {
      await unlink(testFile);
    }
  });

  test('score SVG shows "No punctuation found" for clean text', async () => {
    const testFile = 'tests/test-score-nopunct.txt';
    await writeFile(testFile, 'hello world no punctuation here');
    try {
      const result = await createScoreSVG(testFile);
      expect(result.svg).toContain('No punctuation found');
      await unlink(result.pathToFile);
    } finally {
      await unlink(testFile);
    }
  });

  test('score SVG includes title and subtitle', async () => {
    const testFile = 'tests/test-score-title.txt';
    await writeFile(testFile, 'Hello! World?');
    try {
      const result = await createScoreSVG(testFile, {
        title: 'Test Score',
        subtitle: 'subtitle here',
      });
      expect(result.svg).toContain('Test Score');
      expect(result.svg).toContain('subtitle here');
      await unlink(result.pathToFile);
    } finally {
      await unlink(testFile);
    }
  });

  test('spiral SVG contains guide spiral path', async () => {
    const testFile = 'tests/test-spiral-render.txt';
    await writeFile(testFile, 'Hello! How are you? Fine, really.');
    try {
      const result = await createSpiralSVG(testFile);
      expect(result.svg).toContain('<svg');
      expect(result.svg).toContain('<path'); // guide spiral
      expect(result.svg).toContain('<text transform='); // rotated marks
      await unlink(result.pathToFile);
    } finally {
      await unlink(testFile);
    }
  });

  test('spiral SVG contains text elements for each mark', async () => {
    const testFile = 'tests/test-spiral-dots.txt';
    await writeFile(testFile, 'Hello! World? Yes.');
    try {
      const result = await createSpiralSVG(testFile);
      // marks are now rotated <text> elements, not circles
      expect(result.svg).toContain('<text transform=');
      await unlink(result.pathToFile);
    } finally {
      await unlink(testFile);
    }
  });

  test('spiral SVG shows "No punctuation found" for clean text', async () => {
    const testFile = 'tests/test-spiral-nopunct.txt';
    await writeFile(testFile, 'hello world no punctuation here');
    try {
      const result = await createSpiralSVG(testFile);
      expect(result.svg).toContain('No punctuation found');
      await unlink(result.pathToFile);
    } finally {
      await unlink(testFile);
    }
  });

  test('createScoreSVG works on a full novel', async () => {
    const result = await createScoreSVG(HEMINGWAY, {
      title: 'The Sun Also Rises',
      subtitle: 'Ernest Hemingway · 1926',
    });
    expect(result.success).toBe(true);
    const info = await stat(result.pathToFile);
    expect(info.size).toBeGreaterThan(10_000);
    await unlink(result.pathToFile);
  }, 60000);

  test('format: png writes a .png file instead of .svg', async () => {
    const testFile = 'tests/test-png-export.txt';
    await writeFile(testFile, 'Hello! World? Yes, indeed.');
    try {
      const result = await createBarcodeSVG(testFile, { format: 'png' });
      expect(result.pathToFile.endsWith('.png')).toBe(true);
      const info = await stat(result.pathToFile);
      expect(info.size).toBeGreaterThan(0);
      await unlink(result.pathToFile);
    } finally {
      await unlink(testFile);
    }
  });

  test('createSpiralSVG works on a full poetry collection', async () => {
    const result = await createSpiralSVG(DICKINSON, {
      title: 'Complete Poems',
      subtitle: 'Emily Dickinson · 1890–1896',
    });
    expect(result.success).toBe(true);
    const info = await stat(result.pathToFile);
    expect(info.size).toBeGreaterThan(10_000);
    await unlink(result.pathToFile);
  }, 60000);
});
