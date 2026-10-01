// The dodge: when the wild beast attacks, a ring closes on your beast. A tap right when it touches dodges
// (no damage), a little early or late grazes (half), otherwise the hit lands. The ring sometimes stops for a
// moment before closing (a feint), so you cannot just count. Hard on purpose (owner's request).
import { BATTLE } from '../../data/battle';
import type { Rng } from '../math';
import type { Dodge } from './battle';

export interface DodgeRing {
  /** Seconds from the start until the ring touches. */
  closeAt: number;
  /** The ring stands still from pauseFrom for pauseFor seconds (0 = no feint). */
  pauseFrom: number;
  pauseFor: number;
}

export function makeDodgeRing(rng: Rng): DodgeRing {
  const d = BATTLE.dodge;
  const travel = d.closeSeconds[0] + rng() * (d.closeSeconds[1] - d.closeSeconds[0]);
  const feint = rng() < d.pauseChance;
  const pauseFor = feint ? d.pauseSeconds[0] + rng() * (d.pauseSeconds[1] - d.pauseSeconds[0]) : 0;
  const pauseFrom = feint ? travel * (0.3 + rng() * 0.4) : 0;
  return { closeAt: travel + pauseFor, pauseFrom, pauseFor };
}

/** How far the ring has closed at time t (0 = wide open, 1 = touching). */
export function ringProgress(r: DodgeRing, t: number): number {
  const travel = r.closeAt - r.pauseFor;
  const moving = t < r.pauseFrom ? t : t < r.pauseFrom + r.pauseFor ? r.pauseFrom : t - r.pauseFor;
  return Math.max(0, Math.min(1, moving / travel));
}

/** The tap at time t (or null: no tap before the hit). Only the first tap counts. */
export function judgeDodge(r: DodgeRing, tapAt: number | null): Dodge {
  if (tapAt === null) return 'none';
  const off = Math.abs(tapAt - r.closeAt);
  if (off <= BATTLE.dodge.perfectSeconds) return 'perfect';
  if (off <= BATTLE.dodge.grazeSeconds) return 'graze';
  return 'none';
}

/** After this the hit lands whatever you do. */
export const ringEnd = (r: DodgeRing): number => r.closeAt + BATTLE.dodge.grazeSeconds;
