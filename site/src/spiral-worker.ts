// Paints the spiral for canvas.ts off the main thread and hands back finished pictures.
import { spiralLayout, type SpiralLayout } from '../../src/layout';
import { paintSpiral, type SpiralColors } from './canvas';

export type SpiralJob =
  | { kind: 'book'; marks: string[]; size: number; colors: SpiralColors }
  | {
      kind: 'paint';
      id: number;
      scale: number;
      offsetX: number;
      offsetY: number;
      width: number;
      height: number;
    };
export interface SpiralPainted {
  id: number;
  bitmap: ImageBitmap;
}

// A worker can't see the page's fonts; without this the marks fall back to the browser's serif.
const fonts = (self as unknown as { fonts?: FontFaceSet }).fonts;
const fraunces = new FontFace(
  'Fraunces',
  `url(${new URL('../fonts/fraunces-latin.woff2', self.location.href).href})`
);
const fontReady = fonts
  ? fraunces.load().then(
      face => void fonts.add(face),
      // Same as the page when a content blocker stops the font: draw in the fallback.
      () => undefined
    )
  : Promise.resolve();

let book:
  | { marks: string[]; layout: SpiralLayout; colors: SpiralColors }
  | undefined;
let latest: Extract<SpiralJob, { kind: 'paint' }> | undefined;
let painting = false;

// Only the newest request is painted: views that went by during a paint are skipped.
async function paintLatest(): Promise<void> {
  painting = true;
  try {
    await fontReady;
    while (latest && book) {
      const job = latest;
      latest = undefined;
      const canvas = new OffscreenCanvas(job.width, job.height);
      const ctx = canvas.getContext('2d');
      if (!ctx)
        throw new Error("This browser couldn't open a 2D canvas in a worker");
      paintSpiral(
        ctx,
        book.marks,
        book.layout,
        book.colors,
        job.scale,
        job.offsetX,
        job.offsetY,
        job.width,
        job.height
      );
      const bitmap = canvas.transferToImageBitmap();
      postMessage({ id: job.id, bitmap } satisfies SpiralPainted, {
        transfer: [bitmap],
      });
      // Let requests that queued up during the paint arrive before picking the next.
      await new Promise(resolve => setTimeout(resolve));
    }
  } finally {
    painting = false;
  }
}

addEventListener('message', (event: MessageEvent<SpiralJob>) => {
  const job = event.data;
  if (job.kind === 'book') {
    book = {
      marks: job.marks,
      layout: spiralLayout(job.marks.length, job.size, job.size),
      colors: job.colors,
    };
  } else {
    latest = job;
  }
  if (!painting) void paintLatest();
});
