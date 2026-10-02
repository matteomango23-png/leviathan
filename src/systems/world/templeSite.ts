// Where the sunken temples lie and what they are made of (tappa 14). Each one sits in the middle of the first
// stretch of its kind far enough from the coast, half buried in the floor; the floor around bends to meet it.
// Its tiles come from the layout in data/temples.ts: carved stone, gates, water.
import { ENDLESS } from '../../data/endless';
import { TEMPLES, type TempleDef } from '../../data/temples';
import { TILE, type TileValue } from '../../data/worldLayout';
import { clamp, smoothstep } from '../math';
import { biomeOf, kmFromCoast, stretchFloor } from './stretches';

export interface TempleSite {
  def: TempleDef;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Where the floor meets its sides (world y). */
  ground: number;
}

let sites: TempleSite[] | null = null;

/** The temples and where they lie (fixed by the seed of the endless sea). */
export function templeSites(): TempleSite[] {
  if (sites) return sites;
  sites = TEMPLES.map((def) => {
    const c = def.cell;
    let k = 0;
    while (
      biomeOf(k).id !== def.where.biome ||
      kmFromCoast(ENDLESS.startX + (k + 0.5) * ENDLESS.stretch) < def.where.minKm
    )
      k++;
    const mid = ENDLESS.startX + (k + 0.5) * ENDLESS.stretch;
    const w = def.layout[0]!.length * c;
    const x0 = Math.round((mid - w / 2) / c) * c;
    const y0 = Math.round((stretchFloor(k, mid) - def.rise * c) / c) * c;
    return { def, x0, y0, x1: x0 + w, y1: y0 + def.layout.length * c, ground: y0 + def.rise * c };
  });
  return sites;
}

/** The temple whose columns hold x (with `margin` units around it), if any. */
export function templeAtX(x: number, margin = 0): TempleSite | null {
  if (x < ENDLESS.startX) return null;
  return templeSites().find((t) => x >= t.x0 - margin && x < t.x1 + margin) ?? null;
}

/** The temple a point is inside, if any. */
export function templeAt(x: number, y: number): TempleSite | null {
  const t = templeAtX(x);
  return t && y >= t.y0 && y < t.y1 ? t : null;
}

/** The layout character at a point of a temple. */
export function templeCharAt(t: TempleSite, x: number, y: number): string {
  const c = t.def.cell;
  return t.def.layout[Math.floor((y - t.y0) / c)]?.[Math.floor((x - t.x0) / c)] ?? '#';
}

/** The tile at a point over a temple's columns (water above it, its layout, rock under it), or null elsewhere. */
export function templeTileAt(x: number, y: number): TileValue | null {
  const t = templeAtX(x);
  if (!t) return null;
  if (y < t.y0) return TILE.water;
  if (y >= t.y1) return TILE.rock;
  const ch = templeCharAt(t, x, y);
  if (ch === '#') return TILE.temple;
  return /[0-9]/.test(ch) ? TILE.gate : TILE.water;
}

/** The deepest point of a temple under x (for chunks: no shortcut filling rock above it), or null. */
export function templeBottomAt(x: number): number | null {
  return templeAtX(x)?.y1 ?? null;
}

/** The floor bends to meet the temple's sides; over the temple it is its roof. */
export function floorNearTemple(x: number, natural: number): number {
  const t = templeAtX(x, TEMPLES[0] ? Math.max(...TEMPLES.map((d) => d.flatten)) : 0);
  if (!t) return natural;
  if (x >= t.x0 && x < t.x1) return t.y0;
  const away = x < t.x0 ? t.x0 - x : x - t.x1;
  return t.ground + (natural - t.ground) * smoothstep(clamp(away / t.def.flatten, 0, 1));
}

/** Every cell of a temple holding one of these characters, with its centre. */
export function templeCells(
  t: TempleSite,
  chars: string,
): { ch: string; x: number; y: number; tx: number; ty: number }[] {
  const c = t.def.cell;
  const out: { ch: string; x: number; y: number; tx: number; ty: number }[] = [];
  t.def.layout.forEach((row, r) => {
    for (let i = 0; i < row.length; i++)
      if (chars.includes(row[i]!))
        out.push({ ch: row[i]!, x: t.x0 + (i + 0.5) * c, y: t.y0 + (r + 0.5) * c, tx: i, ty: r });
  });
  return out;
}

/** The temple's air vents: bubbles rising from the floor of a cell marked V, up to the ceiling. */
export function templeVents(t: TempleSite): { x: number; y: number; height: number }[] {
  const c = t.def.cell;
  return templeCells(t, 'V').map((v) => {
    let up = v.ty;
    while (up > 0 && t.def.layout[up - 1]![v.tx] !== '#') up--;
    return { x: v.x, y: v.y + c / 2, height: (v.ty - up + 1) * c };
  });
}

/** The temple vent whose bubbles you are in, if any. */
export function templeVentAt(x: number, y: number): { x: number; y: number } | null {
  const t = templeAt(x, y);
  if (!t) return null;
  return (
    templeVents(t).find(
      (v) => Math.abs(x - v.x) < ENDLESS.vents.radius && y < v.y + 4 && y > v.y - v.height,
    ) ?? null
  );
}
