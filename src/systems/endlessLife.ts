// Life in the endless sea (tappa 11): its wild beasts and its sardines. A few wild "slots" (WILD_SPAWNS marked
// endless) take, each time they come, a species of the stretch you are in and a level from its kind and its
// distance from the coast; a few sardine schools follow you out there (left far behind, they are moved ahead).
import { ENDLESS } from '../data/endless';
import { SARDINE } from '../data/diver';
import { WORLD } from '../data/worldLayout';
import { biomeAt, endlessFloor, kmFromCoast, stretchAt, ventAt } from './world/endless';
import type { GameEvent } from './events';
import type { WildBeast } from './beasts/wildState';
import type { FishState } from './fish';
import type { TileMap } from './world/tileMap';
import type { Rng } from './math';

/**
 * Gets an endless slot ready to come: picks the species and level for where you are and sets its waters (the
 * stretch, a little beyond its ends). False while you are on the hand-made coast.
 */
export function prepareEndlessSpawn(
  w: WildBeast,
  diver: { x: number },
  rng: Rng,
  lured: string[] = [],
): boolean {
  const b = biomeAt(diver.x);
  if (!b) return false;
  const entries = Object.entries(b.beasts).map(([id, n]) => [id, lured.includes(id) ? n * 6 : n] as const);
  const total = entries.reduce((a, [, n]) => a + n, 0);
  let r = rng() * total;
  let speciesId = entries[0]![0];
  for (const [id, n] of entries) {
    r -= n;
    if (r <= 0) {
      speciesId = id;
      break;
    }
  }
  const k = stretchAt(diver.x);
  const x0 = ENDLESS.startX + k * ENDLESS.stretch - 200;
  const x1 = x0 + ENDLESS.stretch + 400;
  const floor = Math.max(
    endlessFloor(x0 + 200),
    endlessFloor(x0 + ENDLESS.stretch / 2),
    endlessFloor(x1 - 200),
  );
  const lv = Math.round(b.baseLevel + ENDLESS.levelsPerKm * kmFromCoast(diver.x));
  w.spawn = { ...w.spawn, speciesId, area: [x0, WORLD.surfaceY + 20, x1, floor], level: [lv, lv + 3] };
  return true;
}

/** Sardine schools of the endless sea left far behind you are moved near you again (out of sight). */
export function stepEndlessSchools(
  fish: FishState,
  map: TileMap,
  diver: { x: number; y: number },
  rng: Rng,
): void {
  if (diver.x < ENDLESS.startX) return;
  for (const s of fish.schools) {
    if (!s.roaming || Math.hypot(s.x - diver.x, s.y - diver.y) < ENDLESS.schoolFar) continue;
    const side = rng() < 0.75 ? 1 : -1; // mostly ahead: you usually swim out to sea
    const x = diver.x + side * (300 + rng() * 300);
    const floor = endlessFloor(x);
    const top = WORLD.surfaceY + 20;
    const p = map.randomOpen(rng, x - 60, top, x + 60, Math.min(floor - 30, top + 260), 4);
    const dx = p.x - s.x;
    const dy = p.y - s.y;
    Object.assign(s, { x: p.x, y: p.y, tx: p.x, ty: p.y });
    s.roam = [p.x - 300, top, p.x + 300, Math.min(floor - 20, top + 300)];
    for (const f of fish.fish) {
      if (f.school !== s) continue;
      f.x += dx;
      f.y += dy;
      if (!f.alive) f.respawn = Math.min(f.respawn, SARDINE.respawnSeconds);
    }
  }
}

/**
 * In a vent's bubble column your air fills up (the endless sea is too far from the surface to go up each time).
 * Returns true while you breathe there; `timer.vent` keeps the message from repeating.
 */
export function stepVents(
  diver: { x: number; y: number; o2: number; maxO2: number; dead: boolean },
  dt: number,
  timer: { vent: number },
  events: GameEvent[],
): boolean {
  timer.vent = Math.max(0, timer.vent - dt);
  if (diver.dead || !ventAt(diver.x, diver.y)) return false;
  if (diver.o2 < diver.maxO2 * ENDLESS.vents.messageBelow && timer.vent <= 0)
    events.push({ type: 'ventBreath' });
  timer.vent = 20;
  diver.o2 = Math.min(diver.maxO2, diver.o2 + ENDLESS.vents.refill * dt);
  return true;
}
