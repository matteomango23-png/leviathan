// What a mount can do while you ride it (abilities in species.ts, numbers in ABILITIES): the white shark
// breaks ancient bones, the humpback lets you breathe. Other abilities arrive with their regions.
import { ABILITIES } from '../data/beasts';
import { TILE } from '../data/worldLayout';
import { activeBeast, type BeastWorld } from './beastState';
import { headOf } from './beasts/combat';
import { speciesOf } from './beasts/forms';
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
      out.push(ty * map.cols + tx);
    }
  }
  return out;
}

/** The abilities of the beast you ride (empty on foot). */
export function rideAbilities(g: BeastWorld): string[] {
  const b = activeBeast(g);
  return g.beasts.riding && b ? (speciesOf(b.form).abilities ?? []) : [];
}

function bonesNear(map: TileMap, x: number, y: number, r: number): boolean {
  const T = map.tileSize;
  for (let ty = Math.floor((y - r) / T); ty <= Math.floor((y + r) / T); ty++)
    for (let tx = Math.floor((x - r) / T); tx <= Math.floor((x + r) / T); tx++)
      if (map.get(tx, ty) === TILE.bone) return true;
  return false;
}

/** Riding a bone breaker next to ancient bones: the context button offers "Sfonda". */
export function canBreakBones(g: BeastWorld): boolean {
  const m = g.beasts.mount;
  if (!m || !rideAbilities(g).includes('sfondaOssa')) return false;
  const h = headOf(m);
  return bonesNear(g.map, h.x, h.y, ABILITIES.sfondaOssa.reach);
}

export function useBreakBones(g: BeastWorld, events: GameEvent[]): void {
  const m = g.beasts.mount;
  if (!m || !canBreakBones(g)) return;
  const h = headOf(m);
  const tiles = breakBones(g.map, h.x, h.y, ABILITIES.sfondaOssa.reach + ABILITIES.sfondaOssa.radius);
  m.jaw = 0.5;
  if (tiles.length) events.push({ type: 'bonesBroken', tiles });
}

/** Oxygen use while riding (the humpback lets you breathe). */
export const rideO2Mult = (g: BeastWorld): number =>
  rideAbilities(g).includes('staz_ossigeno') ? ABILITIES.staz_ossigeno.o2DrainMult : 1;
