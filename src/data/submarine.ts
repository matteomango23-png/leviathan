// Leviatano — your submarine (tappa 16, owner's decisions of 3 ottobre 2026: it replaces the boat). Nonno Aurelio
// gives you his old bathyscaphe at the end of chapter 1. It travels under water (under the icebergs), each model
// down to its own depth and at its own speed; better ones are bought at the port. Inside you breathe and heal
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
    note: 'Per le zone più lontane e le fosse',
    art: 'sottomarino_1',
  },
];

export const SUBMARINE = {
  mooredX: PORT.x + 110, // where Aurelio leaves it: past the pier of Portofosco (out of the port's reach)
  restY: WORLD.surfaceY + 10, // at the port it floats just under the surface
  length: 46, // units, as drawn (~7.5 m)
  radius: 9, // its body against rock (three circles: bow, middle, stern)
  reach: 26, // units: you climb in this close to it
  accel: 110,
  drag: 1.5,
  /** Beasts at least this long (m) that are aggressive come at it and ram it; the others slip away. */
  giantLengthM: 7,
  ram: {
    damage: 6, // tuning: hull per ram, × the beast's length in metres / 6
    calm: 2.5, // seconds the beast backs off before ramming again
  },
  repairPerPoint: 2, // teeth per hull point, repaired when you come into a port
  wreckTeethLoss: 0.1, // a broken submarine is towed back to Portofosco: you lose this share of your teeth
};

export const SUB_TEXT = {
  given: 'Aurelio ti lascia il suo vecchio batiscafo, ormeggiato oltre il molo. Avvicinati e premi Sali.',
  boarded: 'Dentro il sottomarino: respiri, la squadra si riposa. Qui non si combatte.',
  rammed: (hull: number, max: number): string => `Uno schianto contro lo scafo! (${hull}/${max})`,
  wrecked: (teeth: number): string =>
    `Lo scafo cede. Ti rimorchiano a Portofosco${teeth ? `: perdi ${teeth} denti` : ''}. Riparalo al porto.`,
  repaired: (cost: number): string => `Il sottomarino è stato riparato (${cost} denti).`,
  broken: 'Il sottomarino è a pezzi: entra in un porto per ripararlo.',
  tooDeep: 'Lo scafo scricchiola: più giù di così questo sottomarino non va.',
};
