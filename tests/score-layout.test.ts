import { scoreLayout } from '../site/src/canvas';

describe('scoreLayout', () => {
  test('marks stay the same size, so a longer book is a taller score', () => {
    const short = scoreLayout(1440, 5_000);
    const long = scoreLayout(1440, 73_476);
    expect(long.cell).toBe(short.cell);
    expect(long.cols).toBe(short.cols);
    expect(long.height).toBeGreaterThan(short.height * 10);
    expect(long.cols * long.rows).toBeGreaterThanOrEqual(73_476);
  });

  test('a phone gets its own columns, not a computer layout shrunk to fit', () => {
    const phone = scoreLayout(390, 73_476);
    expect(phone.cell).toBe(12);
    expect(phone.cols).toBe(Math.floor((390 - 32) / 12));
    expect(phone.rows).toBe(Math.ceil(73_476 / phone.cols));
  });
});
