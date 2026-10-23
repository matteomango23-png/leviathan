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
