// Leviatano — your submarine (tappa 16, owner's decisions of 3 ottobre 2026: it replaces the boat). Nonno Aurelio
// gives you his old bathyscaphe with the ship at Porto Fango. It travels under water (under the icebergs), each
// model down to its own depth and at its own speed; since 8 ottobre each comes with its ship (data/fleet.ts), none
// is sold on its own. Inside you breathe (you heal only on the ship and at the port), but you cannot fight:
// ordinary beasts slip away from it, the big aggressive ones ram it and break it.
// It stays where you leave it. Values marked "tuning" are a first pass: change them here, never in systems.
import { PORT } from './economy';
import { WORLD } from './worldLayout';

export interface SubModel {
  id: string;
  name: string;
  /** Its length in metres (owner, 8 ottobre: the first ones looked too small). */
  lengthM: number;
  speed: number; // units/s (you swim at 42)
  maxDepthM: number;
  /** Floodlights round the hull under water (m), the top ones only (owner, 15 ottobre). Tuning. */
  floodlightM?: number;
  hull: number; // hits it takes (each ram takes SUBMARINE.ram.damage × the beast's size)
  tank: number; // litres of fuel (owner, 4 ottobre: bought at the port). Tuning
  perKm: number; // litres per km at full throttle (less going slowly: FUEL.idleShare). Tuning
  /** Seconds of air under water (owner, 9 ottobre: the bigger, the more; it fills again at the surface). */
  airSeconds: number;
  /** It has a sonar of its own (block 5 makes it work). */
  sonar: boolean;
  /** Its 360° sonar on the glass (block 5c): how far it hears (m) and how many sizes of echo it tells apart. */
  scope?: { rangeM: number; classes: 2 | 3 | 4 | 5 };
  note: string;
  art: string; // its picture in public/world
  /** The picture with the propeller turning (same box), shown while it moves. */
  moving?: string;
  /** A drone: it can also scout by itself from its ship (the Ocean's Nightmare's, systems/ship/recon.ts). */
  recon?: boolean;
  /** How fast it goes up and down (units/s), when not the same as its speed (the abyssal one: quick up and down,
   *  medium across; owner, 23 ottobre). */
  diveSpeed?: number;
  /** Its headlight ahead, × the reach of your lamp, besides its floodlights, on while it moves too (the abyssal one:
   *  owner, 23 ottobre, "luci potentissime"). Tuning. */
  beam?: number;
  /** Night vision (data/abyss.ts NIGHT_VISION): a button at its helm. */
  nightVision?: boolean;
  /** Its own cockpit (ui/cockpit.ts), so it can hunt far from its ship (owner, 25 ottobre): the tabs it has. */
  cockpit?: ('sonar' | 'plancia' | 'diario' | 'zaino')[];
  /** Its cockpit's and sonar's colours (ui/cockpitTheme.ts). */
  cockpitTheme?: 'abissale';
  /** A drone that plants a tracker from afar on a beast picked on the sonar (the Krill Hunter's, 10 ottobre). */
  remoteTracker?: boolean;
}

export const SUB_MODELS: SubModel[] = [
  {
    id: 'batiscafo',
    airSeconds: 300, // more time under water (owner, 24 ottobre); was 120
    name: 'Batiscafo di Aurelio',
    lengthM: 9,
    speed: 70, // tuning: less than twice your swimming
    maxDepthM: 80,
    hull: 60,
    tank: 120,
    perKm: 8,
    sonar: false,
    note: 'Vecchio e lento, ma tiene l’acqua fuori',
    art: 'sottomarino_1',
  },
  {
    // the Expedition Hunter 1's (owner, 8 ottobre): the fastest of the sea, a small tank, no sonar
    id: 'squalo_acciaio',
    airSeconds: 360, // more time under water (owner, 24 ottobre); was 150
    name: 'Squalo d’acciaio',
    lengthM: 12,
    speed: 190,
    maxDepthM: 250,
    hull: 100,
    tank: 90,
    perKm: 11,
    sonar: false,
    note: 'Il sottomarino più veloce: consuma tanto e non ha sonar',
    art: 'sottomarino_eh1',
  },
  {
    // the Expedition Hunter 2's (owner, 8 ottobre): a sonar, not the best, not the fastest
    id: 'eh2_sub',
    airSeconds: 420, // more time under water (owner, 24 ottobre); was 160
    name: 'Sottomarino con sonar',
    lengthM: 13,
    speed: 120,
    maxDepthM: 300,
    floodlightM: 16,
    hull: 140,
    tank: 140,
    perKm: 9,
    sonar: true,
    scope: { rangeM: 60, classes: 3 },
    note: 'Robusto, con il sonar: né il più veloce né il migliore',
    art: 'sottomarino_eh2',
  },
  {
    // the Imperium Explorer VI's (owner, 8 ottobre): an excellent sonar
    id: 'imperium_sub',
    airSeconds: 330, // more time under water (owner, 24 ottobre); was 125
    name: 'Sottomarino imperiale',
    lengthM: 9.5,
    speed: 140,
    maxDepthM: 350,
    floodlightM: 20,
    hull: 130,
    tank: 130,
    perKm: 9,
    sonar: true,
    scope: { rangeM: 90, classes: 4 },
    note: 'Ottimo sonar, veloce e profondo',
    art: 'sottomarino_imperium',
    moving: 'sottomarino_imperium_moto',
  },
  {
    // the Ocean's Nightmare's drone (owner, 9 ottobre): scouts by itself, or you drive it like a submarine
    id: 'drone_nightmare',
    airSeconds: 480, // more time under water (owner, 24 ottobre); was 170
    name: 'Drone sottomarino',
    lengthM: 14, // owner, 9 ottobre: at 7 m it was "uno scricciolo"
    speed: 160,
    maxDepthM: 500,
    floodlightM: 16,
    hull: 90,
    tank: 80,
    perKm: 6,
    sonar: true,
    scope: { rangeM: 110, classes: 5 },
    note: 'Piccolo e velocissimo: fa la ricognizione da solo, o lo guidi tu fino a 500 m',
    art: 'sottomarino_drone',
    recon: true,
  },
  {
    // the Krill Hunter's (owner, 10 ottobre): claws in front; slower than the Nightmare's, it plants a tracker on a
    // beast picked on the sonar and comes back, or you drive it by hand
    id: 'drone_krill',
    airSeconds: 450, // more time under water (owner, 24 ottobre); was 160
    name: 'Drone Artiglio',
    lengthM: 13,
    speed: 110,
    maxDepthM: 400,
    floodlightM: 14,
    hull: 130,
    tank: 100,
    perKm: 7,
    sonar: true,
    scope: { rangeM: 80, classes: 4 },
    note: 'Con le braccia: pianta il tracker a distanza, o lo guidi tu fino a 400 m',
    art: 'sottomarino_lanterna',
    moving: 'sottomarino_lanterna_moto',
    remoteTracker: true,
  },
  {
    // the abyssal ship's (owner, 23 ottobre 2026): the deepest of all, half an hour under water, quick up and down;
    // its own cockpit so you can leave the ship and hunt kilometres away on the floor (owner, 25 ottobre)
    id: 'sottomarino_abissale',
    airSeconds: 1800,
    name: 'Sottomarino abissale',
    lengthM: 15,
    speed: 130,
    diveSpeed: 200,
    maxDepthM: 1000,
    floodlightM: 45,
    beam: 2.2,
    hull: 260,
    tank: 400,
    perKm: 6,
    sonar: true,
    scope: { rangeM: 70, classes: 2 }, // simplified: dots, not sizes (the ship's is the real one)
    nightVision: true,
    cockpit: ['sonar', 'plancia', 'diario', 'zaino'],
    cockpitTheme: 'abissale',
    note: 'Fino a 1000 m e mezz’ora sott’acqua: visione notturna, fari fortissimi e un cockpit tutto suo',
    art: 'sottomarino_abissale',
  },
];

export const SUBMARINE = {
  stillBelow: 4, // units/s: slower than this it counts as still (you may get out)
  mooredX: PORT.x + 110, // where Aurelio leaves it: past the pier of Portofosco (out of the port's reach)
  restY: WORLD.surfaceY + 10, // at the port it floats just under the surface
  /** Surfaced, it floats with its deck and tower out of the water (owner, 9 ottobre: "a block kept them under"):
   *  its middle this share of its length above the surface; with the dive lever not pushing down, near the
   *  surface it rises there by itself at this speed (units/s). */
  surfaceFloat: 0.06,
  floatUp: 22,
  length: 46, // units: the length SUBMARINE.body is drawn for (each model's own is lengthM)
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
  /** Its air (owner, 9 ottobre): refilled per second at the surface or in the hold, the warning, the rise once it is
   *  gone (units/s), and how deep under its resting line it counts as under water (units). */
  /** Out of air (or flooded) under water: a heart every `hurtEvery` seconds (no rising by itself any more). */
  /** The sonar's picture of the sea (rock and ice edges, systems/subSonar.ts): cells across it; the range of the
   *  submarines with no beast sonar (m). Tuning. */
  edgeScope: { cells: 28, rangeM: 50 },
  air: { refill: 6, warnAt: 30, hurtEvery: 5, underBelow: 8 },
  accel: 110, // units/s² speeding up (and braking, with the lever the other way)
  coast: 45, // units/s² it slows down by itself, throttle down
  drag: 1.5, // after a bump: how fast the bounce dies out…
  bounceStop: 3, // …and below this speed (units/s) it is over: the levers drive again (owner, 8 ottobre: the gas got stuck)
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
  // teeth per hull point, mended only at a port (owner, 15 ottobre: no teeth lost when it breaks, but mending it costs;
  // the crew no longer mends it in the hold). Tuning.
  repairPerPoint: 5,
};

export const SUB_TEXT = {
  boarded:
    'Dentro il sottomarino respiri, ma qui non si guarisce e non si combatte. Leva a sinistra: il gas. A destra: direzione e Sali/Scendi.',
  rammed: (hull: number, max: number): string => `Uno schianto contro lo scafo! (${hull}/${max})`,
  bumped: 'Lo scafo sbatte contro la roccia!',
  wrecked: (): string => 'Lo scafo cede. Ti rimorchiano a Portofosco: riparalo al porto.',
  repaired: (cost: number): string => `Il sottomarino è stato riparato (${cost} denti).`,
  broken: 'Il sottomarino è a pezzi: entra in un porto per ripararlo.',
  tooDeep: 'Lo scafo scricchiola: la pressione è troppa per questo sottomarino. Risali!',
  crushed: (hull: number, max: number): string => `La pressione schiaccia lo scafo! (${hull}/${max})`,
};
