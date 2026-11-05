// Pan and zoom math for the spiral explorer, kept free of the DOM so it can be
// unit tested. A view is a zoom level and the layout point at the center of the
// screen; `size` is the layout's width and height, `cssSize` the canvas's.

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

// Keep the zoom in range and the visible window inside the layout, so the
// spiral can't be zoomed past its limits or dragged off screen.
export function clampView(view: View, { size, minZoom, maxZoom }: ViewBounds): View {
  const zoom = Math.min(maxZoom, Math.max(minZoom, view.zoom));
  const half = size / 2 / zoom;
  return {
    zoom,
    centerX: Math.min(size - half, Math.max(half, view.centerX)),
    centerY: Math.min(size - half, Math.max(half, view.centerY)),
  };
}

// Zoom by `factor`, keeping the layout point under the canvas point
// (cssX, cssY) where it is, as maps do under the pointer.
export function zoomViewAt(
  view: View,
  factor: number,
  cssX: number,
  cssY: number,
  cssSize: number,
  bounds: ViewBounds
): View {
  const unitsBefore = bounds.size / cssSize / view.zoom;
  const anchorX = view.centerX + (cssX - cssSize / 2) * unitsBefore;
  const anchorY = view.centerY + (cssY - cssSize / 2) * unitsBefore;
  const zoom = clampView({ ...view, zoom: view.zoom * factor }, bounds).zoom;
  const unitsAfter = bounds.size / cssSize / zoom;
  return clampView(
    {
      zoom,
      centerX: anchorX - (cssX - cssSize / 2) * unitsAfter,
      centerY: anchorY - (cssY - cssSize / 2) * unitsAfter,
    },
    bounds
  );
}

// Drag the content by (dxCss, dyCss) canvas pixels.
export function panView(view: View, dxCss: number, dyCss: number, cssSize: number, bounds: ViewBounds): View {
  const units = bounds.size / cssSize / view.zoom;
  return clampView({ ...view, centerX: view.centerX - dxCss * units, centerY: view.centerY - dyCss * units }, bounds);
}
