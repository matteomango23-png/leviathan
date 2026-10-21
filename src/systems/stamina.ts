// The stamina of the beasts you ride (owner, 21 ottobre 2026: "una barra di stamina… animali veloci si stancano prima,
// lenti e grandi hanno più endurance… quando finisce l'animale rallenta… si deve ricaricare completamente"). Each beast
// of the team has its own (not saved: after loading they are rested). Only the dash and the faster pace tire it;
// it refills slowly, even while it is not the one you ride; empty, it is worn out until full again. Numbers in
// data/beasts.ts RIDE_MOTION.stamina. Pure logic.
import { RIDE_MOTION } from '../data/beasts';
import type { RideProfile } from './rideMotion';

const S = RIDE_MOTION.stamina;

export interface Stamina {
  /** 0 … 1. */
  value: number;
  /** Emptied: slow and no dash until full again. */
  worn: boolean;
}

/** The stamina of one beast (rested the first time it is asked for). */
export function staminaOf(all: Record<string, Stamina>, uid: string): Stamina {
  return (all[uid] ??= { value: 1, worn: false });
}

/** Spends `amount` of it; true if that wore it out. */
function spend(s: Stamina, amount: number): boolean {
  if (s.worn) return false;
  s.value = Math.max(0, s.value - amount);
  if (s.value > 0) return false;
  s.worn = true;
  return true;
}

/** A dash: true if it wore the beast out. */
export const spendDash = (s: Stamina, p: RideProfile): boolean => spend(s, p.dashCost);

/** Holding the faster pace for `dt` seconds: true if it wore the beast out. */
export const spendSprint = (s: Stamina, p: RideProfile, dt: number): boolean =>
  spend(s, p.dashCost * S.sprintDashesPerSec * dt);

/** Rest: worn out it refills in exhaustedSeconds and is fine again only once full; else in regenSeconds. */
export function rest(s: Stamina, dt: number): void {
  s.value = Math.min(1, s.value + dt / (s.worn ? S.exhaustedSeconds : S.regenSeconds));
  if (s.worn && s.value >= 1) s.worn = false;
}
