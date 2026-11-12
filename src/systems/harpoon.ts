// The base speargun (owner, 12 novembre 2026: "una sorta di mitra subacqueo che lancia arpioni senza quella linea
// retta"): short darts, held down a burst, several in the water at once. Each flies straight until it hooks a fish
// (straight into the bag), strikes a beast or a temple's lever, hits rock or runs its range; none reels back. The
// cadence and the damage of each dart come from WEAPONS ('arpione'). Pure logic.
import { HARPOON } from '../data/diver';
import { WEAPONS } from '../data/world';
import type { DiverState } from './diver';
import type { GameEvent } from './events';
import { hitAlong } from './shotPath';
import type { Fish, FishState } from './fish';
import type { TileMap } from './world/tileMap';

const BASE_HARPOON = WEAPONS.find((w) => w.id === 'arpione')!;

/** A dart in the water. */
export interface HarpoonShot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dist: number;
}

export interface HarpoonState {
  shots: HarpoonShot[];
  cooldown: number;
}

export const createHarpoon = (): HarpoonState => ({ shots: [], cooldown: 0 });

/** The shot's angle, bent a little onto the nearest fish or beast just off its line (HARPOON.assistDeg). */
export function assistAim(
  from: { x: number; y: number },
  angle: number,
  targets: readonly { x: number; y: number }[],
): number {
  const cone = (HARPOON.assistDeg * Math.PI) / 180;
  let best = angle;
  let bestDist = Infinity;
  for (const t of targets) {
    const dx = t.x - from.x;
    const dy = t.y - from.y;
    const dist = Math.hypot(dx, dy);
    if (dist > HARPOON.range || dist < 1) continue;
    const off = Math.atan2(Math.sin(Math.atan2(dy, dx) - angle), Math.cos(Math.atan2(dy, dx) - angle));
    if (Math.abs(off) <= cone && dist < bestDist) [best, bestDist] = [angle + off, dist];
  }
  return best;
}

export function fireHarpoon(
  h: HarpoonState,
  d: DiverState,
  aim: number,
  events: GameEvent[],
  /** Fish and beasts the shot may bend onto (owner, 15 ottobre: hard to hit). */
  targets: readonly { x: number; y: number }[] = [],
): boolean {
  if (h.cooldown > 0 || d.dead) return false;
  const angle = assistAim(d, aim, targets);
  h.shots.push({
    x: d.x + Math.cos(angle) * HARPOON.muzzleOffset,
    y: d.y + Math.sin(angle) * HARPOON.muzzleOffset * 0.5,
    vx: Math.cos(angle) * HARPOON.speed,
    vy: Math.sin(angle) * HARPOON.speed,
    dist: 0,
  });
  h.cooldown = BASE_HARPOON.cooldown;
  events.push({ type: 'harpoonFired' });
  return true;
}

/**
 * Advances the darts. Returns the fish they hooked this frame (into the bag at once).
 * @param hitBeast a dart's point on a beast (or a lever): true if it struck it (the dart stops there)
 */
export function stepHarpoon(
  h: HarpoonState,
  fish: FishState,
  map: TileMap,
  dt: number,
  events: GameEvent[],
  hitBeast: (x: number, y: number, damage: number) => boolean = () => false,
): Fish[] {
  h.cooldown = Math.max(0, h.cooldown - dt);
  const caught: Fish[] = [];
  h.shots = h.shots.filter((s) => {
    const nx = s.x + s.vx * dt;
    const ny = s.y + s.vy * dt;
    s.dist += HARPOON.speed * dt;
    if (map.solidAt(nx, ny)) {
      events.push({ type: 'harpoonHitRock', x: s.x, y: s.y });
      return false;
    }
    const [ax, ay] = [s.x, s.y];
    s.x = nx;
    s.y = ny;
    // the whole stretch it flew this step, not only where it is now: fast, it used to jump over fish and beasts
    for (const f of fish.fish) {
      if (f.alive && !f.hooked && toSegment(f.x, f.y, ax, ay, nx, ny) < HARPOON.catchRadius) {
        caught.push(f);
        return false;
      }
    }
    if (hitAlong(ax, ay, nx, ny, (x, y) => hitBeast(x, y, BASE_HARPOON.damage))) return false;
    return s.dist <= HARPOON.range;
  });
  return caught;
}

/** Distance from a point to the segment a–b. */
function toSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const [vx, vy] = [bx - ax, by - ay];
  const l2 = vx * vx + vy * vy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2)) : 0;
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}
