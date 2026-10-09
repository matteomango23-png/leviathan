// What your beasts can do in the sea (abilities in species.ts, numbers in ABILITIES): ancient bones break under
// a bone breaker or a beast with Sfondamento (ridden or swimming with you). The whales no longer lend you air (9 ottobre).
// Other abilities arrive with their regions.
import { ABILITIES } from '../data/beasts';
import { TILE } from '../data/worldLayout';
import { activeBeast, type BeastWorld } from './beastState';
import { headOf } from './beasts/combat';
import { breaksBones } from './beasts/forms';
import { teamMembers } from './beasts/team';
import type { GameEvent } from './events';
import type { TileMap } from './world/tileMap';

/** Turns the bone tiles within `radius` of a point into water; returns their indices. */
export function breakBones(map: TileMap, x: number, y: number, radius: number): number[] {
  const T = map.tileSize;
  const out: number[] = [];
  for (let ty = Math.floor((y - radius) / T); ty <= Math.floor((y + radius) / T); ty++) {
    for (let tx = Math.floor((x - radius) / T); tx <= Math.floor((x + radius) / T); tx++) {
      if (map.get(tx, ty) !== TILE.bone) continue;
      if (Math.hypot(tx * T + T / 2 - x, ty * T + T / 2 - y) > radius) continue;
      map.set(tx, ty, TILE.water);
      out.push(map.tileIndex(tx, ty));
    }
  }
  return out;
}

function bonesNear(map: TileMap, x: number, y: number, r: number): boolean {
  const T = map.tileSize;
  for (let ty = Math.floor((y - r) / T); ty <= Math.floor((y + r) / T); ty++)
    for (let tx = Math.floor((x - r) / T); tx <= Math.floor((x + r) / T); tx++)
      if (map.get(tx, ty) === TILE.bone) return true;
  return false;
}

/** Where the bones are hit from: the head of the beast you ride, or you, with the beast at your side. */
function breakPoint(g: BeastWorld): { x: number; y: number } | null {
  const m = g.beasts.mount;
  const b = activeBeast(g);
  if (!m || !b || (m.state !== 'ride' && m.state !== 'follow') || !breaksBones(b.form, b.level)) return null;
  const R = ABILITIES.sfondaOssa.reach;
  const h = headOf(m);
  if (bonesNear(g.map, h.x, h.y, R)) return h;
  if (m.state === 'follow' && bonesNear(g.map, g.diver.x, g.diver.y, R)) return g.diver;
  return null;
}

/** A bone breaker next to ancient bones: the context button offers "Sfonda". */
export function canBreakBones(g: BeastWorld): boolean {
  return breakPoint(g) !== null;
}

export function useBreakBones(g: BeastWorld, events: GameEvent[]): void {
  const p = breakPoint(g);
  if (!p) return;
  const tiles = breakBones(g.map, p.x, p.y, ABILITIES.sfondaOssa.reach + ABILITIES.sfondaOssa.radius);
  if (g.beasts.mount) g.beasts.mount.jaw = 0.5;
  if (tiles.length) events.push({ type: 'bonesBroken', tiles });
}

/**
 * Near ancient bones you cannot break yet: now and then a hint says what is needed (a beast of your team
 * that knows Sfondamento to call, or what kind of beast to train).
 */
export function stepBoneHint(g: BeastWorld, dt: number, events: GameEvent[]): void {
  const H = ABILITIES.boneHint;
  g.beasts.boneHintT = Math.max(0, g.beasts.boneHintT - dt);
  if (g.beasts.boneHintT > 0 || g.diver.dead || canBreakBones(g)) return;
  if (!bonesNear(g.map, g.diver.x, g.diver.y, H.reach)) return;
  g.beasts.boneHintT = H.everySeconds;
  const breaker = teamMembers(g.beasts.team).find((b) => !b.ko && breaksBones(b.form, b.level));
  events.push({ type: 'bonesHint', breakerUid: breaker?.uid ?? null });
}
