// Pure helpers for the painted battle background layers (no file access, testable). Gemini rarely paints a
// clean green background: usually only the open water is green and the rest of the scene is painted. So:
//   - front: keep only what frames the scene (rocks at the sides, things hanging from the top) — never
//     the water and floor in the middle, which would cover the beasts;
//   - ground: keep only the stone stage, as an ellipse fitted to it (the dark water above it goes).
import type { Raw } from './cutout.ts';

/** Strongly green pixel (the chroma background). */
export function isGreen(d: Uint8ClampedArray | Uint8Array, o: number): boolean {
  return d[o + 1]! - Math.max(d[o]!, d[o + 2]!) > 60;
}

/** Softens a 0..1 mask with a box blur of radius r (two passes: rows, then columns). */
export function blurMask(m: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(m.length);
  const out = new Float32Array(m.length);
  for (let y = 0; y < h; y++) {
    let acc = 0;
    for (let x = -r; x <= r; x++) acc += m[y * w + Math.min(w - 1, Math.max(0, x))]!;
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = acc / (2 * r + 1);
      acc += m[y * w + Math.min(w - 1, x + r + 1)]! - m[y * w + Math.max(0, x - r)]!;
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]!;
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / (2 * r + 1);
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x]! - tmp[Math.max(0, y - r) * w + x]!;
    }
  }
  return out;
}

/**
 * The frame of a foreground layer. The green area is the open middle of the scene: everything left of its
 * leftmost green pixel and right of its rightmost (rocks at the sides, full height) is kept, and so is what
 * hangs above it from the top edge. The level of the green's top in each column is smoothed over a wide
 * window, so a beam of light painted across the green does not open a hole, and only dark pixels (rock)
 * count as hanging: painted light beams up there stay out. 1 = keep, 0 = drop.
 */
export function frameMask(img: Raw): Float32Array {
  const { width: w, height: h, data } = img;
  const m = new Float32Array(w * h);
  const top = new Int32Array(w).fill(h);
  let left = w;
  let right = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (isGreen(data, (y * w + x) * 4)) {
        if (top[x] === h) top[x] = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
  if (right < 0) return m.fill(1); // no green at all: keep everything
  const win = Math.round(w * 0.08);
  const smooth = new Int32Array(w);
  for (let x = 0; x < w; x++) {
    let best = h;
    for (let k = Math.max(0, x - win); k <= Math.min(w - 1, x + win); k++) best = Math.min(best, top[k]!);
    smooth[x] = best;
  }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (isGreen(data, (y * w + x) * 4)) continue;
      const o = (y * w + x) * 4;
      const dark = Math.max(data[o]!, data[o + 1]!, data[o + 2]!) < 60; // rock, not a painted light beam
      if (x < left || x > right || (y < smooth[x]! && dark)) m[y * w + x] = 1;
    }
  return m;
}

export interface Ellipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/**
 * The stone stage of a ground layer. Rows with green at both ends cross the stage; going up from its lowest
 * row the stage gets wider until its widest row (the middle of the ellipse), then narrower — above that the
 * dark water starts and the rows get wide again, so the search stops at the first widest row.
 */
export function fitStage(img: Raw): Ellipse | null {
  const { width: w, height: h, data } = img;
  const spans: { y: number; l: number; r: number }[] = [];
  for (let y = 0; y < h; y++) {
    if (!isGreen(data, y * w * 4) || !isGreen(data, (y * w + w - 1) * 4)) continue;
    let l = -1;
    let r = -1;
    for (let x = 0; x < w; x++)
      if (!isGreen(data, (y * w + x) * 4)) {
        if (l < 0) l = x;
        r = x;
      }
    if (l >= 0 && r - l < w * 0.9) spans.push({ y, l, r });
  }
  if (spans.length < 3) return null;
  const bottom = spans[spans.length - 1]!.y;
  let widest = spans[spans.length - 1]!;
  for (let i = spans.length - 2; i >= 0; i--) {
    const s = spans[i]!;
    if (s.r - s.l >= widest.r - widest.l) widest = s;
    else if (widest.r - widest.l - (s.r - s.l) > w * 0.03) break; // past the middle and narrowing: done
  }
  const ry = Math.max(4, bottom - widest.y);
  return { cx: (widest.l + widest.r) / 2, cy: widest.y, rx: (widest.r - widest.l) / 2, ry };
}

/** 1 inside the ellipse, fading to 0 over `feather` (a share of the radii) at the edge. */
export function ellipseMask(w: number, h: number, e: Ellipse, feather = 0.06): Float32Array {
  const m = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const d = Math.hypot((x - e.cx) / e.rx, (y - e.cy) / e.ry);
      m[y * w + x] = d <= 1 - feather ? 1 : d >= 1 ? 0 : (1 - d) / feather;
    }
  return m;
}
