import { clampView, panView, zoomViewAt, type View } from '../site/src/view';

const bounds = { size: 1000, minZoom: 1, maxZoom: 10 };
const whole: View = { zoom: 1, centerX: 500, centerY: 500 };

describe('spiral view math', () => {
  test('zooming keeps the point under the pointer in place', () => {
    // Canvas 500px wide showing a 1000-unit layout: pixel (400, 100) is layout (800, 200).
    const zoomed = zoomViewAt(whole, 4, 400, 100, 500, bounds);
    expect(zoomed.zoom).toBe(4);
    const units = 1000 / 500 / zoomed.zoom;
    expect(zoomed.centerX + (400 - 250) * units).toBeCloseTo(800);
    expect(zoomed.centerY + (100 - 250) * units).toBeCloseTo(200);
  });

  test('zoom stays between the limits', () => {
    expect(zoomViewAt(whole, 0.1, 250, 250, 500, bounds).zoom).toBe(1);
    expect(zoomViewAt(whole, 1000, 250, 250, 500, bounds).zoom).toBe(10);
  });

  test('the whole book cannot be dragged at all', () => {
    expect(panView(whole, 300, -200, 500, bounds)).toEqual(whole);
  });

  test('a zoomed view pans by screen pixels but stops at the edge', () => {
    const zoomed: View = { zoom: 2, centerX: 500, centerY: 500 };
    // At 2x on a 500px canvas, one pixel is one layout unit.
    expect(panView(zoomed, -100, 50, 500, bounds)).toEqual({ zoom: 2, centerX: 600, centerY: 450 });
    expect(panView(zoomed, -5000, 0, 500, bounds).centerX).toBe(750);
  });

  test('clampView pulls a view back inside the layout', () => {
    expect(clampView({ zoom: 4, centerX: -50, centerY: 2000 }, bounds)).toEqual({ zoom: 4, centerX: 125, centerY: 875 });
  });
});
