import { PunctuationCount } from './types';

// Default punctuation mapping with all supported characters
export function defaultMapping(): PunctuationCount {
  return {
    // Basic punctuation
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

    // Unicode symbols
    '★': 0,
    '♥': 0,
    '♦': 0,
    '♠': 0,
    '♣': 0,
    '→': 0,
    '←': 0,
    '↑': 0,
    '↓': 0,
    '∞': 0,
    '§': 0,
    '¶': 0,

    // Repeated punctuation
    '!!!': 0,
    '???': 0,
    '...': 0,
    '---': 0,

    // Math operators
    '+': 0,
    '*': 0,
    '/': 0,
    '=': 0,
    '≠': 0,
    '≤': 0,
    '≥': 0,
    '±': 0,
    '×': 0,
    '÷': 0,

    // Currency
    $: 0,
    '€': 0,
    '£': 0,
    '¥': 0,
    '¢': 0,

    // Percent and degree
    '%': 0,
    '°': 0,

    // Copyright/Trademark
    '©': 0,
    '®': 0,
    '™': 0,

    // Musical notes
    '♪': 0,
    '♫': 0,
    '♬': 0,
    '♭': 0,
    '♯': 0,

    // Arrows
    '↔': 0,
    '↕': 0,
    '↗': 0,
    '↘': 0,
    '↙': 0,
    '↖': 0,

    // Geometric shapes
    '○': 0,
    '●': 0,
    '□': 0,
    '■': 0,
    '△': 0,
    '▲': 0,
    '▽': 0,
    '▼': 0,

    // Lines and borders
    '│': 0,
    '─': 0,
    '┌': 0,
    '┐': 0,
    '└': 0,
    '┘': 0,
    '├': 0,
    '┤': 0,
    '┬': 0,
    '┴': 0,

    // International punctuation
    '¿': 0, // Spanish
    '¡': 0, // Spanish
    '؟': 0, // Arabic
    '،': 0, // Arabic
    '؛': 0, // Arabic
    '，': 0, // Chinese
    '。': 0, // Chinese
    '；': 0, // Chinese
    '：': 0, // Chinese
    '？': 0, // Chinese
    '！': 0, // Chinese

    // Programming & Technical
    '[': 0,
    ']': 0,
    '{': 0,
    '}': 0,
    '<': 0,
    '>': 0,
    '`': 0,
    '|': 0,
    '\\': 0,
    '~': 0,
    '^': 0,
    '&': 0,
    '@': 0,
    '#': 0,

    // Visual & Decorative
    '☆': 0,
    '✦': 0,
    '✧': 0,
    '♡': 0,
    '❤': 0,
    '💙': 0,
    '💚': 0,
    '💛': 0,
    '💜': 0,
    '✓': 0,
    '✔': 0,
    '☑': 0,
    '✗': 0,
    '✘': 0,
    '☒': 0,
  };
}
