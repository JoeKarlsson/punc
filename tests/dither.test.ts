import { ditherTwoTone, POSTER_INK, POSTER_PINK } from '../site/src/dither';

function image(width: number, height: number, gray: (x: number, y: number) => number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      rgba.fill(gray(x, y), i, i + 3);
      rgba[i + 3] = 255;
    }
  return rgba;
}

const colorsIn = (rgba: Uint8ClampedArray) => {
  const seen = new Set<string>();
  for (let i = 0; i < rgba.length; i += 4) seen.add(`${rgba[i]},${rgba[i + 1]},${rgba[i + 2]}`);
  return seen;
};

describe('ditherTwoTone', () => {
  test('leaves only pink and black', () => {
    const rgba = image(40, 30, x => x * 6);
    ditherTwoTone(rgba, 40, 30);
    expect(colorsIn(rgba)).toEqual(new Set([POSTER_PINK.join(','), POSTER_INK.join(',')]));
  });

  test('white goes pink, black stays black', () => {
    const white = image(8, 8, () => 255);
    ditherTwoTone(white, 8, 8);
    expect(colorsIn(white)).toEqual(new Set([POSTER_PINK.join(',')]));
    const black = image(8, 8, () => 0);
    ditherTwoTone(black, 8, 8);
    expect(colorsIn(black)).toEqual(new Set([POSTER_INK.join(',')]));
  });

  test('a mid gray comes out as a mix of dots, not one flat color', () => {
    const rgba = image(32, 32, () => 128);
    ditherTwoTone(rgba, 32, 32, { contrast: 1 });
    let pink = 0;
    for (let i = 0; i < rgba.length; i += 4) if (rgba[i] === POSTER_PINK[0]) pink++;
    expect(pink / (32 * 32)).toBeGreaterThan(0.3);
    expect(pink / (32 * 32)).toBeLessThan(0.7);
  });
});
