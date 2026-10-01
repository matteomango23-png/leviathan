// Pure image helpers for `npm run art` (no file access, testable).
// Images are raw RGBA buffers: 4 bytes per pixel, row by row.

export interface Raw {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

export interface CutoutOptions {
  /** Pixels darker than this (max of r, g, b) are fully background. */
  low: number;
  /** Pixels between low and high fade out; the flood fill stops at high. */
  high: number;
}

export const DEFAULT_CUTOUT: CutoutOptions = { low: 10, high: 34 };

/**
 * Removes the black background: flood fill from the image border through dark pixels only,
 * so dark parts inside the creature (eyes, mouth) are kept. Edges get a soft alpha ramp
 * and their colour is "un-darkened" so no black halo remains.
 */
export function removeBlackBackground(img: Raw, opt: CutoutOptions = DEFAULT_CUTOUT): Uint8ClampedArray {
  const { width: w, height: h } = img;
  const src = img.data;
  const out = new Uint8ClampedArray(src.length);
  out.set(src);
  const bright = (i: number): number => Math.max(src[i * 4]!, src[i * 4 + 1]!, src[i * 4 + 2]!);
  const seen = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  const push = (i: number): void => {
    if (seen[i] || bright(i) >= opt.high) return;
    seen[i] = 1;
    queue[tail++] = i;
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  while (head < tail) {
    const i = queue[head++]!;
    const x = i % w;
    const y = (i - x) / w;
    const b = bright(i);
    const a = b <= opt.low ? 0 : (b - opt.low) / (opt.high - opt.low);
    const o = i * 4;
    out[o + 3] = Math.round(a * 255);
    if (a > 0) {
      // un-premultiply against black: the faint edge keeps the creature's colour, not black
      out[o] = Math.min(255, src[o]! / a);
      out[o + 1] = Math.min(255, src[o + 1]! / a);
      out[o + 2] = Math.min(255, src[o + 2]! / a);
    }
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (y > 0) push(i - w);
    if (y < h - 1) push(i + w);
  }
  // remove isolated specks (JPEG noise) left in the background: pixels with no opaque neighbours
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (out[i * 4 + 3] === 0) continue;
      let n = 0;
      for (const d of [-1, 1, -w, w]) if (out[(i + d) * 4 + 3]! > 0) n++;
      if (n === 0) out[i * 4 + 3] = 0;
    }
  }
  return out;
}

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Bounding box of pixels more opaque than `minAlpha`. */
export function opaqueBox(
  data: Uint8ClampedArray | Uint8Array,
  w: number,
  h: number,
  minAlpha = 24,
): Box | null {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3]! > minAlpha) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

/**
 * The body line of a side profile: median of the vertical centre of each column
 * between 20% and 80% of the length (fins at the ends barely move it).
 */
export function bodyLine(data: Uint8ClampedArray | Uint8Array, w: number, box: Box): number {
  const mids: number[] = [];
  const from = Math.round(box.x0 + (box.x1 - box.x0) * 0.2);
  const to = Math.round(box.x0 + (box.x1 - box.x0) * 0.8);
  for (let x = from; x <= to; x++) {
    let top = -1;
    let bottom = -1;
    for (let y = box.y0; y <= box.y1; y++) {
      if (data[(y * w + x) * 4 + 3]! > 128) {
        if (top < 0) top = y;
        bottom = y;
      }
    }
    if (top >= 0) mids.push((top + bottom) / 2);
  }
  if (!mids.length) return (box.y0 + box.y1) / 2;
  mids.sort((a, b) => a - b);
  return mids[Math.floor(mids.length / 2)]!;
}

export interface Placement {
  scale: number;
  left: number;
  top: number;
}

/**
 * Where to put a cropped profile inside the standard frame so that it fills the width
 * and its body line sits on `lineY`, never spilling out of the frame.
 */
export function placeProfile(
  cropW: number,
  cropH: number,
  lineInCrop: number,
  frame: { w: number; h: number; lineY: number },
): Placement {
  let scale = frame.w / cropW;
  const above = lineInCrop * scale;
  const below = (cropH - lineInCrop) * scale;
  const fitAbove = above > frame.lineY ? frame.lineY / lineInCrop : Infinity;
  const fitBelow = below > frame.h - frame.lineY ? (frame.h - frame.lineY) / (cropH - lineInCrop) : Infinity;
  scale = Math.min(scale, fitAbove, fitBelow);
  const w = cropW * scale;
  return { scale, left: Math.round((frame.w - w) / 2), top: Math.round(frame.lineY - lineInCrop * scale) };
}

/** Centred crop of a given aspect ratio (width / height), as large as possible. */
export function coverCrop(
  w: number,
  h: number,
  aspect: number,
): { left: number; top: number; width: number; height: number } {
  if (w / h > aspect) {
    const cw = Math.round(h * aspect);
    return { left: Math.round((w - cw) / 2), top: 0, width: cw, height: h };
  }
  const ch = Math.round(w / aspect);
  return { left: 0, top: Math.round((h - ch) / 2), width: w, height: ch };
}

/** card: illustration · side: profile for the open sea · front/back: three-quarter pictures for battle. */
export type InboxKind = 'card' | 'side' | 'side_open' | 'front' | 'front_open' | 'back' | 'back_open';

/**
 * Splits an inbox file name into the beast id and its kind.
 * A profile that faces left can be named `<id>_side_left.jpg` / `<id>_side_open_left.jpg`: it is mirrored.
 */
export function parseInboxName(file: string): { id: string; kind: InboxKind; mirror: boolean } | null {
  const m = /^(.+?)_(card|side_open|side|front_open|front|back_open|back)(_left)?\.(jpe?g|png|webp)$/i.exec(
    file,
  );
  if (!m) return null;
  const kind = m[2]!.toLowerCase() as InboxKind;
  if (kind === 'card' && m[3]) return null;
  return { id: m[1]!.toLowerCase(), kind, mirror: !!m[3] };
}
