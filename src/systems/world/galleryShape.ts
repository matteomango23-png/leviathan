// The shape of the Gallerie (lot M3, galleries.ts): which points are open water inside a tunnel or a cave (the tile
// map carves them: endless.ts), the bubbles of their air pockets, the push of their currents, and the Cattedrale's
// columns, solid where their pictures are (their masks, written by `npm run art`). Pure logic.
import { ENDLESS } from '../../data/endless';
import { CATHEDRAL, GALLERIES } from '../../data/galleries';
import { ICEBERG_SHAPES } from '../../data/sprites.generated';
import { fbm, hash2 } from '../math';
import { galleriesAtX, gallerySites, type AirPocket, type Gallery } from './galleries';

const G = GALLERIES;

/** Distance from a point to the segment a-b, and how far along it (0…1). */
function toSegment(
  x: number,
  y: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): { d: number; t: number } {
  const vx = bx - ax;
  const vy = by - ay;
  const l = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / l));
  return { d: Math.hypot(x - ax - vx * t, y - ay - vy * t), t };
}

/** The tunnel segment holding a point: path, index, share along, or null. */
function inTunnel(g: Gallery, x: number, y: number, n: number): { path: number; i: number } | null {
  for (let p = 0; p < g.paths.length; p++) {
    const pts = g.paths[p]!;
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      const pad = Math.max(a.r, b.r) + G.wobble;
      if (x < Math.min(a.x, b.x) - pad || x > Math.max(a.x, b.x) + pad) continue;
      const s = toSegment(x, y, a.x, a.y, b.x, b.y);
      if (s.d < a.r + (b.r - a.r) * s.t + n) return { path: p, i };
    }
  }
  return null;
}

/** Inside one of the gallery's tunnels or caves? */
export function inGallery(g: Gallery, x: number, y: number): boolean {
  if (x < g.x0 || x > g.x1 || y < g.y0 || y > g.y1) return false;
  const n = (fbm(x * 0.045, y * 0.045) - 0.5) * 2 * G.wobble; // its walls are rock, never a smooth pipe
  for (const c of g.caves) {
    const dx = (x - c.x) / (c.rx + n);
    const dy = (y - c.y) / (c.ry + n);
    if (dx * dx + dy * dy < 1) return true;
  }
  return inTunnel(g, x, y, n) !== null;
}

/** A column of the Cattedrale: its picture's box (units), floor to ceiling of the cave, mirrored or not. */
export interface ColumnBox {
  art: string;
  left: number;
  top: number;
  w: number;
  h: number;
  flip: boolean;
}

const columnCache = new Map<number, ColumnBox[]>();

/** The Cattedrale's columns, spread across it, each into the rock at both ends. */
export function cathedralColumns(g: Gallery): ColumnBox[] {
  if (!g.cathedral) return [];
  const hit = columnCache.get(g.k);
  if (hit) return hit;
  const c = g.caves[0]!;
  const out: ColumnBox[] = [];
  const n = CATHEDRAL.columnCount;
  for (let i = 0; i < n; i++) {
    const art = CATHEDRAL.columns[i % CATHEDRAL.columns.length]!;
    const shape = ICEBERG_SHAPES[art];
    if (!shape) continue;
    const x = c.x - c.rx * 0.72 + (i / (n - 1)) * c.rx * 1.44 + (hash2(g.k, i) - 0.5) * 30;
    // none in front of where the tunnel comes in: the way in stays free (for the biggest submarine too)
    const entry = g.paths[0]![g.paths[0]!.length - 1]!;
    if (Math.abs(x - entry.x) < CATHEDRAL.entryClear) continue;
    const half = c.ry * Math.sqrt(Math.max(0, 1 - ((x - c.x) / c.rx) ** 2));
    const top = c.y - half - 20;
    const h = half * 2 + 40;
    const w = Math.min((h * shape.w) / shape.h, CATHEDRAL.columnMaxWidth);
    out.push({ art, left: x - w / 2, top, w, h, flip: hash2(i, g.k) > 0.5 });
  }
  columnCache.set(g.k, out);
  return out;
}

/** Is this point inside a column (its picture's mask)? */
function inColumn(g: Gallery, x: number, y: number): boolean {
  for (const b of cathedralColumns(g)) {
    if (x < b.left || x >= b.left + b.w || y < b.top || y >= b.top + b.h) continue;
    const mask = ICEBERG_SHAPES[b.art]!.mask;
    const u = (x - b.left) / b.w;
    const row = mask[Math.floor(((y - b.top) / b.h) * mask.length)];
    if (row && row[Math.floor((b.flip ? 1 - u : u) * row.length)] === '1') return true;
  }
  return false;
}

/** The gallery whose water holds this point, if any. */
export function galleryAt(x: number, y: number): Gallery | null {
  for (const g of galleriesAtX(x)) if (inGallery(g, x, y)) return g;
  return null;
}

/** Is this point open water carved by a gallery (not a column)? endless.ts asks before its rock. */
export function galleryOpenAt(x: number, y: number): boolean {
  const g = galleryAt(x, y);
  return !!g && !inColumn(g, x, y);
}

/** The deepest a gallery reaches under column x (generateChunk fills rock below without asking). */
export function galleryBottomAt(x: number): number | null {
  const gs = galleriesAtX(x);
  return gs.length ? Math.max(...gs.map((g) => g.y1)) : null;
}

/** The air pocket you are in (its bubble column), if any. */
export function galleryVentAt(x: number, y: number): AirPocket | null {
  for (const g of galleriesAtX(x))
    for (const a of g.airs)
      if (Math.abs(x - a.x) < ENDLESS.vents.radius && y < a.y + 4 && y > a.y - a.h) return a;
  return null;
}

/** The push of a current at this point (units/s), if it is in one. */
export function galleryCurrentAt(x: number, y: number): { vx: number; vy: number } | null {
  for (const g of galleriesAtX(x)) {
    if (!g.currents.length || !inGallery(g, x, y)) continue;
    const at = inTunnel(g, x, y, 0);
    if (!at) continue;
    const c = g.currents.find((q) => q.path === at.path && at.i >= q.i0 && at.i < q.i1);
    if (!c) continue;
    const pts = g.paths[at.path]!;
    const a = pts[at.i]!;
    const b = pts[at.i + 1]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { vx: ((b.x - a.x) / l) * c.dir * G.currentSpeed, vy: ((b.y - a.y) / l) * c.dir * G.currentSpeed };
  }
  return null;
}

/** The gallery ending in the Cattedrale. */
export const cathedralGallery = (): Gallery | null => gallerySites().find((g) => g.cathedral) ?? null;
