// Life in the endless sea (tappa 11): its sardines and its air vents. A few sardine schools follow you out there
// (left far behind, they are moved ahead). Its wild beasts live there for good: beasts/residents.ts.
import { ENDLESS } from '../data/endless';
import { SARDINE } from '../data/diver';
import { WORLD } from '../data/worldLayout';
import { endlessFloor, ventAt } from './world/endless';
import type { GameEvent } from './events';
import type { FishState } from './fish';
import type { TileMap } from './world/tileMap';
import type { Rng } from './math';
import { onScreen, type ViewRect } from './beastState';
import { WILD_RULES } from '../data/beasts';

/** Sardine schools of the endless sea left far behind you are moved near you again (out of sight). */
export function stepEndlessSchools(
  fish: FishState,
  map: TileMap,
  diver: { x: number; y: number },
  rng: Rng,
  view: ViewRect | null = null,
): void {
  if (diver.x < ENDLESS.startX) return;
  // never moved while on screen, nor to a place on screen (owner, 9 ottobre: things popped up in the U-Boat's view)
  const m = WILD_RULES.viewMargin;
  const half = view ? view.width / 2 + m : 0;
  for (const s of fish.schools) {
    if (!s.roaming || Math.hypot(s.x - diver.x, s.y - diver.y) < Math.max(ENDLESS.schoolFar, half + 300))
      continue;
    if (onScreen(view, s.x, s.y, m)) continue;
    const side = rng() < 0.75 ? 1 : -1; // mostly ahead: you usually swim out to sea
    const centre = view ? view.x + view.width / 2 : diver.x;
    const x = centre + side * (Math.max(300, half + 60) + rng() * 300);
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
