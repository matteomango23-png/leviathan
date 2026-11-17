// A rough 3D hull for the turret's view (owner, 17 novembre 2026: "anche in modo abbastanza sommario 3D… si vede lo
// scafo da sotto"): a ship is a run of cross-sections — wide in the middle, sharp at the bow, square at the stern, a
// keel under it — with its deck and a block of superstructure; a U-Boat is a cigar with its tower. Built in the
// ship's own frame (x ahead to the bow, y to its right, z up from the waterline), in metres. Pure logic.
import { HULL_3D } from '../../data/turret';

export type V3 = { x: number; y: number; z: number };

export interface Face {
  pts: V3[];
  /** Which part: the colour comes from it. */
  part: 'bottom' | 'side' | 'deck' | 'top';
}

/** How wide the hull is along it (0 stern … 1 bow), as a share of its beam. */
function widthAt(t: number): number {
  if (t > 0.7) return Math.max(0.04, Math.cos(((t - 0.7) / 0.3) * (Math.PI / 2)));
  if (t < 0.12) return 0.72 + (t / 0.12) * 0.28;
  return 1;
}

/** A ship's hull: `length` (m), its freeboard (deck above the water) and draft (keel under it), in metres. */
export function shipHull3d(length: number, freeboard: number, draft: number): Face[] {
  const n = HULL_3D.stations;
  const B = length * HULL_3D.beam;
  // each station's ring, from the deck's left edge round under the keel to its right edge
  const rings: V3[][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = (t - 0.5) * length;
    const b = (B / 2) * widthAt(t);
    const d = draft * (0.85 + 0.15 * Math.sin(t * Math.PI));
    const sheer = freeboard * (1 + (0.25 * Math.max(0, t - 0.7)) / 0.3);
    rings.push([
      { x, y: -b, z: sheer },
      { x, y: -b, z: 0 },
      { x, y: -b * 0.75, z: -d * 0.7 },
      { x, y: 0, z: -d },
      { x, y: b * 0.75, z: -d * 0.7 },
      { x, y: b, z: 0 },
      { x, y: b, z: sheer },
    ]);
  }
  const faces: Face[] = [];
  for (let i = 0; i < n; i++) {
    const a = rings[i]!;
    const c = rings[i + 1]!;
    for (let k = 0; k < a.length - 1; k++)
      faces.push({ pts: [a[k]!, c[k]!, c[k + 1]!, a[k + 1]!], part: k === 0 || k === 5 ? 'side' : 'bottom' });
    faces.push({ pts: [a[a.length - 1]!, c[c.length - 1]!, c[0]!, a[0]!], part: 'deck' });
  }
  // the square stern
  faces.push({ pts: [...rings[0]!].reverse(), part: 'side' });
  // the superstructure: a block on the deck
  const S = HULL_3D.superstructure;
  const x0 = S.from * length;
  const x1 = S.to * length;
  const w = (B / 2) * S.width;
  const z0 = freeboard;
  const z1 = freeboard + Math.max(1.5, freeboard * S.height + length * 0.025);
  faces.push(...box(x0, x1, -w, w, z0, z1));
  return faces;
}

/** A U-Boat: a cigar `length` long round its middle at depth 0 (the duel places it), and its tower. */
export function cigar3d(length: number): Face[] {
  const n = HULL_3D.stations;
  const R = length * HULL_3D.cigar;
  const around = 8;
  const rings: V3[][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = (t - 0.5) * length;
    const r = R * Math.max(0.08, Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.02)) ** 0.6);
    rings.push(
      Array.from({ length: around }, (_, k) => {
        const a = (k / around) * Math.PI * 2;
        return { x, y: Math.cos(a) * r, z: Math.sin(a) * r };
      }),
    );
  }
  const faces: Face[] = [];
  for (let i = 0; i < n; i++)
    for (let k = 0; k < around; k++) {
      const a = rings[i]!;
      const c = rings[i + 1]!;
      const k1 = (k + 1) % around;
      const up = Math.sin(((k + 0.5) / around) * Math.PI * 2) > 0;
      faces.push({ pts: [a[k]!, a[k1]!, c[k1]!, c[k]!], part: up ? 'side' : 'bottom' });
    }
  faces.push(...box(-length * 0.08, length * 0.08, -R * 0.35, R * 0.35, R * 0.8, R * 2));
  return faces;
}

/** A closed block's five visible faces (no bottom). */
function box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Face[] {
  const p = (x: number, y: number, z: number): V3 => ({ x, y, z });
  return [
    { pts: [p(x0, y0, z1), p(x1, y0, z1), p(x1, y1, z1), p(x0, y1, z1)], part: 'top' },
    { pts: [p(x0, y0, z0), p(x1, y0, z0), p(x1, y0, z1), p(x0, y0, z1)], part: 'top' },
    { pts: [p(x0, y1, z0), p(x0, y1, z1), p(x1, y1, z1), p(x1, y1, z0)], part: 'top' },
    { pts: [p(x1, y0, z0), p(x1, y1, z0), p(x1, y1, z1), p(x1, y0, z1)], part: 'top' },
    { pts: [p(x0, y0, z0), p(x0, y0, z1), p(x0, y1, z1), p(x0, y1, z0)], part: 'top' },
  ];
}

/** A point of the hull in the duel: its middle (a, s), heading (radians), and how deep its waterline sits (m). */
export function placeV3(
  v: V3,
  a: number,
  s: number,
  heading: number,
  depth: number,
): { a: number; s: number; z: number } {
  const c = Math.cos(heading);
  const sn = Math.sin(heading);
  return { a: a + v.x * c - v.y * sn, s: s + v.x * sn + v.y * c, z: v.z - depth };
}
