// The taming minigame: a needle sweeps a bar, tap when it is inside the zone.
// Three hits win; three misses are allowed, the fourth loses. Zones get narrower and the needle faster
// the more the wild beast out-levels your strongest beast (TAMING in rules.ts).
import { TAMING } from '../../data/rules';
import type { Rng } from '../math';

export interface TamingState {
  beastId: number;
  levelGap: number;
  hits: number;
  misses: number;
  t: number;
  centre: number; // zone centre, 0..1
  width: number; // zone width, 0..1
  speed: number; // bar widths per second
  result: 'win' | 'lose' | null;
}

export type TamingOutcome = 'hit' | 'miss' | 'win' | 'lose';

/** Difficulty factor: 1 when your beast is as strong or stronger. */
export function gapFactor(levelGap: number): number {
  return 1 + Math.max(0, levelGap) * TAMING.levelGapFactor;
}

function newRound(s: TamingState, rng: Rng): void {
  const i = Math.min(s.hits, TAMING.baseZoneWidths.length - 1);
  const k = gapFactor(s.levelGap);
  s.width = TAMING.baseZoneWidths[i]! / k;
  s.speed = TAMING.baseNeedleSpeeds[i]! * k;
  s.centre = s.width / 2 + rng() * (1 - s.width);
  s.t = rng() * 2;
}

export function startTaming(
  beastId: number,
  wildLevel: number,
  strongestLevel: number,
  rng: Rng,
): TamingState {
  const s: TamingState = {
    beastId,
    levelGap: wildLevel - strongestLevel,
    hits: 0,
    misses: 0,
    t: 0,
    centre: 0.5,
    width: 0.3,
    speed: 0.5,
    result: null,
  };
  newRound(s, rng);
  return s;
}

/** Needle position 0..1 (bounces back and forth). */
export function needle(s: TamingState): number {
  const x = s.t * s.speed;
  const m = ((x % 2) + 2) % 2;
  return m < 1 ? m : 2 - m;
}

export function stepTaming(s: TamingState, dt: number): void {
  if (!s.result) s.t += dt;
}

export function inZone(s: TamingState, pos = needle(s)): boolean {
  return Math.abs(pos - s.centre) < s.width / 2 + TAMING.tolerance;
}

export function attemptTaming(s: TamingState, rng: Rng): TamingOutcome {
  if (s.result) return s.result;
  if (inZone(s)) {
    s.hits++;
    if (s.hits >= TAMING.hitsNeeded) {
      s.result = 'win';
      return 'win';
    }
    newRound(s, rng);
    return 'hit';
  }
  s.misses++;
  // "tre errori concessi": three misses are forgiven, the fourth ends the taming
  if (s.misses > TAMING.missesAllowed) {
    s.result = 'lose';
    return 'lose';
  }
  return 'miss';
}
