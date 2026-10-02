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
  /** Optional: just outside the background, pixels up to this far from it fade too (soft glow halos). */
  soft?: number;
}

export const DEFAULT_CUTOUT: CutoutOptions = { low: 10, high: 34 };

/** An RGB colour. */
export type Rgb = readonly [number, number, number];

/**
 * The background colour of a picture: the median of its border pixels, channel by channel
 * (screenshots of AI images often have a dark navy background instead of pure black).
 */
export function borderColor(img: Raw): Rgb {
  const { width: w, height: h, data } = img;
  const ch: number[][] = [[], [], []];
  const take = (x: number, y: number): void => {
    const o = (y * w + x) * 4;
    for (let c = 0; c < 3; c++) ch[c]!.push(data[o + c]!);
  };
  for (let x = 0; x < w; x += 2) {
    take(x, 0);
    take(x, h - 1);
  }
  for (let y = 0; y < h; y += 2) {
    take(0, y);
    take(w - 1, y);
  }
  const med = (a: number[]): number => a.sort((p, q) => p - q)[a.length >> 1]!;
  return [med(ch[0]!), med(ch[1]!), med(ch[2]!)];
}

/**
 * Removes the black background: flood fill from the image border through dark pixels only,
 * so dark parts inside the creature (eyes, mouth) are kept. Edges get a soft alpha ramp
 * and their colour is "un-darkened" so no black halo remains.
 */
export function removeBlackBackground(
  img: Raw,
  opt: CutoutOptions = DEFAULT_CUTOUT,
  bg: Rgb = [0, 0, 0],
): Uint8ClampedArray {
  const { width: w, height: h } = img;
  const src = img.data;
  const out = new Uint8ClampedArray(src.length);
  out.set(src);
  // how far a pixel is from the background colour (for black: its brightest channel)
  const bright = (i: number): number =>
    Math.max(
      Math.abs(src[i * 4]! - bg[0]),
      Math.abs(src[i * 4 + 1]! - bg[1]),
      Math.abs(src[i * 4 + 2]! - bg[2]),
    );
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
      // un-premultiply against the background: the faint edge keeps the creature's colour, not black
      for (let c = 0; c < 3; c++)
        out[o + c] = Math.max(0, Math.min(255, bg[c]! + (src[o + c]! - bg[c]!) / a));
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

/** Flood fill from the image border through the pixels where `open` is 1. */
function floodFromBorder(open: Uint8Array, w: number, h: number): Uint8Array {
  const seen = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  const push = (i: number): void => {
    if (seen[i] || !open[i]) return;
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
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < w * (h - 1)) push(i + w);
  }
  return seen;
}

/** How many set pixels are in the (2r+1)² square around each pixel (summed-area table). */
function boxCount(mask: Uint8Array, w: number, h: number, r: number): Int32Array {
  const sat = new Int32Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += mask[y * w + x]!;
      sat[(y + 1) * (w + 1) + x + 1] = sat[y * (w + 1) + x + 1]! + row;
    }
  }
  const out = new Int32Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(w, x + r + 1);
      out[y * w + x] =
        sat[y1 * (w + 1) + x1]! - sat[y0 * (w + 1) + x1]! - sat[y1 * (w + 1) + x0]! + sat[y0 * (w + 1) + x0]!;
    }
  }
  return out;
}

/**
 * Like removeBlackBackground, for creatures with very dark parts (a dark shark on black): the background is
 * only what can be reached from the border through *wide* dark areas. Thin dark paths (shadows along a fin,
 * the gap of the mouth) are closed by a morphological opening of radius `r`, so the body is never holed.
 */
export function removeDarkBackground(img: Raw, bg: Rgb, r: number, opt: CutoutOptions): Uint8ClampedArray {
  const { width: w, height: h, data: src } = img;
  const n = w * h;
  const dist = new Uint8Array(n);
  const dark = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    dist[i] = Math.max(
      Math.abs(src[o]! - bg[0]),
      Math.abs(src[o + 1]! - bg[1]),
      Math.abs(src[o + 2]! - bg[2]),
    );
    dark[i] = dist[i]! < opt.high ? 1 : 0;
  }
  const reach = floodFromBorder(dark, w, h);
  // erode: keep only pixels whose whole square is background (outside the image counts as background),
  // then keep what still touches the border
  const cnt = boxCount(reach, w, h, r);
  const core = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const x = i % w;
    const y = (i - x) / w;
    const area =
      (Math.min(w, x + r + 1) - Math.max(0, x - r)) * (Math.min(h, y + r + 1) - Math.max(0, y - r));
    core[i] = cnt[i] === area ? 1 : 0;
  }
  const wide = floodFromBorder(core, w, h);
  // dilate back by the same radius, inside the dark area reached from the border
  const grow = boxCount(wide, w, h, r);
  const isBg = new Uint8Array(n);
  for (let i = 0; i < n; i++) isBg[i] = grow[i]! > 0 && reach[i] ? 1 : 0;
  // a band just inside the outline where dark glow fades out too
  const soft = opt.soft ?? opt.high;
  const band = soft > opt.high ? boxCount(isBg, w, h, 2 * r) : null;
  const out = new Uint8ClampedArray(src.length);
  out.set(src);
  const edge = new Uint8Array(n); // pixels whose transparency was set here (the outline zone)
  for (let i = 0; i < n; i++) {
    const d = dist[i]!;
    let a: number;
    if (isBg[i]) a = d <= opt.low ? 0 : (d - opt.low) / (opt.high - opt.low);
    else if (band && band[i]! > 0 && d < soft) a = d <= opt.low ? 0 : (d - opt.low) / (soft - opt.low);
    else continue;
    edge[i] = 1;
    const o = i * 4;
    out[o + 3] = Math.round(a * 255);
    // un-premultiply against the background, but never brighten a faint edge too much (pale fringes)
    if (a > 0)
      for (let c = 0; c < 3; c++)
        out[o + c] = Math.max(0, Math.min(255, bg[c]! + (src[o + c]! - bg[c]!) / Math.max(a, 0.6)));
  }
  smoothEdgeAlpha(out, edge, w, h, Math.max(1, Math.round(r / 2)));
  return out;
}

/**
 * The square erosion leaves stair-steps along the outline: inside the outline zone the transparency is
 * averaged over a small square, so the edge becomes a soft gradient.
 */
function smoothEdgeAlpha(px: Uint8ClampedArray, edge: Uint8Array, w: number, h: number, r: number): void {
  const n = w * h;
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = px[i * 4 + 3]!;
  const tmp = new Float32Array(n);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0;
      let k = 0;
      for (let dx = -r; dx <= r; dx++) {
        const xx = x + dx;
        if (xx >= 0 && xx < w) {
          s += a[y * w + xx]!;
          k++;
        }
      }
      tmp[y * w + x] = s / k;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!edge[i]) continue;
      let s = 0;
      let k = 0;
      for (let dy = -r; dy <= r; dy++) {
        const yy = y + dy;
        if (yy >= 0 && yy < h) {
          s += tmp[yy * w + x]!;
          k++;
        }
      }
      px[i * 4 + 3] = Math.min(px[i * 4 + 3]!, Math.round(s / k));
    }
}

/** Clears rectangles of a picture (shares of its width and height): stray bits like a blurred far fin. */
export function eraseRects(px: Uint8ClampedArray, w: number, h: number, rects: readonly number[][]): void {
  for (const [x0, y0, x1, y1] of rects)
    for (let y = Math.round(y0! * h); y < Math.round(y1! * h); y++)
      for (let x = Math.round(x0! * w); x < Math.round(x1! * w); x++) px[(y * w + x) * 4 + 3] = 0;
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
 * Any picture but a card can end in `_flip` instead (e.g. `<id>_front_flip.jpg`) to be mirrored too:
 * in battle the wild beast faces left and yours swims away towards the upper right.
 */
export function parseInboxName(file: string): { id: string; kind: InboxKind; mirror: boolean } | null {
  const m =
    /^(.+?)_(card|side_open|side|front_open|front|back_open|back)(_left|_flip)?\.(jpe?g|png|webp)$/i.exec(
      file,
    );
  if (!m) return null;
  const kind = m[2]!.toLowerCase() as InboxKind;
  if (kind === 'card' && m[3]) return null;
  return { id: m[1]!.toLowerCase(), kind, mirror: !!m[3] };
}

/** Battle extras in art-inbox/: background layers, the taming shell, button and type icons. */
export type ExtraName =
  | { kind: 'bg'; place: string; layer: 'far' | 'mid' | 'front' | 'ground' }
  | { kind: 'item'; id: string }
  | { kind: 'icon'; id: string }
  | { kind: 'world'; id: string };

/** `bg_<place>_<layer>`, `conchiglia` / `conchiglia_aperta`, `icona_<name>` / `tipo_<name>`. */
export function parseExtraName(file: string): ExtraName | null {
  const base = /^(.+)\.(jpe?g|png|webp)$/i.exec(file)?.[1]?.toLowerCase();
  if (!base) return null;
  const bg = /^bg_([a-z]+)_(far|mid|front|ground)$/.exec(base);
  if (bg) return { kind: 'bg', place: bg[1]!, layer: bg[2] as 'far' };
  if (base === 'conchiglia' || base === 'conchiglia_aperta') return { kind: 'item', id: base };
  if (/^(icona|tipo)_[a-z]+$/.test(base)) return { kind: 'icon', id: base };
  if (/^(parete_[a-z]+(_\d)?|iceberg_\d|molo_[a-z]+|sottomarino_\d)$/.test(base))
    return { kind: 'world', id: base };
  return null;
}

/**
 * Removes a flat green background (#00FF00): the greener a pixel is than its red and blue, the more
 * transparent; the green tint left on the edges is taken out ("despill").
 */
export function removeGreenBackground(img: Raw, low = 30, high = 90): Uint8ClampedArray {
  const src = img.data;
  const out = new Uint8ClampedArray(src.length);
  out.set(src);
  for (let o = 0; o < src.length; o += 4) {
    const r = src[o]!;
    const g = src[o + 1]!;
    const b = src[o + 2]!;
    const excess = g - Math.max(r, b);
    const a = excess <= low ? 1 : excess >= high ? 0 : 1 - (excess - low) / (high - low);
    out[o + 3] = Math.round(a * (src[o + 3] ?? 255));
    if (excess > 0) out[o + 1] = Math.max(r, b);
  }
  return out;
}

/**
 * Was the picture made on a green screen (owner, 3 ottobre: "generiamo gli asset con green screen")? True when
 * most of its border is strongly green.
 */
export function onGreenScreen(img: Raw): boolean {
  const { data, width: w, height: h } = img;
  let green = 0;
  let n = 0;
  const look = (x: number, y: number): void => {
    const o = (y * w + x) * 4;
    n++;
    if (data[o + 1]! > data[o]! + 60 && data[o + 1]! > data[o + 2]! + 60) green++;
  };
  for (let x = 0; x < w; x += 4) {
    look(x, 0);
    look(x, h - 1);
  }
  for (let y = 0; y < h; y += 4) {
    look(0, y);
    look(w - 1, y);
  }
  return green / n > 0.6;
}

/** A white-on-black icon becomes white with its brightness as transparency (the game tints it). */
export function iconFromBlack(img: Raw): Uint8ClampedArray {
  const src = img.data;
  const out = new Uint8ClampedArray(src.length);
  for (let o = 0; o < src.length; o += 4) {
    const v = Math.max(src[o]!, src[o + 1]!, src[o + 2]!);
    out[o] = out[o + 1] = out[o + 2] = 255;
    out[o + 3] = v < 40 ? 0 : v > 200 ? 255 : Math.round(((v - 40) / 160) * 255);
  }
  return out;
}

/**
 * A creature cut by the edge of the picture (a fin out of frame) ends with a hard straight line. On each side
 * the creature touches, its transparency fades in over `frac` of the picture's shorter side, so the cut
 * melts into the water instead.
 */
export function fadeCutEdges(px: Uint8ClampedArray, w: number, h: number, frac = 0.06): void {
  const fw = Math.max(2, Math.round(Math.min(w, h) * frac));
  const touches = (side: 'l' | 'r' | 't' | 'b'): boolean => {
    for (let k = 0; k < (side === 'l' || side === 'r' ? h : w); k++)
      for (let d = 0; d < 2; d++) {
        const x = side === 'l' ? d : side === 'r' ? w - 1 - d : k;
        const y = side === 't' ? d : side === 'b' ? h - 1 - d : k;
        if (px[(y * w + x) * 4 + 3]! > 40) return true;
      }
    return false;
  };
  const sides = { l: touches('l'), r: touches('r'), t: touches('t'), b: touches('b') };
  if (!sides.l && !sides.r && !sides.t && !sides.b) return;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let k = 1;
      if (sides.l) k = Math.min(k, x / fw);
      if (sides.r) k = Math.min(k, (w - 1 - x) / fw);
      if (sides.t) k = Math.min(k, y / fw);
      if (sides.b) k = Math.min(k, (h - 1 - y) / fw);
      if (k < 1) px[(y * w + x) * 4 + 3] = Math.round(px[(y * w + x) * 4 + 3]! * k * k * (3 - 2 * k));
    }
}

/**
 * Background shut inside a coiled body (a serpent's loops): dark areas that do not touch the border but are as
 * dark as the background and at least `minShare` of the picture become transparent too. Only for pictures that
 * need it: on others it would hole a dark open mouth.
 */
export function clearEnclosedBackground(
  img: Raw,
  out: Uint8ClampedArray,
  bg: Rgb,
  maxDist = 14,
  minShare = 0.002,
): void {
  const { width: w, height: h, data } = img;
  const n = w * h;
  const dark = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const d = Math.max(
      Math.abs(data[o]! - bg[0]),
      Math.abs(data[o + 1]! - bg[1]),
      Math.abs(data[o + 2]! - bg[2]),
    );
    dark[i] = d < maxDist && out[o + 3]! > 0 ? 1 : 0;
  }
  const seen = new Uint8Array(n);
  const stack: number[] = [];
  const region: number[] = [];
  for (let s = 0; s < n; s++) {
    if (!dark[s] || seen[s]) continue;
    region.length = 0;
    stack.push(s);
    seen[s] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      region.push(i);
      const x = i % w;
      for (const k of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w])
        if (k >= 0 && k < n && dark[k] && !seen[k]) {
          seen[k] = 1;
          stack.push(k);
        }
    }
    if (region.length >= n * minShare) for (const i of region) out[i * 4 + 3] = 0;
  }
}

/**
 * An open mouth whose dark throat was taken for background: inside the rectangle (shares of the picture),
 * each column is made solid between its topmost and lowest solid pixel (the jaws), with the original colours,
 * but only where the row still has something solid further right (the teeth): the open front stays open.
 */
export function fillMouth(img: Raw, out: Uint8ClampedArray, rect: number[]): void {
  // (several rectangles can be given one after another: [x0, y0, x1, y1, x0, y0, …])
  if (rect.length > 4) {
    for (let i = 0; i + 3 < rect.length; i += 4) fillMouth(img, out, rect.slice(i, i + 4));
    return;
  }
  const { width: w, height: h, data: src } = img;
  const [x0, y0, x1, y1] = [rect[0]! * w, rect[1]! * h, rect[2]! * w, rect[3]! * h].map(Math.round) as [
    number,
    number,
    number,
    number,
  ];
  const rightmost: number[] = [];
  for (let y = Math.max(0, y0); y < Math.min(h, y1); y++) {
    rightmost[y] = -1;
    for (let x = Math.min(w, x1 + Math.round(w * 0.03)) - 1; x >= x0; x--)
      if (out[(y * w + x) * 4 + 3]! > 128) {
        rightmost[y] = x;
        break;
      }
  }
  for (let x = Math.max(0, x0); x < Math.min(w, x1); x++) {
    let top = -1;
    let bottom = -1;
    for (let y = Math.max(0, y0); y < Math.min(h, y1); y++) {
      if (out[(y * w + x) * 4 + 3]! > 128) {
        if (top < 0) top = y;
        bottom = y;
      }
    }
    for (let y = top + 1; top >= 0 && y < bottom; y++) {
      if (x >= rightmost[y]!) continue;
      const o = (y * w + x) * 4;
      out[o] = src[o]!;
      out[o + 1] = src[o + 1]!;
      out[o + 2] = src[o + 2]!;
      out[o + 3] = 255;
    }
  }
}
