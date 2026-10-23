// The painted ice sheet (lot P1, data/worldArt.ts ICE_ART): where its slabs lie (between the breathing holes of the
// Mare di Ghiaccio and of the Banchisa stretches) and its pillars hang, and which of their points are solid — read
// from the pictures' masks (ICEBERG_SHAPES, written by `npm run art`), so you bump into the ice you see and into
// nothing else. A break (the ship's bow, a Glaciale's Rompighiaccio) takes whole columns of a slab and whole
// pillars, so the picture can open exactly where the ice is gone. Pure logic.
import { ENDLESS } from '../../data/endless';
import { ICEBERG_SHAPES } from '../../data/sprites.generated';
import { ICE_ART } from '../../data/worldArt';
import { ICE, TILE, WORLD } from '../../data/worldLayout';
import { hash2 } from '../math';
import { biomeOf } from './stretches';
import type { TileMap } from './tileMap';

export interface IceSlab {
  left: number;
  right: number;
  top: number;
  h: number;
  /** The width of one copy of the picture: they follow each other overlapping by ICE_ART.overlap of it and fading
   *  into each other there, each mirrored or not (slabCopyFlip). */
  copyW: number;
  /** Shapes its ragged ends. */
  seed: number;
}

export interface IcePillar {
  left: number;
  top: number;
  w: number;
  h: number;
  flip: boolean;
}

/** Are the pictures there? Without them the old drawn ice stays (endless.ts, worldGen.ts). */
export const iceArtReady = (): boolean => !!ICEBERG_SHAPES[ICE_ART.slab] && !!ICEBERG_SHAPES[ICE_ART.pillar];

function maskAt(id: string, u: number, v: number): boolean {
  const mask = ICEBERG_SHAPES[id]!.mask;
  const row = mask[Math.floor(v * mask.length)];
  return !!row && row[Math.floor(u * row.length)] === '1';
}

const jag = (a: number): number =>
  0.5 + 0.28 * Math.sin(a) + 0.14 * Math.sin(a * 2.7 + 1.3) + 0.08 * Math.sin(a * 5.3 + 0.4);

/** How far (units) a ragged end bites into the slab at this height of it (0 top … 1 bottom); `end` 0 left, 1 right. */
export function raggedInset(s: IceSlab, v: number, end: number): number {
  return ICE_ART.ragged * jag(v * 9 + s.seed * 13 + end * 5) + ICE_ART.raggedBottom * v;
}

function makeSlab(left: number, right: number): IceSlab {
  const shape = ICEBERG_SHAPES[ICE_ART.slab]!;
  return {
    left,
    right,
    top: WORLD.surfaceY - ICE_ART.above,
    h: ICE_ART.height,
    copyW: (ICE_ART.height * shape.w) / shape.h,
    seed: hash2(left * 0.013, 5.7),
  };
}

function makePillar(x: number, rx: number, ceilingY: number, k: number): IcePillar {
  const shape = ICEBERG_SHAPES[ICE_ART.pillar]!;
  const w = rx * ICE_ART.pillarPerRx;
  return {
    left: x - w / 2,
    top: ceilingY - ICE_ART.pillarUp,
    w,
    h: (w * shape.h) / shape.w,
    flip: hash2(k, x) > 0.5,
  };
}

/** The pieces of [x0, x1] between the holes. */
function between(x0: number, x1: number, holes: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  let a = x0;
  for (const [h0, h1] of [...holes].sort((p, q) => p[0] - q[0])) {
    if (h1 <= a || h0 >= x1) continue;
    if (h0 > a) out.push([a, h0]);
    a = Math.max(a, h1);
  }
  if (a < x1) out.push([a, x1]);
  return out;
}

interface Sheet {
  slabs: IceSlab[];
  pillars: IcePillar[];
}

/** Does a slab hold a pillar this wide here, clear of its ragged ends? */
const under = (slabs: IceSlab[], x: number, rx: number): boolean => {
  const half = (rx * ICE_ART.pillarPerRx) / 2 + ICE_ART.ragged + ICE_ART.raggedBottom;
  return slabs.some((s) => x - half > s.left && x + half < s.right);
};

let handMade: Sheet | null = null;

/** The Mare di Ghiaccio's sheet (data/worldLayout.ts ICE). */
function handMadeSheet(): Sheet {
  if (handMade) return handMade;
  const slabs = between(ICE.xMin, ENDLESS.startX, ICE.holes).map(([a, b]) => makeSlab(a, b));
  const pillars = ICE.pillars
    .filter(([cx, , rx]) => under(slabs, cx, rx))
    .map(([cx, , rx], i) => makePillar(cx, rx, ICE.ceilingY, i));
  handMade = { slabs, pillars };
  return handMade;
}

const stretchCache = new Map<number, Sheet>();

/** The sheet of a Banchisa stretch of the endless sea (the same holes and pillars as the old drawn ice). */
function stretchSheet(k: number): Sheet {
  const hit = stretchCache.get(k);
  if (hit) return hit;
  const ice = biomeOf(k).ice;
  let sheet: Sheet = { slabs: [], pillars: [] };
  if (ice) {
    const x0 = ENDLESS.startX + k * ENDLESS.stretch;
    const holes: [number, number][] = [];
    for (let u = 0; u < ENDLESS.stretch; u += ice.holeEvery) holes.push([x0 + u, x0 + u + ice.holeWidth]);
    const slabs = between(x0 + ENDLESS.blend / 2, x0 + ENDLESS.stretch - ENDLESS.blend / 2, holes).map(
      ([a, b]) => makeSlab(a, b),
    );
    const pillars: IcePillar[] = [];
    for (let i = 0; i < ice.pillars; i++) {
      const px = x0 + ENDLESS.blend / 2 + hash2(k * 3.1 + i, 77) * (ENDLESS.stretch - ENDLESS.blend);
      const rx = 6 + hash2(i, k) * 8;
      if (under(slabs, px, rx)) pillars.push(makePillar(px, rx, ice.ceilingY, k * 7 + i));
    }
    sheet = { slabs, pillars };
  }
  stretchCache.set(k, sheet);
  return sheet;
}

/** The slabs and pillars that may lie between x0 and x1. */
export function iceSheetNear(x0: number, x1: number): Sheet {
  const out: Sheet = { slabs: [], pillars: [] };
  const add = (s: Sheet): void => {
    out.slabs.push(...s.slabs.filter((p) => p.right > x0 && p.left < x1));
    out.pillars.push(...s.pillars.filter((p) => p.left + p.w > x0 && p.left < x1));
  };
  if (x0 < ENDLESS.startX && x1 > ICE.xMin) add(handMadeSheet());
  if (x1 >= ENDLESS.startX) {
    const k0 = Math.floor((Math.max(x0, ENDLESS.startX) - ENDLESS.startX) / ENDLESS.stretch);
    const k1 = Math.floor((x1 - ENDLESS.startX) / ENDLESS.stretch);
    for (let k = k0; k <= k1; k++) add(stretchSheet(k));
  }
  return out;
}

/** Is this point inside a slab's ice (its picture, not its ragged ends)? */
/** Is the slab's i-th copy of its picture mirrored? */
export const slabCopyFlip = (s: IceSlab, i: number): boolean => hash2(s.seed * 31 + i, 2.3) > 0.5;

/** From one copy of the picture to the next (units). */
export const slabCopyStep = (s: IceSlab): number => s.copyW * (1 - ICE_ART.overlap);

export function inSlab(s: IceSlab, x: number, y: number): boolean {
  if (x < s.left || x >= s.right || y < s.top || y >= s.top + s.h) return false;
  const v = (y - s.top) / s.h;
  if (x - s.left < raggedInset(s, v, 0) || s.right - x < raggedInset(s, v, 1)) return false;
  // the copy under x, and the one before where they overlap
  const step = slabCopyStep(s);
  const i = Math.floor((x - s.left) / step);
  for (const j of [i, i - 1]) {
    const f = (x - s.left - j * step) / s.copyW;
    if (j < 0 || f > 1) continue;
    if (maskAt(ICE_ART.slab, slabCopyFlip(s, j) ? 1 - f : f, v)) return true;
  }
  return false;
}

export function inPillar(p: IcePillar, x: number, y: number): boolean {
  if (x < p.left || x >= p.left + p.w || y < p.top || y >= p.top + p.h) return false;
  const u = (x - p.left) / p.w;
  return maskAt(ICE_ART.pillar, p.flip ? 1 - u : u, (y - p.top) / p.h);
}

/** The sheet holding x (the Mare di Ghiaccio's, or its stretch's), unfiltered: asked for every tile and pixel. */
function sheetAt(x: number): Sheet | null {
  if (x < ICE.xMin) return null;
  if (x < ENDLESS.startX) return handMadeSheet();
  const k = Math.floor((x - ENDLESS.startX) / ENDLESS.stretch);
  return biomeOf(k).ice ? stretchSheet(k) : null;
}

/** Is this point solid ice of the painted sheet? */
export function iceArtSolidAt(x: number, y: number): boolean {
  if (y < WORLD.surfaceY) return false;
  const s = sheetAt(x);
  if (!s) return false;
  return s.slabs.some((b) => inSlab(b, x, y)) || s.pillars.some((p) => inPillar(p, x, y));
}

/** Inside the frame of a slab or a pillar: the terrain paints nothing of its own there. */
export function inIceArtBox(x: number, y: number): boolean {
  if (y < WORLD.surfaceY - ICE_ART.above || y > WORLD.surfaceY + 200) return false;
  const s = sheetAt(x);
  if (!s) return false;
  return (
    s.slabs.some((b) => x >= b.left && x < b.right && y >= b.top && y < b.top + b.h) ||
    s.pillars.some((p) => x >= p.left && x < p.left + p.w && y >= p.top && y < p.top + p.h)
  );
}

/** The tiles (indices) of the map inside a box. */
function tilesIn(map: TileMap, x0: number, y0: number, x1: number, y1: number): number[] {
  const T = map.tileSize;
  const out: number[] = [];
  for (let ty = Math.max(0, Math.floor(y0 / T)); ty <= Math.floor(y1 / T); ty++)
    for (let tx = Math.floor(x0 / T); tx <= Math.floor(x1 / T); tx++) out.push(map.tileIndex(tx, ty));
  return out;
}

/**
 * A break in the painted sheet takes the whole column of a slab (its picture opens column by column) and a whole
 * pillar: these tiles turn into water too. Returns them (the broken ones are left as they are).
 */
export function widenIceBreak(map: TileMap, broken: number[]): number[] {
  if (!iceArtReady()) return [];
  const T = map.tileSize;
  const out: number[] = [];
  const queue = [...broken];
  while (queue.length) {
    const { tx, ty } = map.tileOf(queue.pop()!);
    const [x, y] = [tx * T + T / 2, ty * T + T / 2];
    const near = iceSheetNear(x, x);
    const boxes: number[][] = [];
    for (const s of near.slabs)
      if (x >= s.left && x < s.right && y < s.top + s.h) boxes.push(tilesIn(map, x, s.top, x, s.top + s.h));
    for (const p of near.pillars)
      if (x >= p.left && x < p.left + p.w && y >= p.top && y < p.top + p.h)
        boxes.push(tilesIn(map, p.left, p.top, p.left + p.w, p.top + p.h));
    for (const i of boxes.flat()) {
      const t = map.tileOf(i);
      if (map.get(t.tx, t.ty) !== TILE.ice) continue;
      map.set(t.tx, t.ty, TILE.water);
      out.push(i);
      queue.push(i); // a column over a pillar takes the pillar, a pillar's top the columns over it
    }
  }
  return out;
}
