// Riding a whale (owner, 4 ottobre): you breathe its air (a bigger tank than yours, that runs out too), and the
// air and pressure bars the HUD shows. The tank logic itself is in breath.ts; this joins it to your team.
import { activeBeast, type BeastWorld } from './beastState';
import { rideAirMult, type AirTank, type PressureState } from './breath';

/** Tanks of the whales of your team, by beast uid (kept while the game runs, not saved). */
export type RideTanks = Record<string, AirTank>;

/** The air of the beast you are riding, if it lends you its own (made full the first time). */
export function rideTank(g: BeastWorld, tanks: RideTanks, diverMaxO2: number): AirTank | undefined {
  if (!g.beasts.riding) return undefined;
  const b = activeBeast(g);
  const mult = b ? rideAirMult(b.form.speciesId) : 0;
  if (!b || mult <= 0) return undefined;
  const max = diverMaxO2 * mult;
  const t = (tanks[b.uid] ??= { o2: max, max });
  t.max = max;
  return t;
}

/** What the air bar shows: the whale's air while you ride one and it has some, otherwise yours. */
export function airShown(g: BeastWorld & { rideTanks: RideTanks }): {
  o2: number;
  max: number;
  whale: boolean;
} {
  const m = g.beasts.riding ? g.beasts.mount : null;
  const t = m ? g.rideTanks[m.uid] : undefined;
  if (t && t.o2 > 0) return { o2: t.o2, max: t.max, whale: true };
  return { o2: g.diver.o2, max: g.diver.maxO2, whale: false };
}

/** The pressure bar to show (the submarine's while you are inside it); 1 = full, hidden. */
export const pressureShown = (g: BeastWorld & { sub: { aboard: boolean } & PressureState }): number =>
  g.sub.aboard ? g.sub.pressure : g.diver.pressure;
