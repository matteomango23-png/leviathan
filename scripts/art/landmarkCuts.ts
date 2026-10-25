// Holes cut into a landmark's picture by `npm run art` (lot M2): the painted galleon in cross-section had its rooms
// closed to the sea, so the breach in its bow and the doorways between its rooms are cut out of both the picture and
// its solid mask — what you see open is what you can swim through. Shares of the picture's visible box.
import type { Raw } from './cutout.ts';

interface Cut {
  /** A jagged hole: centre, radii (shares), and how ragged its edge is (share of the radius). */
  kind: 'hole';
  x: number;
  y: number;
  rx: number;
  ry: number;
  ragged: number;
}
interface Door {
  kind: 'door';
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export const LANDMARK_CUTS: Record<string, (Cut | Door)[]> = {
  luogo_galeone_dentro: [
    // the breach in the bow, opening the first room to the sea
    { kind: 'hole', x: 0.14, y: 0.62, rx: 0.12, ry: 0.1, ragged: 0.22 },
    // the two doorways (the painted doors in the partitions)
    { kind: 'door', x0: 0.393, y0: 0.6, x1: 0.447, y1: 0.752 },
    { kind: 'door', x0: 0.627, y0: 0.6, x1: 0.68, y1: 0.752 },
  ],
};

/** Pictures whose bottom fades out (this share of their height): an outpost's pillars and coral, an islet's roots go on down into
 *  the dark instead of ending at a line in the water (lot P1). */
export const BOTTOM_FADES: Record<string, number> = {
  molo_fondo: 0.35,
  avamposto_orlo: 0.4,
  avamposto_corallo: 0.42,
  delta_isola_1: 0.32,
  delta_isola_2: 0.2,
};

/** Pictures whose left and right ends fade out (this share of their width): the floor piece under the piers had
 *  its sand bed cut straight at both ends (24 ottobre). */
export const SIDE_FADES: Record<string, { left: number; right: number }> = {
  molo_fondo: { left: 0.14, right: 0.14 },
  luogo_galeone_dentro: { left: 0, right: 0.06 }, // its stern was cut by the picture's frame
  ingresso_galleria: { left: 0.3, right: 0 }, // the side towards the open trench melts into the water (lot M3)
};

/** Fades the two ends of a picture's visible box out, if it is listed (ragged, like the bottom). */
export function applySideFade(
  id: string,
  px: Uint8ClampedArray,
  img: Raw,
  box: { x0: number; y0: number; x1: number; y1: number },
): void {
  const share = SIDE_FADES[id];
  if (!share) return;
  const w = box.x1 - box.x0 + 1;
  const h = box.y1 - box.y0 + 1;
  for (let y = box.y0; y <= box.y1; y++) {
    const v = (y - box.y0) / h;
    const ragged = 0.75 + 0.25 * Math.sin(v * 11.3 + 0.4);
    for (let x = box.x0; x <= box.x1; x++) {
      const fromLeft = x - box.x0;
      const fromRight = box.x1 - x;
      const left = w * share.left * ragged;
      const right = w * share.right * ragged;
      const t = Math.min(left > 0 ? fromLeft / left : 1, right > 0 ? fromRight / right : 1);
      if (t >= 1) continue;
      const o = (y * img.width + x) * 4 + 3;
      px[o] = Math.round(px[o]! * t * t);
    }
  }
}

/** Fades the bottom of a picture's visible box out, if it is listed. */
export function applyBottomFade(
  id: string,
  px: Uint8ClampedArray,
  img: Raw,
  box: { x0: number; y0: number; x1: number; y1: number },
): void {
  const share = BOTTOM_FADES[id];
  if (!share) return;
  const h = box.y1 - box.y0 + 1;
  const rows = Math.round(h * share);
  const w = box.x1 - box.x0 + 1;
  for (let x = box.x0; x <= box.x1; x++) {
    // each column fades out at its own height (a ragged edge, never one straight line: owner, 24 ottobre); the
    // fade always ends before the last row
    const u = (x - box.x0) / w;
    const end =
      box.y1 - h * share * 0.35 * (0.5 + 0.5 * Math.sin(u * 9.1 + 0.7) * 0.6 + 0.4 * Math.sin(u * 23.3));
    const start = end - rows;
    for (let y = Math.max(box.y0, Math.floor(start)); y <= box.y1; y++) {
      const t = Math.min(1, Math.max(0, (y - start) / (end - start)));
      const o = (y * img.width + x) * 4 + 3;
      px[o] = Math.round(px[o]! * (1 - t) * (1 - t));
    }
  }
}

const jag = (a: number): number =>
  Math.sin(a * 7) * 0.5 + Math.sin(a * 13 + 1.7) * 0.3 + Math.sin(a * 23 + 0.4) * 0.2;

/** Clears the cuts of a picture (its pixels' alpha), inside its visible box. */
export function applyCuts(
  id: string,
  px: Uint8ClampedArray,
  img: Raw,
  box: { x0: number; y0: number; x1: number; y1: number },
): void {
  const cuts = LANDMARK_CUTS[id];
  if (!cuts) return;
  const bw = box.x1 - box.x0 + 1;
  const bh = box.y1 - box.y0 + 1;
  for (let y = box.y0; y <= box.y1; y++)
    for (let x = box.x0; x <= box.x1; x++) {
      const u = (x - box.x0) / bw;
      const v = (y - box.y0) / bh;
      const open = cuts.some((c) => {
        if (c.kind === 'door') return u >= c.x0 && u <= c.x1 && v >= c.y0 && v <= c.y1;
        const dx = (u - c.x) / c.rx;
        const dy = (v - c.y) / c.ry;
        const r = 1 + jag(Math.atan2(dy, dx)) * c.ragged;
        return dx * dx + dy * dy < r * r;
      });
      if (open) px[(y * img.width + x) * 4 + 3] = 0;
    }
}

/** Pictures whose dark middle is a hole (a tunnel's mouth, lot M3): the near-black pixels joined to the picture's
 *  middle are cleared, so the gallery shows through the arch. */
export const DARK_HOLES: Record<string, { x: number; y: number; rx: number; ry: number }> = {
  // the hole of the arch only (shares of its box): the ink outlines of its rock are dark too
  ingresso_galleria: { x: 0.52, y: 0.6, rx: 0.2, ry: 0.29 },
};

export function clearDarkMiddle(
  id: string,
  px: Uint8ClampedArray,
  img: Raw,
  box: { x0: number; y0: number; x1: number; y1: number },
): void {
  const hole = DARK_HOLES[id];
  if (!hole) return;
  const W = img.width;
  const bw = box.x1 - box.x0 + 1;
  const bh = box.y1 - box.y0 + 1;
  const inHole = (x: number, y: number): boolean =>
    ((x - box.x0) / bw - hole.x) ** 2 / hole.rx ** 2 + ((y - box.y0) / bh - hole.y) ** 2 / hole.ry ** 2 < 1;
  const dark = (x: number, y: number): boolean => {
    const o = (y * W + x) * 4;
    return px[o + 3]! > 0 && px[o]! + px[o + 1]! + px[o + 2]! < 75;
  };
  const sx = Math.round(box.x0 + bw * hole.x);
  const sy = Math.round(box.y0 + bh * hole.y);
  if (!dark(sx, sy)) return;
  const seen = new Uint8Array(W * img.height);
  const stack = [sy * W + sx];
  while (stack.length) {
    const i = stack.pop()!;
    if (seen[i]) continue;
    seen[i] = 1;
    const x = i % W;
    const y = (i - x) / W;
    if (!dark(x, y) || !inHole(x, y)) continue;
    px[i * 4 + 3] = 0;
    if (x > box.x0) stack.push(i - 1);
    if (x < box.x1) stack.push(i + 1);
    if (y > box.y0) stack.push(i - W);
    if (y < box.y1) stack.push(i + W);
  }
}

/** Pictures whose two ends (top and bottom) fade out, raggedly (this share of their height): the Cattedrale's
 *  columns, whose ends go into the cave's floor and ceiling (lot M3). */
export const END_FADES: Record<string, number> = { colonna_cattedrale_1: 0.08, colonna_cattedrale_2: 0.08 };

export function applyEndFades(
  id: string,
  px: Uint8ClampedArray,
  img: Raw,
  box: { x0: number; y0: number; x1: number; y1: number },
): void {
  const share = END_FADES[id];
  if (!share) return;
  const w = box.x1 - box.x0 + 1;
  const h = box.y1 - box.y0 + 1;
  for (let x = box.x0; x <= box.x1; x++) {
    const u = (x - box.x0) / w;
    const rows = h * share * (0.7 + 0.3 * Math.sin(u * 13.7 + 0.9));
    for (let k = 0; k < rows; k++) {
      const t = (k / rows) ** 2;
      for (const y of [box.y0 + k, box.y1 - k]) {
        const o = (y * img.width + x) * 4 + 3;
        px[o] = Math.round(px[o]! * t);
      }
    }
  }
}
