// The ship's pool (owner, 11 ottobre 2026): aboard, the team no longer heals all at once. Only as many beasts as the
// model's pool holds rest in it, the most hurt first, and they heal slowly (SHIP.poolHealSeconds from nothing to full,
// their moves' PP back with it); a KO beast stands again at a quarter of its health. The port and waking up after a
// blackout still heal everyone at once. You choose who goes in (owner, 22 ottobre 2026, block 6): your picks first,
// the free places to the most hurt, never the ones you took out. Pure logic.
import { SHIP } from '../../data/ship';
import { maxHpOf, type TeamBeast } from '../beasts/team';
import { shipModel } from './model';
import type { ShipState } from './ship';

interface PoolWorld {
  ship: ShipState;
  beasts: { team: TeamBeast[] };
}

/** The team members your choice puts in the pool, then the most hurt (share of health) in the places left. */
function poolNow(g: PoolWorld): TeamBeast[] {
  const places = shipModel(g.ship).pool;
  if (places <= 0) return [];
  const team = g.beasts.team.filter((b) => b.inTeam);
  const picks = g.ship.poolPicks ?? [];
  const out = g.ship.poolOut ?? [];
  const chosen = team.filter((b) => picks.includes(b.uid)).slice(0, places);
  const share = (b: TeamBeast): number => (b.ko ? -1 : b.hp / maxHpOf(b));
  const hurt = team
    .filter((b) => !chosen.includes(b) && !out.includes(b.uid))
    .filter((b) => b.ko || b.hp < maxHpOf(b) || !!b.ppUsed || !!b.status)
    .sort((a, b) => share(a) - share(b));
  return [...chosen, ...hurt].slice(0, places);
}

/** The team members resting in the pool now (aboard). */
export const inPool = (g: PoolWorld): TeamBeast[] => (g.ship.aboard ? poolNow(g) : []);

/** In the pool, or to be when you go aboard (the team panel's button). */
export const goesInPool = (g: PoolWorld, uid: string): boolean => poolNow(g).some((b) => b.uid === uid);

/** Puts a beast in the pool or takes it out (the oldest choice gives way when the pool is full of choices). */
export function togglePool(g: PoolWorld, uid: string): void {
  const s = g.ship;
  const places = shipModel(s).pool;
  const picks = (s.poolPicks ??= []);
  const out = (s.poolOut ??= []);
  const drop = (list: string[]): void => void list.splice(0, list.length, ...list.filter((x) => x !== uid));
  if (goesInPool(g, uid)) {
    drop(picks);
    out.push(uid);
  } else {
    drop(out);
    picks.push(uid);
    if (picks.length > places) picks.shift();
  }
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
