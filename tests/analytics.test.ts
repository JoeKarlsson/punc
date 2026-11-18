import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Runs site/static/analytics.js against a stand-in browser and returns what it sent to Plausible
function loadAnalytics() {
  const listeners: Record<string, (e: unknown) => void> = {};
  const sent: unknown[][] = [];
  const window = {
    plausible: (...args: unknown[]) => sent.push(args),
    addEventListener: (type: string, fn: (e: unknown) => void) => (listeners[type] = fn),
  };
  runInNewContext(readFileSync('site/static/analytics.js', 'utf8'), {
    window,
    navigator: { webdriver: false, userAgent: 'Mozilla/5.0 Firefox/140.0', languages: ['en-US'] },
    document: { createElement: () => ({ dataset: {} }), head: { appendChild: () => undefined }, body: { dataset: {} } },
    location: { pathname: '/books/emma/' },
  });
  return { sent, fire: (type: string, e: unknown) => listeners[type]!(e) };
}

describe('analytics.js JS Error events', () => {
  test('reports only the first error on a page', () => {
    const { sent, fire } = loadAnalytics();
    fire('error', { message: 'boom', filename: 'https://punc.joekarlsson.com/assets/reader.js', lineno: 4 });
    fire('error', { message: 'boom again', filename: 'https://punc.joekarlsson.com/assets/reader.js', lineno: 4 });
    expect(sent).toEqual([
      ['JS Error', { props: { message: 'boom', source: 'https://punc.joekarlsson.com/assets/reader.js:4', path: '/books/emma/' } }],
    ]);
  });

  test('skips errors from browser extensions, so a later real one still gets reported', () => {
    const { sent, fire } = loadAnalytics();
    fire('error', { message: 'x is null', filename: 'chrome-extension://abc/content.js', lineno: 1 });
    fire('unhandledrejection', { reason: { message: 'nope', stack: 'at f (moz-extension://abc/x.js:1:2)' } });
    fire('error', { message: `Failed to execute 'createPolicy' on 'TrustedTypePolicyFactory': Policy "dompurify" disallowed.`, filename: '', lineno: 0 });
    expect(sent).toEqual([]);
    fire('unhandledrejection', { reason: { message: 'fetch failed' } });
    expect(sent).toEqual([['JS Error', { props: { message: 'fetch failed', source: 'promise', path: '/books/emma/' } }]]);
  });
});
