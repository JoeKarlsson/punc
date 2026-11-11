// Counting a book and erasing it into pages take hundreds of milliseconds on a phone
// (seconds for a big upload), so reader.ts runs them here, off the main thread.
import { analyzeBook, erasedPages } from './analyze';

export type AnalyzeJob = { kind: 'analyze'; text: string } | { kind: 'pages'; text: string };

addEventListener('message', (event: MessageEvent<AnalyzeJob>) => {
  const { kind, text } = event.data;
  postMessage(kind === 'analyze' ? analyzeBook(text) : erasedPages(text));
});
