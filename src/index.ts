// Main entry point for the punc library
// Re-export all types and functions from their respective modules

// Export types
export type {
  PunctuationCount,
  PuncOptions,
  PuncResult,
  PDFResult,
} from './types';

// Export main functions
export { punc } from './punc';
export { createPDF } from './pdf';

// Export utility functions
export { defaultMapping } from './mapping';
export { validateOptions } from './validation';

// Default export for backward compatibility
export { punc as default } from './punc';
