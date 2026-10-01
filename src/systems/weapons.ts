// Backpack weapons besides the base harpoon: fiocine (three short darts in a fan)
// and the weighted net (catches up to 5 fish, slows beasts). Port of fireWeapon/updateProj.
import { WEAPON_RULES } from '../data/economy';
import { WEAPONS } from '../data/world';
import type { GameEvent } from './events';
import type { Fish, FishState } from './fish';
import type { TileMap } from './world/tileMap';

export interface Projectile {
  kind: 'dart' | 'net';
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  done: boolean;
}

export interface WeaponState {
  projectiles: Projectile[];
  cooldown: number;
  /** Net bursts to draw (x, y, time left). */
  bursts: { x: number; y: number; t: number }[];
}

export const createWeapons = (): WeaponState => ({ projectiles: [], cooldown: 0, bursts: [] });

export const weaponCooldown = (id: string): number => WEAPONS.find((w) => w.id === id)?.cooldown ?? 1;
export const weaponDamage = (id: string): number => WEAPONS.find((w) => w.id === id)?.damage ?? 0;

export function fireProjectileWeapon(
  s: WeaponState,
  id: string,
  x: number,
  y: number,
  angle: number,
  events: GameEvent[],
): boolean {
  if (s.cooldown > 0) return false;
  if (id === 'fiocine') {
    const r = WEAPON_RULES.fiocine;
    for (let k = 0; k < r.darts; k++) {
      const a = angle + (k - (r.darts - 1) / 2) * r.spread;
      s.projectiles.push({
        kind: 'dart',
        x,
        y,
        vx: Math.cos(a) * r.speed,
        vy: Math.sin(a) * r.speed,
        life: r.life,
        done: false,
      });
    }
  } else if (id === 'rete') {
    const r = WEAPON_RULES.rete;
    s.projectiles.push({
      kind: 'net',
      x,
      y,
      vx: Math.cos(angle) * r.speed,
      vy: Math.sin(angle) * r.speed,
      life: r.life,
      done: false,
    });
  } else return false;
  s.cooldown = weaponCooldown(id);
  events.push({ type: 'weaponFired', weapon: id });
  return true;
}

export interface ProjectileHooks {
  /** A fish was caught by a dart or the net. */
  catchFish: (f: Fish) => void;
  /** A dart touched a beast at (x, y): apply damage, return true if it hit. */
  hitBeast: (x: number, y: number, dmg: number) => boolean;
}

function burstNet(s: WeaponState, p: Projectile, fish: FishState, hooks: ProjectileHooks): void {
  const r = WEAPON_RULES.rete;
  let caught = 0;
  for (const f of fish.fish) {
    if (caught >= r.maxFish) break;
    if (f.alive && !f.hooked && Math.hypot(f.x - p.x, f.y - p.y) < r.radius) {
      hooks.catchFish(f);
      caught++;
    }
  }
  s.bursts.push({ x: p.x, y: p.y, t: 0.5 });
  p.done = true;
}

export function stepProjectiles(
  s: WeaponState,
  fish: FishState,
  map: TileMap,
  dt: number,
  hooks: ProjectileHooks,
): void {
  s.cooldown = Math.max(0, s.cooldown - dt);
  for (const b of s.bursts) b.t -= dt;
  s.bursts = s.bursts.filter((b) => b.t > 0);
  for (const p of s.projectiles) {
    if (p.done) continue;
    p.life -= dt;
    const nx = p.x + p.vx * dt;
    const ny = p.y + p.vy * dt;
    if (map.solidAt(nx, ny)) {
      if (p.kind === 'net') burstNet(s, p, fish, hooks);
      else p.done = true;
      continue;
    }
    p.x = nx;
    p.y = ny;
    if (p.kind === 'dart') {
      const f = fish.fish.find(
        (ff) =>
          ff.alive && !ff.hooked && Math.hypot(ff.x - p.x, ff.y - p.y) < WEAPON_RULES.fiocine.catchRadius,
      );
      if (f) {
        hooks.catchFish(f);
        p.done = true;
      } else if (hooks.hitBeast(p.x, p.y, weaponDamage('fiocine'))) p.done = true;
      else if (p.life <= 0) p.done = true;
    } else if (p.life <= 0) burstNet(s, p, fish, hooks);
  }
  s.projectiles = s.projectiles.filter((p) => !p.done);
}
