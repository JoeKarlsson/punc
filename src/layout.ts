// Spiral geometry shared by the SVG renderer (svg.ts) and the browser canvas
// renderer (site/src). Pure math, no output format.

export interface SpiralPoint {
  x: number;
  y: number;
  angleDeg: number;
}

export interface SpiralLayout {
  cx: number;
  cy: number;
  fontSize: number;
  minRadius: number;
  drPerTheta: number;
  thetaTot: number;
  turns: number;
  points: SpiralPoint[];
}

// Lays `count` marks along an Archimedean spiral filling a w x h canvas (less
// `bottomReserve` px kept free for a title), evenly spaced by arc length and
// rotated along the tangent, so inner rings hold fewer marks than outer ones.
export function spiralLayout(count: number, w: number, h: number, bottomReserve = 0): SpiralLayout {
  const cx = w / 2;
  const cy = (h - bottomReserve) / 2;
  const maxRadius = Math.min(w, h - bottomReserve) * 0.46;
  // fontSize so the gap between turns is about one fontSize (a solid disk)
  const fontSize = Math.max(4, Math.min(16, Math.sqrt((Math.PI * maxRadius * maxRadius) / Math.max(count, 1) / 0.5)));
  const turns = Math.max(4, Math.floor(maxRadius / fontSize));
  const thetaTot = turns * 2 * Math.PI;
  // Leave a clean empty center: inner rings are too tight to read.
  const minRadius = Math.max(fontSize * 3, maxRadius * 0.06);
  const drPerTheta = (maxRadius - minRadius) / thetaTot;

  // Cumulative arc-length table. Arc element: ds = sqrt(r² + (dr/dθ)²) dθ
  const ARC_SAMPLES = 2000;
  const arcTable = new Float64Array(ARC_SAMPLES + 1);
  for (let i = 1; i <= ARC_SAMPLES; i++) {
    const rMid = minRadius + drPerTheta * ((i - 0.5) / ARC_SAMPLES) * thetaTot;
    arcTable[i] = arcTable[i - 1]! + Math.sqrt(rMid * rMid + drPerTheta * drPerTheta) * (thetaTot / ARC_SAMPLES);
  }
  const totalArcLen = arcTable[ARC_SAMPLES]!;

  const arcToTheta = (target: number): number => {
    let lo = 0;
    let hi = ARC_SAMPLES;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (arcTable[mid]! <= target) lo = mid;
      else hi = mid;
    }
    const span = arcTable[lo + 1]! - arcTable[lo]!;
    const frac = span > 0 ? (target - arcTable[lo]!) / span : 0;
    return ((lo + frac) / ARC_SAMPLES) * thetaTot;
  };

  const points: SpiralPoint[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const target = count > 1 ? (i / (count - 1)) * totalArcLen : 0;
    const theta = arcToTheta(Math.min(target, totalArcLen));
    const phi = theta - Math.PI / 2;
    const r = minRadius + drPerTheta * theta;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    const dx = drPerTheta * cosPhi - r * sinPhi;
    const dy = drPerTheta * sinPhi + r * cosPhi;
    points[i] = { x: cx + r * cosPhi, y: cy + r * sinPhi, angleDeg: (Math.atan2(dy, dx) * 180) / Math.PI };
  }

  return { cx, cy, fontSize, minRadius, drPerTheta, thetaTot, turns, points };
}
