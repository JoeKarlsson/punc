import { readFileSync } from 'node:fs';

// security.txt must not lapse (RFC 9116): renew Expires before this fails.
test('security.txt has a contact and expires more than a month from now', () => {
  const text = readFileSync('site/static/.well-known/security.txt', 'utf8');
  expect(text).toMatch(/^Contact: https:\/\//m);
  const expires = Date.parse(/^Expires: (.+)$/m.exec(text)?.[1] ?? '');
  expect(expires - Date.now()).toBeGreaterThan(30 * 24 * 60 * 60 * 1000);
});
