// The 3D hulls' pieces for the turret's view (owner, 17 novembre 2026: "anche in modo abbastanza sommario 3D… si vede
// lo scafo da sotto"; "Preferisco che mi crei un modello tu in 3D per la nave nemica"): a ship's hull is a run of
// cross-sections — wide in the middle, sharp and rising at the bow, square at the stern, a keel under it, the red of
// the antifouling below the water and its stripe at the waterline — and its deck; a U-Boat is a cigar; on them,
// blocks (houses, funnels, masts, guns). Built in the ship's own frame (x ahead to the bow, y to its right, z up from
// the waterline), in metres. The models of each class are in hullModels.ts. Pure logic.
import { HULL_3D } from '../../data/turret';

export type V3 = { x: number; y: number; z: number };

/** Which part of the ship a face is: its colour comes from it. */
export type Part = 'bottom' | 'boot' | 'side' | 'deck' | 'top' | 'metal' | 'funnel' | 'band';

export interface Face {
  pts: V3[];
  part: Part;
}

/** How wide the hull is along it (0 stern … 1 bow), as a share of its beam. */
function widthAt(t: number): number {
  if (t > 0.68) return Math.max(0.04, Math.cos(((t - 0.68) / 0.32) * (Math.PI / 2)));
  if (t < 0.12) return 0.74 + (t / 0.12) * 0.26;
  return 1;
}

/** Half the beam at this point along it (x in m from the middle). */
export const halfBeamAt = (x: number, length: number, beam: number): number =>
  ((length * beam) / 2) * widthAt(x / length + 0.5);

/** The deck's height above the water at this point (x in m from the middle): the bow rises by `bowRise`. */
export const sheerAt = (x: number, length: number, freeboard: number, bowRise: number): number => {
  const t = x / length + 0.5;
  return freeboard * (1 + (bowRise * Math.max(0, t - 0.6)) / 0.4 + (0.08 * Math.max(0, 0.15 - t)) / 0.15);
};

/** Each ring's corners, from the deck's left edge round under the keel to its right edge, and their parts. */
const RING_PARTS: Part[] = ['side', 'boot', 'bottom', 'bottom', 'bottom', 'bottom', 'boot', 'side'];

/** A ship's hull: `length` (m), freeboard and draft (m), beam (share of the length), bow rise. */
export function shipHull3d(
  length: number,
  freeboard: number,
  draft: number,
  beam = 0.16,
  bowRise = 0.3,
): Face[] {
  const n = HULL_3D.stations;
  const rings: V3[][] = [];
  const boot = Math.min(0.6, freeboard * 0.25);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = (t - 0.5) * length;
    const b = halfBeamAt(x, length, beam);
    const d = draft * (0.85 + 0.15 * Math.sin(t * Math.PI));
    const top = sheerAt(x, length, freeboard, bowRise);
    rings.push([
      { x, y: -b, z: top },
      { x, y: -b, z: boot },
      { x, y: -b * 0.98, z: -boot },
      { x, y: -b * 0.75, z: -d * 0.7 },
      { x, y: 0, z: -d },
      { x, y: b * 0.75, z: -d * 0.7 },
      { x, y: b * 0.98, z: -boot },
      { x, y: b, z: boot },
      { x, y: b, z: top },
    ]);
  }
  const faces: Face[] = [];
  for (let i = 0; i < n; i++) {
    const a = rings[i]!;
    const c = rings[i + 1]!;
    for (let k = 0; k < a.length - 1; k++)
      faces.push({ pts: [a[k]!, c[k]!, c[k + 1]!, a[k + 1]!], part: RING_PARTS[k]! });
    faces.push({ pts: [a[a.length - 1]!, c[c.length - 1]!, c[0]!, a[0]!], part: 'deck' });
  }
  // the square stern
  faces.push({ pts: [...rings[0]!].reverse(), part: 'side' });
  return faces;
}

/** A U-Boat's cigar `length` long round its middle at depth 0 (the duel places it); `R` its radius. */
export function cigarHull(length: number): Face[] {
  const n = HULL_3D.stations;
  const R = length * HULL_3D.cigar;
  const around = 10;
  const rings: V3[][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = (t - 0.5) * length;
    const r = R * Math.max(0.08, Math.sin(Math.PI * Math.min(1, t * 1.12 + 0.03)) ** 0.55);
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
      const up = Math.sin(((k + 0.5) / around) * Math.PI * 2);
      faces.push({
        pts: [a[k]!, a[k1]!, c[k1]!, c[k]!],
        part: up > 0.2 ? 'side' : up > -0.2 ? 'boot' : 'bottom',
      });
    }
  return faces;
}

/** A closed block's five visible faces (no bottom), all of one part. */
export function box(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  part: Part = 'top',
): Face[] {
  const p = (x: number, y: number, z: number): V3 => ({ x, y, z });
  return [
    { pts: [p(x0, y0, z1), p(x1, y0, z1), p(x1, y1, z1), p(x0, y1, z1)], part },
    { pts: [p(x0, y0, z0), p(x1, y0, z0), p(x1, y0, z1), p(x0, y0, z1)], part },
    { pts: [p(x0, y1, z0), p(x0, y1, z1), p(x1, y1, z1), p(x1, y1, z0)], part },
    { pts: [p(x1, y0, z0), p(x1, y1, z0), p(x1, y1, z1), p(x1, y0, z1)], part },
    { pts: [p(x0, y0, z0), p(x0, y0, z1), p(x0, y1, z1), p(x0, y1, z0)], part },
  ];
}

/** Broken in two at its middle: the stern's faces and the bow's (together, all of them). */
export function splitHalves(faces: Face[]): [Face[], Face[]] {
  const stern: Face[] = [];
  const bow: Face[] = [];
  for (const f of faces) (f.pts.reduce((s, p) => s + p.x, 0) / f.pts.length < 0 ? stern : bow).push(f);
  return [stern, bow];
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
