// Pan and zoom math for the spiral explorer, kept free of the DOM so it can be
// unit tested. A view is a zoom level and the layout point at the center of the
// screen; `size` is the layout's width and height, and `screen` the canvas's
// CSS size, which can be wider or taller than it is square. At zoom 1 the
// whole layout fits the canvas's shorter side.

export interface View {
  zoom: number;
  centerX: number;
  centerY: number;
}

export interface ViewBounds {
  size: number;
  minZoom: number;
  maxZoom: number;
}

export interface Screen {
  width: number;
  height: number;
}

// Layout units per CSS pixel at this zoom
const unitsPerPixel = (zoom: number, screen: Screen, size: number) => size / Math.min(screen.width, screen.height) / zoom;

// Keep the zoom in range and the visible window inside the layout, so the
// spiral can't be zoomed past its limits or dragged off screen. Along a side
// where the whole layout fits, it stays centered.
export function clampView(view: View, { size, minZoom, maxZoom }: ViewBounds, screen: Screen): View {
  const zoom = Math.min(maxZoom, Math.max(minZoom, view.zoom));
  const units = unitsPerPixel(zoom, screen, size);
  const clampAxis = (center: number, pixels: number) => {
    const half = (pixels / 2) * units;
    return half >= size / 2 ? size / 2 : Math.min(size - half, Math.max(half, center));
  };
  return { zoom, centerX: clampAxis(view.centerX, screen.width), centerY: clampAxis(view.centerY, screen.height) };
}

// Zoom by `factor`, keeping the layout point under the canvas point
// (cssX, cssY) where it is, as maps do under the pointer.
export function zoomViewAt(view: View, factor: number, cssX: number, cssY: number, screen: Screen, bounds: ViewBounds): View {
  const dx = cssX - screen.width / 2;
  const dy = cssY - screen.height / 2;
  const unitsBefore = unitsPerPixel(view.zoom, screen, bounds.size);
  const anchorX = view.centerX + dx * unitsBefore;
  const anchorY = view.centerY + dy * unitsBefore;
  const zoom = clampView({ ...view, zoom: view.zoom * factor }, bounds, screen).zoom;
  const unitsAfter = unitsPerPixel(zoom, screen, bounds.size);
  return clampView({ zoom, centerX: anchorX - dx * unitsAfter, centerY: anchorY - dy * unitsAfter }, bounds, screen);
}

// Drag the content by (dxCss, dyCss) canvas pixels.
export function panView(view: View, dxCss: number, dyCss: number, screen: Screen, bounds: ViewBounds): View {
  const units = unitsPerPixel(view.zoom, screen, bounds.size);
  return clampView({ ...view, centerX: view.centerX - dxCss * units, centerY: view.centerY - dyCss * units }, bounds, screen);
}
