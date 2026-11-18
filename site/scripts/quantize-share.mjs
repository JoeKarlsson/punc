// Shrinks the share cards in site/share/ to 256-color PNGs with pngquant
// (brew install pngquant). Playwright writes truecolor screenshots; the cards
// are flat pink, black and paper, so a palette loses nothing visible and cuts
// the folder by about two thirds, which matters under GitHub Pages' 1 GB cap.
// make-images.mjs runs this after rendering; run it alone to redo existing cards:
//   node site/scripts/quantize-share.mjs
import { execFile, execFileSync } from 'node:child_process';
import { availableParallelism } from 'node:os';
import { open, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const SHARE = 'site/share';
// pngquant's exit code when the quantized file would be bigger than the input.
const SKIPPED_AS_LARGER = 98;
// Byte 25 of a PNG is the IHDR color type; 3 means it already has a palette.
const PALETTE_COLOR_TYPE = 3;

async function hasPalette(path) {
  const file = await open(path);
  try {
    const { buffer } = await file.read(Buffer.alloc(26), 0, 26, 0);
    return buffer[25] === PALETTE_COLOR_TYPE;
  } finally {
    await file.close();
  }
}

export function requirePngquant() {
  try {
    execFileSync('pngquant', ['--version'], { stdio: 'ignore' });
  } catch {
    throw new Error('pngquant is missing; install it with `brew install pngquant` before rendering share cards');
  }
}

async function quantize(path) {
  // Quantizing a palette card again only loses more color.
  if (await hasPalette(path)) return;
  try {
    await promisify(execFile)('pngquant', ['--quality=70-95', '--speed', '1', '--strip', '--skip-if-larger', '--force', '--ext', '.png', path]);
  } catch (error) {
    if (error.code === SKIPPED_AS_LARGER) return;
    throw new Error(`pngquant failed on ${path} (exit ${error.code}): ${error.stderr}`);
  }
}

export async function quantizeShareCards() {
  requirePngquant();
  const queue = (await readdir(SHARE)).filter(name => name.endsWith('.png')).map(name => join(SHARE, name));
  const total = queue.length;
  await Promise.all(
    Array.from({ length: availableParallelism() }, async () => {
      for (let path = queue.pop(); path; path = queue.pop()) await quantize(path);
    })
  );
  return total;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(`Quantized ${await quantizeShareCards()} share cards in ${SHARE}/`);
}
