import { analyzeText } from '../src/text';
import { scanTokens } from '../site/src/scanner';

describe('the front page scanner', () => {
  test('lights the same marks Punc counts, curly quotes, dashes and apostrophes included', () => {
    const passage = '“It’s late—very late,” she said.\nNo $5 & no 3.5%!';
    const tokens = scanTokens(passage);
    const lit = tokens.flatMap(t => (t.kind === 'mark' ? [t.mark] : []));
    expect(lit).toEqual(analyzeText(passage).positions.map(p => p.char));
    expect(tokens.filter(t => t.kind === 'word').map(t => t.text)).toEqual(['It', 's', 'late', 'very', 'late', 'she', 'said', 'No', '5', 'no', '3', '5']);
    expect(tokens.filter(t => t.kind === 'break')).toHaveLength(1);
    // Every character is kept, so the page reads as the book
    expect(tokens.map(t => t.text).join('')).toBe(passage.replace(/ +/g, ' '));
  });
});
