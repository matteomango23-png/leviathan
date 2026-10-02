// Leviatano — your boat (tappa 12, owner's decisions of 2 ottobre 2026): Nonno Aurelio gives you his boat at the
// end of chapter 1. On it you travel fast on the surface without using air; you dive from it and it waits at
// anchor; it is a moving sanctuary (the team rests aboard, you wake up on it after losing your senses); from it
// you can fish. There is no fast travel: you always sail. Values marked "tuning" are a first pass.
import type { BiomeId } from './endless';
import { PORT } from './economy';

export const BOAT = {
  mooredX: PORT.x + 110, // where Aurelio leaves it: past the pier of Portofosco (out of the port's reach)
  speed: 125, // tuning, units/s: about three times your swimming
  accel: 150,
  drag: 1.4,
  reach: 30, // units: you can climb aboard this close to it, at the surface
  surfaceBand: 40, // units (~6 m) under the surface from which you can still climb aboard
  length: 34, // units, as drawn
  bob: 1.2, // units it bobs up and down on the waves
  /** Fishing from the boat: wait for a bite, then tap while the float is under. */
  fishing: {
    wait: [2.5, 6] as [number, number], // seconds before a fish bites
    window: 0.9, // seconds to tap once it bites
    maxSpeed: 10, // units/s: you can only fish with the boat (almost) still
    line: 70, // units of line under the surface (drawn)
  },
};

/** Fish you catch from the boat, by kind of sea (FISH ids in world.ts). */
export const BOAT_FISH: Record<BiomeId | 'baia' | 'delta', string[]> = {
  baia: ['sardina', 'sgombro'],
  delta: ['cefalo', 'pesce_arciere'],
  aperto: ['sgombro', 'sardina'],
  barriera: ['pesce_pagliaccio', 'pesce_chirurgo'],
  foresta: ['cavalluccio', 'triglia'],
  ghiaccio: ['merluzzo_artico', 'krill'],
  fossa: ['pesce_vipera', 'pesce_accetta'],
};
