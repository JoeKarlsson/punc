// Canvas renderers for the reader. Canvas, not SVG, because a novel has tens
// of thousands of marks. Spiral geometry is the library's spiralLayout.
import { spiralLayout } from '../../src/layout';

const INK = '#000000';
const PAPER = '#ededed';
const PINK = '#ff4fd8';
const ENDS_SENTENCE = new Set(['.', '?', '!']);
// Safari refuses canvases over about 16.7M pixels.
const MAX_CANVAS_PIXELS = 16_000_000;

function prepare(canvas: HTMLCanvasElement, w: number, h: number): CanvasRenderingContext2D {
  const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(MAX_CANVAS_PIXELS / (w * h)));
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.aspectRatio = `${w} / ${h}`;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser could not open a 2D canvas');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  return ctx;
}

export function drawSpiral(canvas: HTMLCanvasElement, marks: string[]): void {
  const size = 1400;
  const ctx = prepare(canvas, size, size);
  const dpr = canvas.width / size;
  const { fontSize, points } = spiralLayout(marks.length, size, size);
  ctx.font = `${fontSize.toFixed(1)}px Fraunces, Georgia, serif`;
  marks.forEach((mark, i) => {
    const { x, y, angleDeg } = points[i]!;
    const a = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(a) * dpr;
    const sin = Math.sin(a) * dpr;
    ctx.setTransform(cos, sin, -sin, cos, x * dpr, y * dpr);
    ctx.fillStyle = ENDS_SENTENCE.has(mark) ? PINK : PAPER;
    ctx.fillText(mark, 0, 0);
  });
}

export function drawScore(canvas: HTMLCanvasElement, marks: string[]): void {
  const width = 1100;
  const pad = 24;
  const cell = Math.min(30, Math.max(7, Math.sqrt(((width - pad * 2) * 7000) / Math.max(marks.length, 1))));
  const cols = Math.floor((width - pad * 2) / cell);
  const height = Math.ceil(marks.length / cols) * cell + pad * 2;
  const ctx = prepare(canvas, width, height);
  ctx.font = `${Math.floor(cell * 0.8)}px Fraunces, Georgia, serif`;
  marks.forEach((mark, i) => {
    ctx.fillStyle = ENDS_SENTENCE.has(mark) ? PINK : PAPER;
    ctx.fillText(mark, pad + ((i % cols) + 0.5) * cell, pad + (Math.floor(i / cols) + 0.5) * cell);
  });
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob(blob => {
    if (!blob) throw new Error('Could not export the image');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  }, 'image/png');
}
