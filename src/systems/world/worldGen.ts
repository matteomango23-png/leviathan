// World generator: decides for every tile whether it is water, rock, bone or ice.
// Port of isOpen/genWorld from prototype/leviatano.html, with the shapes moved to src/data/worldLayout.ts.
import {
  BONE_WALL,
  COAST,
  DELTA,
  ICE,
  ISLAND_X,
  LAYOUT,
  TILE,
  WORLD,
  WORLD_SHAPE,
  type FloorDef,
  type Shape,
  type ZoneShapeDef,
} from '../../data/worldLayout';
import { fbm, smoothstep } from '../math';
import { LAIR } from '../../data/guardians';
import { inLairCave, inLairShaft, inLairShell } from './lair';
import { TileMap } from './tileMap';
import { generateChunk } from './endless';
import { icebergBox, inIceberg } from './icebergs';
import { ICEBERGS } from '../../data/worldArt';
import { ENDLESS } from '../../data/endless';

function floorHeight(f: FloorDef, x: number, n: number): number {
  let y = f.base ?? 0;
  if (f.points) {
    const pts = f.points;
    y = pts[pts.length - 1]![1];
    for (let i = 1; i < pts.length; i++) {
      const b = pts[i]!;
      if (x <= b[0]) {
        const a = pts[i - 1]!;
        const t = Math.max(0, (x - a[0]) / (b[0] - a[0]));
        y = a[1] + (b[1] - a[1]) * smoothstep(t);
        break;
      }
    }
  }
  for (const w of f.waves) y += Math.sin(x * w.freq) * w.amp;
  return y + n * f.noise;
}

function inside(s: Shape, x: number, y: number, n: number): boolean {
  if (s.kind === 'ellipse') {
    const dx = (x - s.x) / s.rx;
    const dy = (y - s.y) / s.ry;
    return dx * dx + dy * dy < 1 + n * s.noiseMult;
  }
  return x > s.x0 + n * s.noiseShift && x < s.x1 + n * s.noiseShift && y > s.yMin && y < s.yMax;
}

function zoneFor(x: number): ZoneShapeDef {
  return WORLD_SHAPE.find((z) => x >= z.xMin && x < z.xMax) ?? WORLD_SHAPE[WORLD_SHAPE.length - 1]!;
}

/** Height of the land above the water line at x (0 in the sea). */
export function landHeight(x: number): number {
  if (x < COAST.shoreX) return Math.min(COAST.landHeight, 2 + (COAST.shoreX - x) * COAST.landRise);
  // the Isola delle Mangrovie: a rocky hump rising out of the water (cliffs at both ends)
  const isl = LAYOUT.island;
  const t = (x - (ISLAND_X - isl.halfWidth)) / (2 * isl.halfWidth);
  if (t > 0 && t < 1) return isl.landHeight * Math.pow(Math.sin(Math.PI * t), 0.35);
  // mangrove islands in the Delta: a low rounded mound
  for (const [x0, x1, h] of DELTA.islands)
    if (x > x0 && x < x1) return h * Math.sqrt(Math.sin((Math.PI * (x - x0)) / (x1 - x0)));
  return 0;
}

/** How far out the shore reaches at depth y: a quick drop under the pier, then a long gentle beach. */
export function coastX(y: number): number {
  const d = Math.max(0, y - WORLD.surfaceY);
  const drop = Math.min(d, COAST.dropDepth);
  return COAST.shoreX + drop * COAST.dropSlope + Math.max(0, d - COAST.dropDepth) * COAST.slope;
}

/** True where the sea (or air) is open, false where there is rock or land. */
export function isOpen(x: number, y: number): boolean {
  if (y < WORLD.surfaceY) return y < WORLD.surfaceY - landHeight(x);
  // no wall on the east side: the endless sea goes on from there (systems/world/endless.ts)
  if (x < WORLD.edgeMargin || y > WORLD.handMadeBottom) return false;
  // the Guardian's lair is carved exactly, whatever the noise does around it
  if (inLairCave(x, y) || inLairShaft(x, y)) return true;
  if (inLairShell(x, y)) return false;
  const n = (fbm(x * WORLD.noiseScale, y * WORLD.noiseScale) - 0.5) * WORLD.noiseAmp;
  if (y < COAST.maxY && x < coastX(y) + n * COAST.noise) return false;
  const z = zoneFor(x);
  for (const s of z.solids) if (inside(s, x, y, n)) return false;
  if (y < floorHeight(z.floor, x, n)) return true;
  for (const s of z.openings) if (inside(s, x, y, n)) return true;
  return false;
}

function isIce(x: number, y: number): boolean {
  if (x < ICE.xMin || y < WORLD.surfaceY) return false;
  const inHole = ICE.holes.some(([a, b]) => x > a && x < b);
  if (y < ICE.ceilingY && !inHole) return true;
  for (const [cx, cy, rx, ry] of ICE.pillars) {
    const dx = (x - cx) / rx;
    const dy = (y - cy) / ry;
    if (dx * dx + dy * dy < 1) return true;
  }
  const s = ICE.sheet;
  return y > s.y0 && y < s.y1 && x > s.x0 && x < s.x1;
}

/** Builds the whole tile map. Deterministic: same world every time. */
export function generateWorld(): TileMap {
  const T = WORLD.tileSize;
  const map = new TileMap(WORLD.cols, WORLD.rows, T, WORLD.surfaceY, {
    make: generateChunk,
    chunkCols: ENDLESS.chunkCols,
    maxX: ENDLESS.maxX,
  });
  for (let ty = 0; ty < map.rows; ty++) {
    for (let tx = 0; tx < map.cols; tx++) {
      const x = tx * T + T / 2;
      const y = ty * T + T / 2;
      map.set(tx, ty, isOpen(x, y) ? TILE.water : TILE.rock);
    }
  }
  for (let ty = BONE_WALL.ty0; ty <= BONE_WALL.ty1; ty++) {
    for (let tx = BONE_WALL.tx0; tx <= BONE_WALL.tx1; tx++) {
      if (map.get(tx, ty) === TILE.water) map.set(tx, ty, TILE.bone);
    }
  }
  // ancient bones close the shaft down to the lair
  for (const ty of LAIR.gateRows) {
    for (let tx = 0; tx < map.cols; tx++) {
      if (map.get(tx, ty) === TILE.water && inLairShaft(tx * T + T / 2, ty * T + T / 2))
        map.set(tx, ty, TILE.bone);
    }
  }
  for (let ty = 0; ty < map.rows; ty++) {
    for (let tx = 0; tx < map.cols; tx++) {
      if (map.get(tx, ty) === TILE.water && isIce(tx * T + T / 2, ty * T + T / 2)) map.set(tx, ty, TILE.ice);
    }
  }
  // the icebergs of the Mare di Ghiaccio: solid where their picture is ice
  for (const b of ICEBERGS.map(icebergBox)) {
    if (!b) continue;
    for (let ty = Math.max(0, Math.floor(b.top / T)); ty <= Math.floor((b.top + b.h) / T); ty++)
      for (let tx = Math.floor(b.left / T); tx <= Math.floor((b.left + b.w) / T); tx++) {
        const [x, y] = [tx * T + T / 2, ty * T + T / 2];
        if (y > WORLD.surfaceY && map.get(tx, ty) === TILE.water && inIceberg([b], x, y))
          map.set(tx, ty, TILE.ice);
      }
  }
  return map;
}
