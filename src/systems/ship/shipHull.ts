// The ships' hull (block 5c, owner 10 ottobre 2026): it wears in a storm at full speed, a U-Boat under water
// bumping rock hard takes damage, a giant beast ramming it hits it. Half gone: a warning; all gone: broken down, the
// engine dead. Then it is up to you: take the speedboat or the submarine to Porto Fango for spare parts, or fire the
// flare for the tug. Mended only at Porto Fango. Pure logic, data/ship.ts SHIP.hull.
import { SHIP } from '../../data/ship';
import type { BeastState } from '../beastState';
import { bodyCircles } from '../beasts/combat';
import { formLengthM } from '../beasts/forms';
import { isInWater } from '../beasts/wildState';
import { temperOf } from '../beasts/roam';
import { SUBMARINE } from '../../data/submarine';
import type { GameEvent } from '../events';
import type { SeaWeather } from '../sea';
import { shipHull as hullCircles } from './geometry';
import { shipModel } from './model';
import { submerged } from './uboat';

const H = SHIP.hull;

/** What the hull needs of the ship (ship.ts imports this file: no import back). */
export interface HullShip {
  owned: boolean;
  model: string;
  x: number;
  face: 1 | -1;
  dive: number;
  speed: number;
  hull: number;
  hullWait: number;
  engineOn: boolean;
  lightOn: boolean;
}

export const hullMax = (s: { model: string }): number => shipModel(s).hull;

/** Broken down: no engine until mended. */
export const shipBroken = (s: { owned: boolean; hull: number }): boolean => s.owned && s.hull <= 0;

/** Takes `amount` off the hull; `loud`: a blow (an event for the shake and the bar), not a slow wear. */
export function damageShip(s: HullShip, amount: number, events: GameEvent[], loud = true): void {
  if (s.hull <= 0 || amount <= 0) return;
  const max = hullMax(s);
  const was = s.hull;
  s.hull = Math.max(0, s.hull - amount);
  if (loud) events.push({ type: 'shipDamaged', hull: s.hull, max });
  if (was > max / 2 && s.hull <= max / 2 && s.hull > 0) events.push({ type: 'shipHullHalf' });
  if (s.hull <= 0) {
    Object.assign(s, { engineOn: false, speed: 0, lightOn: false });
    events.push({ type: 'shipBroken' });
  }
}

/** A U-Boat stopped by rock at this speed (units/s): hard enough, it hurts (once every SHIP.hull.bumpWait). */
export function bumpShip(s: HullShip, speed: number, events: GameEvent[]): void {
  if (speed < H.bumpFrom || s.hullWait > 0) return;
  s.hullWait = H.bumpWait;
  damageShip(s, (speed - H.bumpFrom) * H.perSpeed, events);
}

/** Every step: the bump's pause, and the storm's wear at more than half its top speed (afloat). */
export function stepShipHull(
  s: HullShip,
  sea: SeaWeather,
  top: number,
  dt: number,
  events: GameEvent[],
): void {
  s.hullWait = Math.max(0, s.hullWait - dt);
  if (submerged(s) || sea.waves < H.stormFrom || top <= 0 || s.speed < top * 0.5) return;
  const rough = Math.min(1, (sea.waves - H.stormFrom) / (3.2 - H.stormFrom));
  damageShip(s, H.stormPerSecond * rough * (s.speed / top) * dt, events, false);
}

/** Giant hunters touching the hull ram it (like the submarine's), then back off a while. */
export function stepShipRams(g: { ship: HullShip; beasts: BeastState }, events: GameEvent[]): void {
  const s = g.ship;
  if (!s.owned || s.hull <= 0) return;
  const hull = hullCircles(s);
  for (const w of g.beasts.wilds) {
    // the giant hunters (the ones that ram the submarine too)
    const giant = temperOf(w) === 'aggressive' && formLengthM(w.form) >= SUBMARINE.giantLengthM;
    if (!isInWater(w) || w.calm > 0 || w.mood !== 'chase' || !giant) continue;
    const touch = bodyCircles(w).some((c) =>
      hull.some((p) => Math.hypot(w.x + c.dx - p.x, w.y + c.dy - p.y) < c.r + p.r),
    );
    if (!touch) continue;
    damageShip(s, (H.ram * formLengthM(w.form)) / 6, events);
    w.calm = H.ramCalm;
    w.vx = -w.vx; // knocked back
    events.push({ type: 'shipRammed', x: w.x, y: w.y });
  }
}

/** Mends it by `points` (as far as it is whole). */
export function mendShip(s: HullShip, points: number): number {
  const fixed = Math.max(0, Math.min(points, hullMax(s) - s.hull));
  s.hull += fixed;
  return fixed;
}
