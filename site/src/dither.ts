// Two-tone Atkinson dithering for the gig-poster covers: every pixel ends up
// hot pink or black. Pure function over RGBA pixels, so it can be unit tested.

export type RGB = readonly [number, number, number];

export const POSTER_PINK: RGB = [255, 79, 216];
export const POSTER_INK: RGB = [0, 0, 0];

export interface DitherOptions {
  // Pushes grays toward black or white before dithering; 1 leaves them alone
  contrast?: number;
  light?: RGB;
  dark?: RGB;
}

// Atkinson spreads 6/8 of each pixel's error to six neighbors and drops the
// rest, which blows out highlights and crushes shadows: a photocopier look.
const NEIGHBORS: Array<[dx: number, dy: number]> = [[1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]];

export function ditherTwoTone(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  { contrast = 1.7, light = POSTER_PINK, dark = POSTER_INK }: DitherOptions = {}
): void {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    const lum = 0.2126 * rgba[i * 4]! + 0.7152 * rgba[i * 4 + 1]! + 0.0722 * rgba[i * 4 + 2]!;
    gray[i] = (lum - 128) * contrast + 128;
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const isLight = gray[i]! >= 128;
      const error = (gray[i]! - (isLight ? 255 : 0)) / 8;
      for (const [dx, dy] of NEIGHBORS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny < height) gray[ny * width + nx]! += error;
      }
      const [r, g, b] = isLight ? light : dark;
      rgba[i * 4] = r;
      rgba[i * 4 + 1] = g;
      rgba[i * 4 + 2] = b;
      rgba[i * 4 + 3] = 255;
    }
  }
}
