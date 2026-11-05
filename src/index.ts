// Main entry point for the punc library
// Re-export all types and functions from their respective modules

// Export types
export type {
  PunctuationCount,
  PuncOptions,
  PuncResult,
  PDFResult,
  PuncPosition,
  DensityWindow,
  SVGOptions,
  SVGResult,
} from './types';

// Export main functions
export { punc } from './punc';
export { createPDF } from './pdf';

// Export analysis functions
export { getPositions, windowedDensity } from './analysis';
export { analyzeText, countWords, wordsPerSentence } from './text';
export { spiralLayout } from './layout';

// Export SVG visualization functions
export { createBarcodeSVG, createHeatmapSVG, createWaveformSVG, createRadialSVG, createScoreSVG, createSpiralSVG } from './svg';

// Export utility functions
export { defaultMapping } from './mapping';
export { validateOptions } from './validation';

// Default export for backward compatibility
export { punc as default } from './punc';
