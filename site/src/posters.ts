// Turns each cover <img data-poster> into a dithered pink-and-black canvas,
// cropped to the poster's 2:3 frame. Low resolution on purpose: the canvas is
// scaled up with hard pixels, so the dots read like a cheap photocopy.
import { ditherTwoTone } from './dither';

const POSTER_PIXELS_WIDE = 150;

function renderPoster(img: HTMLImageElement): void {
  const w = POSTER_PIXELS_WIDE;
  const h = Math.round(w * 1.5);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.className = 'poster-art';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error("This browser couldn't open a 2D canvas");
  // object-fit: cover, by hand
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  const pixels = ctx.getImageData(0, 0, w, h);
  ditherTwoTone(pixels.data, w, h);
  ctx.putImageData(pixels, 0, 0);
  img.after(canvas);
  img.closest('.poster')?.classList.add('is-dithered');
}

export function initPosters(root: ParentNode = document): void {
  root.querySelectorAll<HTMLImageElement>('img[data-poster]').forEach(img => {
    if (img.complete && img.naturalWidth > 0) renderPoster(img);
    else img.addEventListener('load', () => renderPoster(img), { once: true });
  });
}
