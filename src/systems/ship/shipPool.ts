// The ship's pool (owner, 11 ottobre 2026): aboard, the team no longer heals all at once. Only as many beasts as the
// model's pool holds rest in it, the most hurt first, and they heal slowly (SHIP.poolHealSeconds from nothing to full,
// their moves' PP back with it); a KO beast stands again at a quarter of its health. The port and waking up after a
// blackout still heal everyone at once. Choosing who goes in the pool comes with block 6. Pure logic.
import { SHIP } from '../../data/ship';
import { maxHpOf, type TeamBeast } from '../beasts/team';
import { shipModel } from './model';
import type { ShipState } from './ship';

interface PoolWorld {
  ship: ShipState;
  beasts: { team: TeamBeast[] };
}

/** The team members resting in the pool now: the most hurt (share of health), as many as its places. */
export function inPool(g: PoolWorld): TeamBeast[] {
  const places = shipModel(g.ship).pool;
  if (!g.ship.aboard || places <= 0) return [];
  const share = (b: TeamBeast): number => (b.ko ? -1 : b.hp / maxHpOf(b));
  return g.beasts.team
    .filter((b) => b.inTeam && (b.ko || b.hp < maxHpOf(b) || !!b.ppUsed || !!b.status))
    .sort((a, b) => share(a) - share(b))
    .slice(0, places);
}

/** One step: once a second, every beast in the pool gains its share of health. */
export function stepPool(g: PoolWorld, dt: number): void {
  const s = g.ship;
  if (!s.aboard) {
    s.poolT = 0;
    return;
  }
  s.poolT += dt;
  if (s.poolT < 1) return;
  s.poolT -= 1;
  for (const b of inPool(g)) {
    const max = maxHpOf(b);
    b.status = undefined;
    b.sleepTurns = undefined;
    b.hp = Math.min(max, b.hp + Math.ceil(max / SHIP.poolHealSeconds));
    if (b.ko && b.hp >= max * SHIP.poolStandShare) b.ko = false;
    if (b.hp >= max) b.ppUsed = undefined; // healed: its moves rested too
  }
}
