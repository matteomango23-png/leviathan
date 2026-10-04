// Leviatano — your submarine (tappa 16, owner's decisions of 3 ottobre 2026: it replaces the boat). Nonno Aurelio
// gives you his old bathyscaphe at the end of chapter 1. It travels under water (under the icebergs), each model
// down to its own depth and at its own speed; better ones are bought at the port. Inside you breathe (you heal only on the ship and at the port)
// (fishing from it was removed on 4 ottobre, to be rethought), but you cannot fight: ordinary beasts slip away
// from it, the big aggressive ones ram it and break it.
// It stays where you leave it. Values marked "tuning" are a first pass: change them here, never in systems.
import { PORT } from './economy';
import { WORLD } from './worldLayout';

export interface SubModel {
  id: string;
  name: string;
  price: number; // teeth (0: Aurelio's gift)
  speed: number; // units/s (you swim at 42)
  maxDepthM: number;
  hull: number; // hits it takes (each ram takes SUBMARINE.ram.damage × the beast's size)
  tank: number; // litres of fuel (owner, 4 ottobre: bought at the port). Tuning
  perKm: number; // litres per km at full throttle (less going slowly: FUEL.idleShare). Tuning
  note: string;
  art: string; // its picture in public/world
}

export const SUB_MODELS: SubModel[] = [
  {
    id: 'batiscafo',
    name: 'Batiscafo di Aurelio',
    price: 0,
    speed: 70, // tuning: less than twice your swimming
    maxDepthM: 80,
    hull: 60,
    tank: 120,
    perKm: 8,
    note: 'Vecchio e lento, ma tiene l’acqua fuori',
    art: 'sottomarino_1',
  },
  {
    id: 'squalo_ferro',
    name: 'Squalo di ferro',
    price: 1800,
    speed: 110,
    maxDepthM: 250,
    hull: 120,
    tank: 180,
    perKm: 8,
    note: 'Più veloce e più profondo, scafo rinforzato',
    art: 'sottomarino_1',
  },
  {
    id: 'leviatano_ottone',
    name: 'Leviatano d’ottone',
    price: 6000,
    speed: 160,
    maxDepthM: 900,
    hull: 240,
    tank: 260,
    perKm: 9,
    note: 'Per le zone più lontane e le fosse',
    art: 'sottomarino_1',
  },
];

export const SUBMARINE = {
  mooredX: PORT.x + 110, // where Aurelio leaves it: past the pier of Portofosco (out of the port's reach)
  restY: WORLD.surfaceY + 10, // at the port it floats just under the surface
  length: 46, // units, as drawn (~7.5 m)
  /** Its body against rock: circles along the hull (offset from the middle, radius), slimmer at bow and stern so
   *  it touches where the picture touches (owner: it stopped at an invisible wall). */
  body: [
    [-17, 5],
    [-9, 7],
    [0, 7.5],
    [9, 7],
    [17, 5],
  ] as [number, number][],
  reach: 26, // units: you climb in this close to it
  accel: 110, // units/s² speeding up (and braking, with the lever the other way)
  coast: 45, // units/s² it slows down by itself, throttle down
  drag: 1.5, // after a bump: how fast the bounce dies out
  /** Beasts at least this long (m) that are aggressive come at it and ram it; the others slip away. */
  giantLengthM: 7,
  ram: {
    damage: 6, // tuning: hull per ram, × the beast's length in metres / 6
    calm: 2.5, // seconds the beast backs off before ramming again
    knock: 60, // units/s the ram pushes the submarine away from the beast
  },
  /** Running into rock: it bounces back a little; fast enough, the hull takes damage. Tuning. */
  bump: {
    bounce: 0.35, // share of the speed it keeps, backwards
    minSpeed: 25, // units/s: slower touches only bounce
    damagePerSpeed: 0.15, // hull per unit/s above minSpeed
    minDamage: 2,
    cooldown: 0.8, // seconds between two damaging bumps
  },
  /** How the damage shows: the hull bar over it (seconds on screen) and smoke below this share of the hull. */
  hullBarSeconds: 3,
  smokeBelow: 0.3,
  repairPerPoint: 2, // teeth per hull point, repaired when you come into a port
  wreckTeethLoss: 0.1, // a broken submarine is towed back to Portofosco: you lose this share of your teeth
};

export const SUB_TEXT = {
  given: 'Aurelio ti lascia il suo vecchio batiscafo, ormeggiato oltre il molo. Avvicinati e premi Sali.',
  boarded:
    'Dentro il sottomarino respiri, ma qui non si guarisce e non si combatte. Leva a sinistra: il gas. A destra: direzione e Sali/Scendi.',
  rammed: (hull: number, max: number): string => `Uno schianto contro lo scafo! (${hull}/${max})`,
  bumped: 'Lo scafo sbatte contro la roccia!',
  wrecked: (teeth: number): string =>
    `Lo scafo cede. Ti rimorchiano a Portofosco${teeth ? `: perdi ${teeth} denti` : ''}. Riparalo al porto.`,
  repaired: (cost: number): string => `Il sottomarino è stato riparato (${cost} denti).`,
  broken: 'Il sottomarino è a pezzi: entra in un porto per ripararlo.',
  tooDeep: 'Lo scafo scricchiola: la pressione è troppa per questo sottomarino. Risali!',
  crushed: (hull: number, max: number): string => `La pressione schiaccia lo scafo! (${hull}/${max})`,
};
