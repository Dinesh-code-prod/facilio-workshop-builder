import {Easing, interpolate} from 'remotion';

export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const progress = (frame: number, from: number, length: number) => clamp((frame - from) / length);
export const settle = (frame: number, from = 0, duration = 18) => interpolate(frame, [from, from + duration], [0, 1], {
  easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
});
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export type Point = {x: number; y: number};

// Distance, not segment index, determines position: pulses keep a steady speed at corners.
export function pointOnPolyline(points: Point[], fraction: number): Point {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
  let distance = clamp(fraction) * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (distance <= lengths[i] && lengths[i] > 0) {
      const p = distance / lengths[i];
      return {x: mix(points[i].x, points[i + 1].x, p), y: mix(points[i].y, points[i + 1].y, p)};
    }
    distance -= lengths[i];
  }
  return points[points.length - 1];
}
