// The base harpoon: flies out, hooks a fish or bounces off rock, then reels back.
// Port of fireHarpoon/updateHarpoon from the prototype. Cooldown comes from WEAPONS.
import { HARPOON } from '../data/diver';
import { WEAPONS } from '../data/world';
import type { DiverState } from './diver';
import type { GameEvent } from './events';
import type { Fish, FishState } from './fish';
import type { TileMap } from './world/tileMap';

export const BASE_HARPOON = WEAPONS.find((w) => w.id === 'arpione')!;

export interface HarpoonShot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dist: number;
  returning: boolean;
  caught: Fish | null;
}

export interface HarpoonState {
  shot: HarpoonShot | null;
  cooldown: number;
}

export const createHarpoon = (): HarpoonState => ({ shot: null, cooldown: 0 });

export function fireHarpoon(h: HarpoonState, d: DiverState, angle: number, events: GameEvent[]): boolean {
  if (h.shot || h.cooldown > 0 || d.dead) return false;
  h.shot = {
    x: d.x + Math.cos(angle) * HARPOON.muzzleOffset,
    y: d.y + Math.sin(angle) * HARPOON.muzzleOffset * 0.5,
    vx: Math.cos(angle) * HARPOON.speed,
    vy: Math.sin(angle) * HARPOON.speed,
    dist: 0,
    returning: false,
    caught: null,
  };
  h.cooldown = BASE_HARPOON.cooldown;
  events.push({ type: 'harpoonFired' });
  return true;
}

/** Advances the harpoon. Returns the fish that reached the diver this frame, if any. */
export function stepHarpoon(
  h: HarpoonState,
  d: DiverState,
  fish: FishState,
  map: TileMap,
  dt: number,
  events: GameEvent[],
  /** Called while flying: return true if the tip hit a beast (the harpoon then reels back). */
  hitBeast: (x: number, y: number) => boolean = () => false,
): Fish | null {
  h.cooldown = Math.max(0, h.cooldown - dt);
  const s = h.shot;
  if (!s) return null;
  if (!s.returning) {
    const nx = s.x + s.vx * dt;
    const ny = s.y + s.vy * dt;
    s.dist += HARPOON.speed * dt;
    if (map.solidAt(nx, ny)) {
      s.returning = true;
      events.push({ type: 'harpoonHitRock', x: s.x, y: s.y });
    } else if (s.dist > HARPOON.range) {
      s.returning = true;
    } else {
      s.x = nx;
      s.y = ny;
      if (hitBeast(s.x, s.y)) {
        s.returning = true;
        return null;
      }
      for (const f of fish.fish) {
        if (f.alive && !f.hooked && Math.hypot(f.x - s.x, f.y - s.y) < HARPOON.catchRadius) {
          f.hooked = true;
          s.caught = f;
          s.returning = true;
          break;
        }
      }
    }
    return null;
  }
  const dx = d.x - s.x;
  const dy = d.y - s.y;
  const dist = Math.hypot(dx, dy) || 1;
  const step = HARPOON.returnSpeed * dt;
  if (dist <= Math.max(9, step)) {
    const caught = s.caught;
    h.shot = null;
    return caught;
  }
  s.x += (dx / dist) * step;
  s.y += (dy / dist) * step;
  if (s.caught) {
    s.caught.x = s.x;
    s.caught.y = s.y;
  }
  return null;
}
