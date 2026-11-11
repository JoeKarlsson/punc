// Canvas renderers for the reader. Canvas, not SVG, because a novel has tens
// of thousands of marks. Spiral geometry is the library's spiralLayout.
import { spiralLayout, type SpiralLayout } from '../../src/layout';
import { panView, zoomViewAt, type Screen, type View, type ViewBounds } from './view';

// Colors come from the tokens in styles.css, so the canvases can't drift from the page.
function token(name: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!value) throw new Error(`styles.css is missing ${name}`);
  return value;
}
// Read on first draw, not on import: Safari can run this module before
// styles.css has applied, and the tokens would be empty.
let palette: { ink: string; paper: string; pink: string } | undefined;
function colors(): { ink: string; paper: string; pink: string } {
  palette ??= { ink: token('--ink'), paper: token('--paper'), pink: token('--pink') };
  return palette;
}
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
  ctx.fillStyle = colors().ink;
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  return ctx;
}

const SPIRAL_SIZE = 1400;
const MIN_ZOOM = 1;
const MAX_ZOOM = 60;

function paintSpiral(
  ctx: CanvasRenderingContext2D,
  marks: string[],
  layout: SpiralLayout,
  // Pixels per layout unit, and where the layout origin lands, in device pixels
  scale: number,
  offsetX: number,
  offsetY: number,
  width: number,
  height: number
): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = colors().ink;
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${layout.fontSize.toFixed(2)}px Fraunces, Georgia, serif`;
  const margin = layout.fontSize * scale;
  const { paper, pink } = colors();
  marks.forEach((mark, i) => {
    const { x, y, angleDeg } = layout.points[i]!;
    const px = x * scale + offsetX;
    const py = y * scale + offsetY;
    // Skip marks off screen, so a deep zoom only draws what you can see.
    if (px < -margin || py < -margin || px > width + margin || py > height + margin) return;
    const a = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(a) * scale;
    const sin = Math.sin(a) * scale;
    ctx.setTransform(cos, sin, -sin, cos, px, py);
    ctx.fillStyle = ENDS_SENTENCE.has(mark) ? pink : paper;
    ctx.fillText(mark, 0, 0);
  });
}

export interface SpiralExplorer {
  zoomBy(factor: number): void;
  reset(): void;
  // The whole spiral at full resolution, whatever the current view
  exportCanvas(): HTMLCanvasElement;
}

// The spiral as a map: pinch (or Ctrl and the wheel) to zoom around the
// pointer, drag to pan, + / - / arrow keys when focused. A plain wheel scrolls
// the page, so a canvas as tall as the screen doesn't trap it. Redraws vectors at each zoom, so marks stay
// sharp; the view is clamped so the spiral can't be dragged off screen.
export function createSpiralExplorer(
  canvas: HTMLCanvasElement,
  marks: string[],
  onChange: (zoom: number, percentThrough: number | null) => void
): SpiralExplorer {
  const layout = spiralLayout(marks.length, SPIRAL_SIZE, SPIRAL_SIZE);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser could not open a 2D canvas');
  const bounds: ViewBounds = { size: SPIRAL_SIZE, minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM };
  const wholeBook: View = { zoom: MIN_ZOOM, centerX: SPIRAL_SIZE / 2, centerY: SPIRAL_SIZE / 2 };
  let view = wholeBook;
  let frame = 0;
  // The whole book is the slowest picture to paint (every mark is on screen), so keep a copy
  // to put back on Reset and when the view is shown again.
  const wholeBookCopy = document.createElement('canvas');
  const isWholeBook = (v: View) => v.zoom === wholeBook.zoom && v.centerX === wholeBook.centerX && v.centerY === wholeBook.centerY;

  const screen = (): Screen => ({ width: canvas.clientWidth, height: canvas.clientHeight });
  const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

  // How far through the book the mark nearest the view's center is
  const percentAtCenter = (): number | null => {
    const { zoom, centerX, centerY } = view;
    if (zoom < 2) return null;
    let best = -1;
    let bestDist = Infinity;
    layout.points.forEach((p, i) => {
      const d = (p.x - centerX) ** 2 + (p.y - centerY) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    const reach = (layout.fontSize * 4) ** 2;
    return best >= 0 && bestDist < reach ? (best / Math.max(marks.length - 1, 1)) * 100 : null;
  };

  const render = () => {
    frame = 0;
    const { width: cssWidth, height: cssHeight } = screen();
    // Hidden behind another view: drawn when it's shown again, which resizes it.
    if (!cssWidth || !cssHeight) return;
    const width = Math.round(cssWidth * dpr());
    const height = Math.round(cssHeight * dpr());
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const whole = isWholeBook(view);
    if (whole && wholeBookCopy.width === width && wholeBookCopy.height === height) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(wholeBookCopy, 0, 0);
    } else {
      const scale = (Math.min(width, height) / SPIRAL_SIZE) * view.zoom;
      paintSpiral(ctx, marks, layout, scale, width / 2 - view.centerX * scale, height / 2 - view.centerY * scale, width, height);
      if (whole) {
        wholeBookCopy.width = width;
        wholeBookCopy.height = height;
        wholeBookCopy.getContext('2d')?.drawImage(canvas, 0, 0);
      }
    }
    onChange(view.zoom, percentAtCenter());
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };

  // Repaint only when the view really moved: a drag at the whole-book zoom is clamped in place.
  const moveTo = (next: View) => {
    if (next.zoom === view.zoom && next.centerX === view.centerX && next.centerY === view.centerY) return;
    view = next;
    schedule();
  };
  const zoomAt = (factor: number, cssX: number, cssY: number) => moveTo(zoomViewAt(view, factor, cssX, cssY, screen(), bounds));
  const panBy = (dxCss: number, dyCss: number) => moveTo(panView(view, dxCss, dyCss, screen(), bounds));
  const local = (e: { clientX: number; clientY: number }) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  canvas.addEventListener(
    'wheel',
    e => {
      // Trackpad pinches arrive as wheel events with ctrlKey set.
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const { x, y } = local(e);
      zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002)), x, y);
    },
    { passive: false }
  );

  // Pointer drag pans; two pointers pinch-zoom around their midpoint.
  const pointers = new Map<number, { x: number; y: number }>();
  let pinchDistance = 0;
  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, local(e));
    pinchDistance = 0;
  });
  canvas.addEventListener('pointermove', e => {
    const previous = pointers.get(e.pointerId);
    if (!previous) return;
    const now = local(e);
    pointers.set(e.pointerId, now);
    if (pointers.size === 1) {
      panBy(now.x - previous.x, now.y - previous.y);
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()] as [{ x: number; y: number }, { x: number; y: number }];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance > 0) zoomAt(distance / pinchDistance, (a.x + b.x) / 2, (a.y + b.y) / 2);
      pinchDistance = distance;
    }
  });
  const release = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    pinchDistance = 0;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('dblclick', e => {
    const { x, y } = local(e);
    zoomAt(e.shiftKey ? 0.5 : 2, x, y);
  });
  canvas.addEventListener('keydown', e => {
    const { width, height } = screen();
    const step = Math.min(width, height) * 0.15;
    const actions: Record<string, () => void> = {
      '+': () => zoomAt(1.5, width / 2, height / 2),
      '=': () => zoomAt(1.5, width / 2, height / 2),
      '-': () => zoomAt(1 / 1.5, width / 2, height / 2),
      '0': () => explorer.reset(),
      ArrowLeft: () => panBy(step, 0),
      ArrowRight: () => panBy(-step, 0),
      ArrowUp: () => panBy(0, step),
      ArrowDown: () => panBy(0, -step),
    };
    const action = actions[e.key];
    if (action) {
      e.preventDefault();
      action();
    }
  });
  // Its first callback paints the first picture.
  new ResizeObserver(schedule).observe(canvas);

  const explorer: SpiralExplorer = {
    zoomBy: factor => zoomAt(factor, screen().width / 2, screen().height / 2),
    reset: () => moveTo(wholeBook),
    exportCanvas: () => {
      const out = document.createElement('canvas');
      const size = SPIRAL_SIZE * 2;
      out.width = out.height = size;
      const outCtx = out.getContext('2d');
      if (!outCtx) throw new Error('This browser could not open a 2D canvas');
      paintSpiral(outCtx, marks, layout, size / SPIRAL_SIZE, 0, 0, size, size);
      return out;
    },
  };
  return explorer;
}

// Laid out at least 1100 units wide, and at the canvas's own width when that's
// wider, so a big screen gets more columns rather than bigger marks.
// The whole score fitted into one picture for Download PNG: the longer the
// book, the smaller its marks. On screen the score scrolls instead
// (createScoreScroller).
export function drawScore(canvas: HTMLCanvasElement, marks: string[]): void {
  const width = Math.max(1100, Math.round(canvas.clientWidth));
  const pad = 48;
  const cell = Math.min(30, Math.max(7, Math.sqrt(((width - pad * 2) * 7000) / Math.max(marks.length, 1))));
  const cols = Math.floor((width - pad * 2) / cell);
  const height = Math.ceil(marks.length / cols) * cell + pad * 2;
  const ctx = prepare(canvas, width, height);
  ctx.font = `${Math.floor(cell * 0.8)}px Fraunces, Georgia, serif`;
  const { paper, pink } = colors();
  marks.forEach((mark, i) => {
    ctx.fillStyle = ENDS_SENTENCE.has(mark) ? pink : paper;
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

// The score on screen: every mark the same size, so a long book is a long
// scroll and a short one a short one. A phone gets slightly smaller marks and
// a narrow margin rather than a computer's layout shrunk to fit.
export function scoreLayout(width: number, count: number): { cell: number; pad: number; cols: number; rows: number; height: number } {
  const narrow = width < 600;
  const cell = narrow ? 12 : 14;
  const pad = narrow ? 16 : 48;
  const cols = Math.max(1, Math.floor((width - pad * 2) / cell));
  const rows = Math.ceil(count / cols);
  return { cell, pad, cols, rows, height: rows * cell + pad * 2 };
}

// Draws the score for scrolling. The holder is as tall as the whole score;
// inside it a screen-high window sticks to the top while the holder scrolls
// past, and its canvas redraws only the rows in view. One canvas the size of
// the screen stays sharp at any length, where a single canvas for the whole of
// a long book would pass the browser's size limits. The rail beside it shows
// where you are and can be dragged to jump through the book.
export function createScoreScroller(holder: HTMLElement, marks: string[]): void {
  const frame = holder.querySelector<HTMLElement>('.score-window');
  const canvas = holder.querySelector<HTMLCanvasElement>('canvas');
  const rail = holder.querySelector<HTMLElement>('.score-rail');
  const thumb = holder.querySelector<HTMLElement>('.score-thumb');
  if (!frame || !canvas || !rail || !thumb) throw new Error('The score is missing its window, canvas or rail');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser could not open a 2D canvas');
  const ctx = context;
  const { ink, paper, pink } = colors();
  let width = 0;
  let viewHeight = 0;
  let dpr = 1;
  let layout = scoreLayout(1, marks.length);
  let thumbHeight = 0;

  const scrolled = () => Math.min(Math.max(-holder.getBoundingClientRect().top, 0), layout.height - viewHeight);

  const draw = () => {
    if (!width) return;
    const top = scrolled();
    const { cell, pad, cols, rows } = layout;
    ctx.setTransform(dpr, 0, 0, dpr, 0, -top * dpr);
    ctx.fillStyle = ink;
    ctx.fillRect(0, top, width, viewHeight);
    ctx.font = `${Math.floor(cell * 0.8)}px Fraunces, Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const firstRow = Math.max(0, Math.floor((top - pad) / cell));
    const lastRow = Math.min(rows - 1, Math.floor((top + viewHeight - pad) / cell));
    for (let row = firstRow; row <= lastRow; row++) {
      const y = pad + (row + 0.5) * cell;
      for (let col = 0, i = row * cols; col < cols && i < marks.length; col++, i++) {
        const mark = marks[i]!;
        ctx.fillStyle = ENDS_SENTENCE.has(mark) ? pink : paper;
        ctx.fillText(mark, pad + (col + 0.5) * cell, y);
      }
    }
    const travel = layout.height - viewHeight;
    thumb.style.transform = `translateY(${travel > 0 ? (top / travel) * (viewHeight - thumbHeight) : 0}px)`;
  };

  const resize = () => {
    // Hidden behind another view: drawn when it's shown, which resizes it.
    if (!holder.clientWidth) return;
    // Setting the holder's height below resizes it too; only a new width or
    // screen height needs a new layout.
    if (holder.clientWidth === width && Math.min(window.innerHeight, layout.height) === viewHeight) return;
    width = holder.clientWidth;
    layout = scoreLayout(width, marks.length);
    holder.style.height = `${layout.height}px`;
    viewHeight = Math.min(window.innerHeight, layout.height);
    frame.style.height = `${viewHeight}px`;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(viewHeight * dpr);
    rail.hidden = layout.height <= viewHeight;
    thumbHeight = Math.max(32, (viewHeight * viewHeight) / layout.height);
    thumb.style.height = `${thumbHeight}px`;
    draw();
  };

  let pending = false;
  const drawSoon = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      draw();
    });
  };
  window.addEventListener('scroll', drawSoon, { passive: true });
  window.addEventListener('resize', resize);
  // On the next frame, not inside the observer: changing the holder's height
  // there would set off another round of notifications.
  new ResizeObserver(() => requestAnimationFrame(resize)).observe(holder);

  // Dragging the rail scrolls the page to that point in the book.
  const scrollToRail = (event: PointerEvent) => {
    const box = rail.getBoundingClientRect();
    const fraction = Math.min(Math.max((event.clientY - box.top) / box.height, 0), 1);
    window.scrollTo({ top: window.scrollY + holder.getBoundingClientRect().top + fraction * (layout.height - viewHeight) });
  };
  rail.addEventListener('pointerdown', event => {
    rail.setPointerCapture(event.pointerId);
    scrollToRail(event);
  });
  rail.addEventListener('pointermove', event => {
    if (rail.hasPointerCapture(event.pointerId)) scrollToRail(event);
  });
}
