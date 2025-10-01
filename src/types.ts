// Types and interfaces for the punc library
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
