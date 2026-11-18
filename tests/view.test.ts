import { clampView, nearestMarkIndex, paintsSpiralOnMainThread, panView, zoomViewAt, type View } from '../site/src/view';
import { spiralLayout } from '../src/layout';

const bounds = { size: 1000, minZoom: 1, maxZoom: 10 };
const whole: View = { zoom: 1, centerX: 500, centerY: 500 };
const square = { width: 500, height: 500 };

describe('spiral view math', () => {
  test('zooming keeps the point under the pointer in place', () => {
    // Canvas 500px wide showing a 1000-unit layout: pixel (400, 100) is layout (800, 200).
    const zoomed = zoomViewAt(whole, 4, 400, 100, square, bounds);
    expect(zoomed.zoom).toBe(4);
    const units = 1000 / 500 / zoomed.zoom;
    expect(zoomed.centerX + (400 - 250) * units).toBeCloseTo(800);
    expect(zoomed.centerY + (100 - 250) * units).toBeCloseTo(200);
  });

  test('zoom stays between the limits', () => {
    expect(zoomViewAt(whole, 0.1, 250, 250, square, bounds).zoom).toBe(1);
    expect(zoomViewAt(whole, 1000, 250, 250, square, bounds).zoom).toBe(10);
  });

  test('the whole book cannot be dragged at all', () => {
    expect(panView(whole, 300, -200, square, bounds)).toEqual(whole);
  });

  test('a zoomed view pans by screen pixels but stops at the edge', () => {
    const zoomed: View = { zoom: 2, centerX: 500, centerY: 500 };
    // At 2x on a 500px canvas, one pixel is one layout unit.
    expect(panView(zoomed, -100, 50, square, bounds)).toEqual({ zoom: 2, centerX: 600, centerY: 450 });
    expect(panView(zoomed, -5000, 0, square, bounds).centerX).toBe(750);
  });

  test('clampView pulls a view back inside the layout', () => {
    expect(clampView({ zoom: 4, centerX: -50, centerY: 2000 }, bounds, square)).toEqual({ zoom: 4, centerX: 125, centerY: 875 });
  });

  test('on a wide canvas the spiral fits the height and stays centered across until it fills the width', () => {
    const wide = { width: 1000, height: 500 };
    // Zoom 2: the window is 1000 units wide (the whole layout) and 500 tall.
    const zoomed: View = { zoom: 2, centerX: 500, centerY: 500 };
    expect(panView(zoomed, -300, -1000, wide, bounds)).toEqual({ zoom: 2, centerX: 500, centerY: 750 });
    // Zoom 4: now it pans across too, up to the edge.
    expect(panView({ ...zoomed, zoom: 4 }, -5000, 0, wide, bounds).centerX).toBe(750);
  });
});

describe('nearestMarkIndex', () => {
  test('finds the same mark as checking every one', () => {
    const layout = spiralLayout(20000, 1400, 1400);
    const reach = layout.fontSize * 4;
    const bruteForce = (x: number, y: number) => {
      let best = -1;
      let bestDist = reach * reach;
      layout.points.forEach((p, i) => {
        const d = (p.x - x) ** 2 + (p.y - y) ** 2;
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      return best;
    };
    // The empty center, the middle rings, the outer edge and outside the spiral
    for (const [x, y] of [[700, 700], [900, 650], [400, 1000], [700, 60], [5, 5]] as const) {
      expect(nearestMarkIndex(layout, x, y, reach)).toBe(bruteForce(x, y));
    }
    expect(nearestMarkIndex(layout, 5, 5, reach)).toBe(-1);
    expect(nearestMarkIndex(layout, 400, 1000, reach)).toBeGreaterThan(-1);
  });
});

test('Safari and iOS browsers paint the spiral on the main thread; Chrome, Edge and Firefox use the worker', () => {
  const ua = {
    safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
    iosChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1',
    chrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
    androidChrome: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
    firefox: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0',
  };
  expect(paintsSpiralOnMainThread(ua.safari)).toBe(true);
  expect(paintsSpiralOnMainThread(ua.iosChrome)).toBe(true);
  for (const other of [ua.chrome, ua.edge, ua.androidChrome, ua.firefox]) expect(paintsSpiralOnMainThread(other)).toBe(false);
});
