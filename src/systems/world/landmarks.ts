// Where the landmarks of the sea lie and which of their points are solid (lot M2; data/landmarks.ts). Like the
// temples (templeSite.ts): fixed by the seed of the endless sea, nothing saved, the floor bent to meet them; their
// solid parts come from their pictures' masks (ICEBERG_SHAPES, written by `npm run art`), so you bump into what
// you see. Pure logic.
import { ENDLESS } from '../../data/endless';
import { LANDMARK_SIGHT_M, LANDMARKS, type LandmarkDef, type LandmarkPiece } from '../../data/landmarks';
import { ICEBERG_SHAPES } from '../../data/sprites.generated';
import { WORLD } from '../../data/worldLayout';
import type { WreckDef } from '../../data/economy';
import { clamp, smoothstep } from '../math';
import { biomeOf, kmFromCoast, stretchFloor } from './stretches';
import { templeAtX } from './templeSite';
import type { GameEvent } from '../events';

export interface PieceBox {
  piece: LandmarkPiece;
  left: number;
  top: number;
  w: number;
  h: number;
}

export interface LandmarkSite {
  def: LandmarkDef;
  /** Its middle (x) and the floor under it (y). */
  x: number;
  ground: number;
  /** Its columns, all pieces together. */
  x0: number;
  x1: number;
  pieces: PieceBox[];
}

const m = (metres: number): number => metres * WORLD.unitsPerMetre;

/** The box of a piece (null if its picture is missing). */
function pieceBox(p: LandmarkPiece, x: number, ground: number): PieceBox | null {
  const shape = ICEBERG_SHAPES[p.art];
  if (!shape) return null;
  const w = m(p.widthM);
  const h = (w * shape.h) / shape.w;
  return { piece: p, left: x + m(p.dxM) - w / 2, top: ground + p.sink * h - h, w, h };
}

let sites: LandmarkSite[] | null = null;

/** The landmarks and where they lie (in the middle of the first stretch of their kind past their km, never on a
 *  temple's). */
export function landmarkSites(): LandmarkSite[] {
  if (sites) return sites;
  sites = LANDMARKS.map((def) => {
    let k = 0;
    const mid = (j: number): number => ENDLESS.startX + (j + 0.5) * ENDLESS.stretch;
    while (
      biomeOf(k).id !== def.where.biome ||
      kmFromCoast(mid(k)) < def.where.minKm ||
      templeAtX(mid(k), ENDLESS.stretch / 2)
    )
      k++;
    const x = mid(k);
    const ground = stretchFloor(k, x);
    const pieces = def.pieces.map((p) => pieceBox(p, x, ground)).filter((b): b is PieceBox => b !== null);
    const half = Math.max(m(20), ...pieces.map((b) => Math.max(x - b.left, b.left + b.w - x)));
    return { def, x, ground, x0: x - half, x1: x + half, pieces };
  });
  return sites;
}

/** The landmark whose columns hold x (with `margin` units around it), if any. */
export function landmarkAtX(x: number, margin = 0): LandmarkSite | null {
  if (x < ENDLESS.startX) return null;
  return landmarkSites().find((s) => x >= s.x0 - margin && x < s.x1 + margin) ?? null;
}

/** Is this point inside a solid piece of a landmark (its picture's mask)? */
export function landmarkSolidAt(x: number, y: number): boolean {
  const s = landmarkAtX(x);
  if (!s) return false;
  for (const b of s.pieces) {
    if (!b.piece.solid || x < b.left || x >= b.left + b.w || y < b.top || y >= b.top + b.h) continue;
    const u = (x - b.left) / b.w;
    const v = (y - b.top) / b.h;
    if (b.piece.open?.some(([x0, y0, x1, y1]) => u >= x0 && u <= x1 && v >= y0 && v <= y1)) continue;
    const mask = ICEBERG_SHAPES[b.piece.art]!.mask;
    const row = mask[Math.floor(v * mask.length)];
    if (row && row[Math.floor(u * row.length)] === '1') return true;
  }
  return false;
}

/** The floor bends to meet a landmark's ground; under it, it is flat. */
export function floorNearLandmark(x: number, natural: number): number {
  const s = landmarkAtX(x, Math.max(...LANDMARKS.map((d) => d.flatten)));
  if (!s) return natural;
  if (x >= s.x0 && x < s.x1) return s.ground;
  const away = x < s.x0 ? s.x0 - x : x - s.x1;
  return s.ground + (natural - s.ground) * smoothstep(clamp(away / s.def.flatten, 0, 1));
}

/** The chests inside the landmarks, placed (data/landmarks.ts `chest`). */
export function landmarkChests(): WreckDef[] {
  return landmarkSites().flatMap((s) => {
    const c = s.def.chest;
    const b = c && s.pieces.find((p) => p.piece === s.def.pieces[c.piece]);
    return c && b ? [{ ...c.def, x: b.left + c.u * b.w, y: b.top + c.v * b.h }] : [];
  });
}

/** Key of a found landmark in the bestiary's "seen" list (no change to the save file). */
export const landmarkKey = (id: string): string => `luogo:${id}`;

/** Swimming or sailing near a landmark finds it: it shows on the map from then on. */
export function discoverLandmarks(
  g: { seen: Set<string>; diver: { x: number; y: number } },
  events: GameEvent[],
): void {
  const reach = LANDMARK_SIGHT_M * WORLD.unitsPerMetre;
  for (const s of landmarkSites()) {
    if (g.seen.has(landmarkKey(s.def.id))) continue;
    if (Math.hypot(g.diver.x - s.x, (g.diver.y - s.ground) * 0.5) > reach) continue;
    g.seen.add(landmarkKey(s.def.id));
    events.push({ type: 'landmarkFound', name: s.def.name });
  }
}
