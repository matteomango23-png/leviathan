// What your beasts can do in the sea (abilities in species.ts, numbers in ABILITIES): ancient bones break under
// a bone breaker or a beast with Sfondamento (ridden or swimming with you), and under any Corazzato you ride (its
// Ariete); the icebergs' ice breaks under a Glaciale you ride (its Rompighiaccio; beasts/mountTraits.ts). The whales no longer lend you air (9 ottobre).
// Other abilities arrive with their regions.
import { ABILITIES } from '../data/beasts';
import { TILE } from '../data/worldLayout';
import { activeBeast, packMembers, type BeastWorld } from './beastState';
import { headOf } from './beasts/combat';
import { breaksBones } from './beasts/forms';
import { talentOf } from './beasts/mountTraits';
import { teamMembers } from './beasts/team';
import type { GameEvent } from './events';
import type { TileMap } from './world/tileMap';
import { widenIceBreak } from './world/iceSheet';

type Breakable = typeof TILE.bone | typeof TILE.ice;

/** Turns the tiles of this kind within `radius` of a point into water; returns their indices. */
function breakTiles(map: TileMap, x: number, y: number, radius: number, kind: Breakable): number[] {
  const T = map.tileSize;
  const out: number[] = [];
  for (let ty = Math.floor((y - radius) / T); ty <= Math.floor((y + radius) / T); ty++) {
    for (let tx = Math.floor((x - radius) / T); tx <= Math.floor((x + radius) / T); tx++) {
      if (map.get(tx, ty) !== kind) continue;
      if (Math.hypot(tx * T + T / 2 - x, ty * T + T / 2 - y) > radius) continue;
      map.set(tx, ty, TILE.water);
      out.push(map.tileIndex(tx, ty));
    }
  }
  return out;
}

function tilesNear(map: TileMap, x: number, y: number, r: number, kind: Breakable = TILE.bone): boolean {
  const T = map.tileSize;
  for (let ty = Math.floor((y - r) / T); ty <= Math.floor((y + r) / T); ty++)
    for (let tx = Math.floor((x - r) / T); tx <= Math.floor((x + r) / T); tx++)
      if (map.get(tx, ty) === kind) return true;
  return false;
}

/** Where the bones (or the ice) are hit from: the head of the beast you ride, or you, with a bone breaker of your pack
 *  at your side. */
function breakPoint(g: BeastWorld): { x: number; y: number; kind: Breakable } | null {
  const R0 = ABILITIES.sfondaOssa.reach;
  const mate = packMembers(g).find(({ m, b }) => m.state === 'follow' && breaksBones(b.form, b.level));
  if (mate && tilesNear(g.map, g.diver.x, g.diver.y, R0)) return { ...g.diver, kind: TILE.bone };
  const m = g.beasts.mount;
  const b = activeBeast(g);
  if (!m || !b || (m.state !== 'ride' && m.state !== 'follow')) return null;
  const ridden = m.state === 'ride';
  const R = ABILITIES.sfondaOssa.reach;
  const h = headOf(m);
  // (a bone breaker in your pack breaks them next to you: the next lines)
  if (breaksBones(b.form, b.level) || (ridden && talentOf(b.form) === 'corazzato')) {
    if (tilesNear(g.map, h.x, h.y, R)) return { ...h, kind: TILE.bone };
    if (m.state === 'follow' && tilesNear(g.map, g.diver.x, g.diver.y, R))
      return { ...g.diver, kind: TILE.bone };
  }
  if (ridden && talentOf(b.form) === 'glaciale' && tilesNear(g.map, h.x, h.y, R, TILE.ice))
    return { ...h, kind: TILE.ice };
  return null;
}

/** A bone breaker next to ancient bones: the context button offers "Sfonda". */
export function canBreakBones(g: BeastWorld): boolean {
  return breakPoint(g) !== null;
}

export function useBreakBones(g: BeastWorld, events: GameEvent[]): void {
  const p = breakPoint(g);
  if (!p) return;
  const tiles = breakTiles(g.map, p.x, p.y, ABILITIES.sfondaOssa.reach + ABILITIES.sfondaOssa.radius, p.kind);
  if (p.kind === TILE.ice) tiles.push(...widenIceBreak(g.map, tiles)); // whole columns of the painted sheet
  if (g.beasts.mount) g.beasts.mount.jaw = 0.5;
  if (tiles.length) events.push({ type: 'bonesBroken', tiles, ice: p.kind === TILE.ice });
}

/**
 * Near ancient bones you cannot break yet: now and then a hint says what is needed (a beast of your team
 * that knows Sfondamento to call, or what kind of beast to train).
 */
export function stepBoneHint(g: BeastWorld, dt: number, events: GameEvent[]): void {
  const H = ABILITIES.boneHint;
  g.beasts.boneHintT = Math.max(0, g.beasts.boneHintT - dt);
  if (g.beasts.boneHintT > 0 || g.diver.dead || canBreakBones(g)) return;
  if (!tilesNear(g.map, g.diver.x, g.diver.y, H.reach)) return;
  g.beasts.boneHintT = H.everySeconds;
  const breaker = teamMembers(g.beasts.team).find((b) => !b.ko && breaksBones(b.form, b.level));
  events.push({ type: 'bonesHint', breakerUid: breaker?.uid ?? null });
}
