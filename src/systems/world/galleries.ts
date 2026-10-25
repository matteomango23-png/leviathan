// Where the Gallerie run (lot M3, data/galleries.ts): one per abyssal trench of the Grandi fosse, from its wall into
// the rock under the stretch, winding gently and ending in a cave (the longest in the Cattedrale). Fixed by the seed
// of the sea like the temples: nothing saved. Their shape is asked by galleryShape.ts. Pure logic.
import { ENDLESS } from '../../data/endless';
import { CATHEDRAL, GALLERIES } from '../../data/galleries';
import { hash2 } from '../math';
import { landmarkAtX } from './landmarks';
import { biomeOf, kmFromCoast, naturalFloor, regionAt } from './stretches';
import { templeAtX } from './templeSite';

/** A point of the tunnel and half its height there. */
export interface GalleryPoint {
  x: number;
  y: number;
  r: number;
}

export interface Cave {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

/** A pocket of air: bubbles from (x, y) up `h` units. */
export interface AirPocket {
  x: number;
  y: number;
  h: number;
}

export interface Gallery {
  k: number;
  /** Its tunnels: the main one, and a branch. */
  paths: GalleryPoint[][];
  caves: Cave[];
  airs: AirPocket[];
  /** Stretches of a path whose water pushes: path, from point, to point, +1 towards its end or -1 out. */
  currents: { path: number; i0: number; i1: number; dir: 1 | -1 }[];
  /** The mouth in the trench wall, and which way the tunnel goes from it. */
  mouth: { x: number; y: number; dir: 1 | -1 };
  cathedral: boolean;
  /** Its bounds (units). */
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

const G = GALLERIES;
const h = (k: number, n: number): number => hash2(k * 7.31 + n * 1.17, ENDLESS.seed + 31.7);
const mid = (k: number): number => ENDLESS.startX + (k + 0.5) * ENDLESS.stretch;

/** Is stretch k an abyssal trench of the Grandi fosse? */
const isTrench = (k: number): boolean =>
  k >= 0 && biomeOf(k).id === G.biome && !!biomeOf(k).trench && regionAt(mid(k)).id === G.region;

/** A tunnel from (x, y) going `dir`, `length` units long: winding gently, always under rock. */
function tunnel(
  k: number,
  seed: number,
  x: number,
  y: number,
  dir: 1 | -1,
  length: number,
  a0 = 0,
): GalleryPoint[] {
  const out: GalleryPoint[] = [];
  const most = Math.atan(G.maxSlope);
  let a = a0;
  for (let i = 0, run = 0; run <= length; i++, run += G.step) {
    const squeeze = i > 2 && i % G.squeezeEvery === G.squeezeEvery - 1;
    const r = squeeze ? G.squeeze : G.radius[0] + h(k, seed + i) * (G.radius[1] - G.radius[0]);
    // never closer than its roof to the sea floor above (it does not break out by mistake)
    const lowest = naturalFloor(x) + r + G.roof;
    // the rock above thins faster than it can go down (a trench next to it): it ends here, in its cave
    if (i > 1 && y < lowest - G.step * G.maxSlope) break;
    if (i > 1 && y < lowest) y = Math.min(lowest, y + G.step * G.maxSlope);
    out.push({ x, y, r });
    a = Math.max(-most, Math.min(most, a + (h(k, seed + i * 3) - 0.5) * 0.35));
    x += dir * G.step * Math.cos(a);
    y += G.step * Math.sin(a);
  }
  return out;
}

/** The cave a tunnel ends in, a little past its last point, under rock all across its width (it may go a little
 *  lower than the tunnel, never so much that they part). */
function caveAt(p: GalleryPoint, dir: 1 | -1, rx: number, ry: number): Cave {
  const x = p.x + dir * rx * 0.75;
  let floor = Infinity;
  for (let i = -4; i <= 4; i++) floor = Math.min(floor, naturalFloor(x + (i / 4) * rx));
  const y = Math.min(Math.max(p.y, floor + ry + G.roof * 0.5), p.y + ry * 0.6);
  return { x, y, rx, ry };
}

/** Is the cave under rock all across it (no open sea or trench above or beside it)? */
function caveFits(c: Cave): boolean {
  for (let i = -6; i <= 6; i++) {
    const u = i / 6;
    const top = c.y - c.ry * Math.sqrt(1 - u * u * 0.9);
    if (naturalFloor(c.x + u * (c.rx + G.wobble * 2)) + G.roof * 0.5 > top) return false;
  }
  return true;
}

/** The tunnel shortened (from its end) until its cave fits in the rock; the cave, or null. */
function endIn(path: GalleryPoint[], dir: 1 | -1, rx: number, ry: number): Cave | null {
  while (path.length > 4) {
    const c = caveAt(path[path.length - 1]!, dir, rx, ry);
    if (caveFits(c)) return c;
    path.pop();
  }
  return null;
}

/** The gallery of trench stretch k. */
function makeGallery(k: number, cathedral: boolean): Gallery | null {
  const t = biomeOf(k).trench!;
  const x0 = ENDLESS.startX + k * ENDLESS.stretch;
  const dir: 1 | -1 = h(k, 1) < 0.5 ? -1 : 1;
  // the wall: from the trench's middle outwards, at the mouth's depth, to where the rock starts
  const edge = (1 - t.width) / 2;
  const top = naturalFloor(
    dir < 0 ? x0 + edge * ENDLESS.stretch - 60 : x0 + (1 - edge) * ENDLESS.stretch + 60,
  );
  const y = top + (t.floorY - top) * G.mouthDepth;
  let x = x0 + ENDLESS.stretch / 2;
  while (naturalFloor(x) > y && Math.abs(x - x0 - ENDLESS.stretch / 2) < ENDLESS.stretch) x += dir * 4;
  const mouth = { x, y, dir };
  const length = cathedral ? CATHEDRAL.length : G.length[0] + h(k, 2) * (G.length[1] - G.length[0]);
  const main = tunnel(k, 10, x - dir * 30, y, dir, length);
  const rx = G.cave.rx[0] + h(k, 3) * (G.cave.rx[1] - G.cave.rx[0]);
  const ry = G.cave.ry[0] + h(k, 4) * (G.cave.ry[1] - G.cave.ry[0]);
  const end = cathedral ? endIn(main, dir, CATHEDRAL.rx, CATHEDRAL.ry) : endIn(main, dir, rx, ry);
  if (!end) return null;
  const caves = [end];
  const paths = [main];
  if (!cathedral && Math.floor(h(k, 5) * G.branchEvery) === 0) {
    const from = main[Math.floor(main.length / 2)]!;
    const branch = tunnel(k, 200, from.x, from.y, dir, length * 0.4, 0.2);
    const bend = endIn(branch, dir, 60, 42);
    if (bend) {
      paths.push(branch);
      caves.push(bend);
    }
  }
  // air in every cave, and now and then along the tunnels (bubbles from its floor up to its ceiling)
  const airs: AirPocket[] = caves.map((c) => ({ x: c.x, y: c.y + c.ry * 0.85, h: c.ry * 1.7 }));
  for (const p of paths)
    for (let i = Math.round(G.airEvery / G.step); i < p.length - 2; i += Math.round(G.airEvery / G.step))
      airs.push({ x: p[i]!.x, y: p[i]!.y + p[i]!.r * 0.85, h: p[i]!.r * 1.7 });
  // currents: a few stretches of the main tunnel
  const currents: Gallery['currents'] = [];
  const span = 5;
  for (let i = 2; i + span < main.length - 1; i += span)
    if (h(k, 40 + i) < G.currentShare)
      currents.push({ path: 0, i0: i, i1: i + span, dir: h(k, 60 + i) < 0.5 ? 1 : -1 });
  const pts = [
    ...paths.flat(),
    ...caves.flatMap((c) => [
      { x: c.x - c.rx, y: c.y - c.ry },
      { x: c.x + c.rx, y: c.y + c.ry },
    ]),
  ];
  const pad = Math.max(...G.radius) + G.wobble;
  return {
    k,
    paths,
    caves,
    airs,
    currents,
    mouth,
    cathedral,
    x0: Math.min(...pts.map((p) => p.x)) - pad,
    x1: Math.max(...pts.map((p) => p.x)) + pad,
    y0: Math.min(...pts.map((p) => p.y)) - pad,
    y1: Math.max(...pts.map((p) => p.y)) + pad,
  };
}

let sites: Gallery[] | null = null;

/** Every gallery of the sea (never on a temple or a landmark), the Cattedrale's in the trench nearest its km. */
export function gallerySites(): Gallery[] {
  if (sites) return sites;
  const trenches: number[] = [];
  for (let k = 0; mid(k) < ENDLESS.maxX; k++) if (isTrench(k)) trenches.push(k);
  const near = (k: number): number => Math.abs(kmFromCoast(mid(k)) - CATHEDRAL.km);
  const cath = trenches.reduce((a, b) => (near(b) < near(a) ? b : a), trenches[0] ?? -1);
  // the Cattedrale's first: no other gallery may cross it (two never overlap), nor a temple or a landmark
  const made = trenches
    .map((k) => makeGallery(k, k === cath))
    .filter((g): g is Gallery => !!g)
    .sort((a, b) => Number(b.cathedral) - Number(a.cathedral));
  const kept: Gallery[] = [];
  for (const g of made) {
    let clear = !kept.some(
      (o) => g.x0 < o.x1 + 40 && g.x1 > o.x0 - 40 && g.y0 < o.y1 + 40 && g.y1 > o.y0 - 40,
    );
    for (let x = g.x0; clear && x <= g.x1; x += 100)
      if (templeAtX(x, 40) || landmarkAtX(x, 40)) clear = false;
    if (clear) kept.push(g);
  }
  sites = kept.sort((a, b) => a.k - b.k);
  return sites;
}

/** The galleries whose bounds hold x (with `margin` units). */
export const galleriesAtX = (x: number, margin = 0): Gallery[] =>
  x < ENDLESS.startX ? [] : gallerySites().filter((g) => x >= g.x0 - margin && x <= g.x1 + margin);
