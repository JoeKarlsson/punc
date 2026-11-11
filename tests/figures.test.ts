import { durationSeconds } from '../site/src/figures';

describe('durationSeconds', () => {
  it('reads seconds and milliseconds', () => {
    expect(durationSeconds('9.5s')).toBe(9.5);
    expect(durationSeconds('800ms')).toBe(0.8);
  });

  it('refuses a duration it cannot read rather than guessing', () => {
    expect(() => durationSeconds('indefinite')).toThrow('Unreadable');
    expect(() => durationSeconds(null)).toThrow('Unreadable');
  });
});
