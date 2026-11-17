// Where a shot strikes a hull, and what it does (owner, 17 novembre 2026: battles "fighissime"): on the deck a fire
// and the guns jammed a while; at or below the waterline a breach, the ship taking in water, leaning, sitting lower
// and slowing down, until full it sinks; on its ammunition store it blows up and breaks in two at once. Yours and
// theirs alike. Numbers in data/company.ts HIT_ZONES. Pure logic.
import { HIT_ZONES } from '../../data/company';
import { WORLD } from '../../data/worldLayout';
import type { HullDamage } from './enemyState';

export type HitZone = 'deck' | 'waterline' | 'magazine';

/** Which part a burst at `at` strikes: its store (if it has one, within reach), the waterline band and below, or the
 *  deck. */
export function zoneOf(
  at: { x: number; y: number },
  waterY: number,
  magazine: { x: number; y: number } | null,
): HitZone {
  const U = WORLD.unitsPerMetre;
  if (magazine && Math.hypot(at.x - magazine.x, at.y - magazine.y) <= HIT_ZONES.magazine.radiusM * U)
    return 'magazine';
  return at.y >= waterY - HIT_ZONES.waterline.bandM * U ? 'waterline' : 'deck';
}

/** What a hit there adds; returns the hull points it takes (Infinity: the store blew up). */
export function applyHit(d: HullDamage, zone: HitZone, damage: number): number {
  if (zone === 'magazine') return Infinity;
  if (zone === 'waterline') {
    d.flood = Math.min(1, d.flood + HIT_ZONES.waterline.flood);
    return damage * HIT_ZONES.waterline.mult;
  }
  d.fire = Math.max(d.fire, HIT_ZONES.deck.fireSeconds);
  d.jam = Math.max(d.jam, HIT_ZONES.deck.jamSeconds);
  return damage * HIT_ZONES.deck.mult;
}

/** One step: the fire burns (hull points it takes now), the jam clears. */
export function stepDamage(d: HullDamage, dt: number): number {
  const burn = d.fire > 0 ? HIT_ZONES.deck.firePerSecond * dt : 0;
  d.fire = Math.max(0, d.fire - dt);
  d.jam = Math.max(0, d.jam - dt);
  return burn;
}

/** Full of water: it goes down whatever its hull says. */
export const swamped = (d: HullDamage): boolean => d.flood >= 1;

/** Its speed with the water it has taken in (× its top). */
export const floodSpeed = (d: HullDamage): number => 1 - d.flood * HIT_ZONES.waterline.slow;
