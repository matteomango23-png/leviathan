// The special powers of some species (owner, 21-22 ottobre 2026, docs/PROPOSTA-RUOLI.md "Poteri speciali"): they work
// with the beast at your side in the pack, or under you when it carries you (systems/specialPowers.ts). Tuning.
export type SpecialPower = 'opensLocked' | 'scavenger' | 'longEcho' | 'revealsBuried' | 'airStation';

/** Which species has which power (its albino, alpha and final forms too). */
export const SPECIAL_POWER_OF: Readonly<Record<string, SpecialPower>> = {
  polpo_gigante: 'opensLocked',
  lontra_marina: 'scavenger',
  beluga: 'longEcho',
  squalo_martello: 'revealsBuried',
  pesce_luna: 'airStation',
  foca_comune: 'airStation',
  foca_leopardo: 'airStation',
  tricheco: 'airStation',
};

/**
 * - `locked`: the middle chest of each region of the open sea is shut and crusted over: only an octopus opens it,
 *   and it holds `teethMult` × the teeth.
 * - `scavenger` (the otter): you open wrecks and chests from `reachMult` × as far, with `teethBonus` (+ `perLevel` a
 *   level) more teeth.
 * - `longEcho` (the beluga): its echo reaches `reachMult` × as far, every `seconds`.
 * - `revealsBuried` (the hammerhead): a chest buried in each region (`at` of its way, `teethMult` × the teeth) shows
 *   and opens within `radius` (+ `perLevel` a level) units of it.
 * - `airStation`: still (slower than `stillBelow` units/s) within `radius` units of it, your air comes back at
 *   `perSecond` (+ `perLevel` a level); it says so at most every `toldEvery` seconds, with `bubblesPerSecond` bubbles rising.
 */
export const SPECIAL_POWERS = {
  locked: { teethMult: 1.5 },
  scavenger: { reachMult: 2, teethBonus: 0.3, perLevel: 0.005 },
  longEcho: { reachMult: 2, seconds: 3 },
  revealsBuried: { at: 0.4, teethMult: 2, radius: 150, perLevel: 2 },
  airStation: { radius: 70, stillBelow: 10, perSecond: 2.5, perLevel: 0.05, toldEvery: 30, bubblesPerSecond: 5 },
};

/** On the sheet, under its type's power. */
export const SPECIAL_POWER_TEXT: Readonly<Record<SpecialPower, { name: string; text: string }>> = {
  opensLocked: { name: 'Mille braccia', text: 'Apre i forzieri chiusi e incrostati.' },
  scavenger: {
    name: 'Raccoglitrice',
    text: 'Apre i relitti e i forzieri da più lontano e ci trova più denti.',
  },
  longEcho: { name: 'Canto lungo', text: 'Il suo eco arriva il doppio più lontano, anche quando lo cavalchi.' },
  revealsBuried: { name: 'Senso elettrico', text: 'Sente i forzieri sepolti nella sabbia e li fa brillare.' },
  airStation: { name: "Bolla d'aria", text: "Se stai fermo vicino a lui, ti ridà un po' d'aria." },
};
