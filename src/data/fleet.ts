// Leviatano — the fleet (owner, 8 ottobre 2026, block 4 of docs/BACKLOG.md): eight ships, each bought at the
// shipyard of Porto Fango with its own vehicles inside. Their numbers come from the table the owner corrected
// (bigger ones slow to speed up and to stop, the Poseidon quick; the advanced sonars hear at higher speeds).
// Only the `ready` ones sail yet: the others show in the shipyard as "In cantiere" (parts 4b–4d).
// Values marked "tuning" are a first pass: change them here, never in systems.

/** Where things are on a ship's picture (bow on the right), as shares of its width and height. */
export interface ShipPicture {
  aspect: number; // height / width
  waterline: number; // the sea surface crosses the hull here
  keel: number; // bottom of the hull
  hatchX: number; // middle of the hatch, from the stern (left edge)
  hatchY: number; // middle of the hatch opening
  rampEnd: number; // lowest point of the open ramp
  helmX: number; // the wheelhouse: where you stand at the helm
  deckY: number;
  propX: number; // the propeller (bubbles when it turns)
  propY: number;
}

/** What a hatch holds (a submarine model id of data/submarine.ts, or a boat of the next parts). */
export type BayKind = 'sub' | 'boat' | 'jetski' | 'drone' | 'sphere';
export interface BayDef {
  kind: BayKind;
  /** Its model (SUB_MODELS id for a submarine) and its card in public/art. */
  model: string;
  name: string;
  card: string;
}

/** The tabs of its cockpit (owner, 8 ottobre: each ship its own; new instruments come with parts 4b–4d). */
export type CockpitTab = 'sonar' | 'plancia' | 'diario' | 'recinto' | 'zaino';

export interface ShipModelDef {
  id: string;
  name: string;
  /** How premium it is, 1…5: the colour of its frame, like the rarity of the beasts (data/cards.ts RARITY). */
  tier: 1 | 2 | 3 | 4 | 5;
  /** Sails in the game now (the others are shown in the shipyard, not sold yet). */
  ready: boolean;
  price: number; // teeth (0: Aurelio's gift)
  /** The whole picture's width, in metres (the hull is a little shorter). */
  lengthM: number;
  knots: number; // top speed
  /** units/s² speeding up, slowing down by itself (throttle down) and braking (lever the other way). Tuning. */
  accel: number;
  coast: number;
  brake: number;
  tank: number; // litres
  perKm: number; // litres per km at full throttle
  /** The sonar: how far it hears (× the base range) and up to which speed (knots). */
  sonar: { range: number; maxKnots: number; name: string };
  /** Places in its tank for beasts of the team (owner, 8 ottobre; it works from block 6). */
  pool: number;
  bays: BayDef[];
  special?: string;
  note: string;
  cockpit: CockpitTab[];
  card: string; // public/art/<card>.webp
  /** Its painting in public/world (hatch closed and open, and the propeller turning if painted: same frame) and
   *  where things are on it. */
  art?: { closed: string; open: string; picture: ShipPicture; moving?: string };
}

const ALL_TABS: CockpitTab[] = ['sonar', 'plancia', 'diario', 'recinto', 'zaino'];

export const SHIP_MODELS: ShipModelDef[] = [
  {
    id: 'aurelia',
    tier: 1,
    name: 'Aurelia',
    ready: true,
    price: 0,
    lengthM: 30,
    knots: 24,
    accel: 38,
    coast: 22,
    brake: 60,
    tank: 300,
    perKm: 10,
    sonar: { range: 1, maxKnots: 10, name: 'debole' },
    pool: 0,
    bays: [{ kind: 'sub', model: 'batiscafo', name: 'Batiscafo di Aurelio', card: 'sottomarino_batiscafo' }],
    note: 'La vecchia nave di Aurelio: lenta, pesante, ma tiene il mare',
    cockpit: ALL_TABS,
    card: 'nave_aurelia',
    art: {
      closed: 'nave_1',
      open: 'nave_1_aperta',
      picture: {
        aspect: 752 / 1379,
        waterline: 0.57,
        keel: 0.79,
        hatchX: 0.45,
        hatchY: 0.62,
        rampEnd: 0.93,
        helmX: 0.35,
        deckY: 0.38,
        propX: 0.15,
        propY: 0.72,
      },
    },
  },
  {
    id: 'eh1',
    tier: 2,
    name: 'Expedition Hunter 1',
    ready: true,
    price: 6000,
    lengthM: 47, // the hull ~45 m
    knots: 26,
    accel: 26, // heavy: slow to get going and to stop
    coast: 15,
    brake: 42,
    tank: 600,
    perKm: 14,
    sonar: { range: 1.2, maxKnots: 10, name: 'normale' },
    pool: 2,
    bays: [{ kind: 'sub', model: 'squalo_acciaio', name: 'Squalo d’acciaio', card: 'sottomarino_eh1' }],
    note: 'Nave da caccia pesante, un portellone. Il suo sottomarino squalo è il più veloce del mare',
    cockpit: ALL_TABS,
    card: 'nave_eh1',
    art: {
      closed: 'nave_eh1',
      open: 'nave_eh1_aperta',
      moving: 'nave_eh1_moto', // the propeller turning (owner, 8 ottobre)
      picture: {
        aspect: 768 / 1376,
        waterline: 0.6,
        keel: 0.78,
        hatchX: 0.48,
        hatchY: 0.6,
        rampEnd: 0.92,
        helmX: 0.35,
        deckY: 0.39,
        propX: 0.12,
        propY: 0.68,
      },
    },
  },
  {
    id: 'whale',
    tier: 2,
    name: 'U-Boat Whale Exploration',
    ready: false,
    price: 7500,
    lengthM: 28,
    knots: 22,
    accel: 50,
    coast: 28,
    brake: 75,
    tank: 400,
    perKm: 8,
    sonar: { range: 1, maxKnots: 10, name: 'di prossimità, a 360°' },
    pool: 1,
    bays: [],
    special: 'Si immerge: fino a 150 m per 3 minuti',
    note: 'Piccolo U-Boat a forma di balena: il tuttofare per cominciare',
    cockpit: ALL_TABS,
    card: 'nave_whale',
  },
  {
    id: 'imperium',
    tier: 3,
    name: 'Imperium Explorer VI',
    ready: false,
    price: 15000,
    lengthM: 60,
    knots: 28,
    accel: 36,
    coast: 20,
    brake: 55,
    tank: 900,
    perKm: 15,
    sonar: { range: 1.6, maxKnots: 16, name: 'ottimo' },
    pool: 3,
    bays: [
      { kind: 'sub', model: 'imperium_sub', name: 'Sottomarino imperiale', card: 'sottomarino_imperium' },
      { kind: 'jetski', model: 'moto_imperium', name: 'Moto d’acqua', card: 'moto_imperium' },
    ],
    special: 'Il compromesso perfetto: veloce, autonoma, ottima tecnologia',
    note: 'Ispirata all’impero romano: grande e alta, due vani',
    cockpit: ALL_TABS,
    card: 'nave_imperium',
  },
  {
    id: 'stormtrooper',
    tier: 3,
    name: 'U-Boat Stormtrooper',
    ready: false,
    price: 18000,
    lengthM: 75,
    knots: 20,
    accel: 24,
    coast: 14,
    brake: 38,
    tank: 1200,
    perKm: 16,
    sonar: { range: 1.6, maxKnots: 14, name: 'a 360°, forte' },
    pool: 3,
    bays: [],
    special: 'Si immerge: fino a 300 m per 6 minuti. Troppo lungo per i passaggi stretti',
    note: 'U-Boat grosso e lento, con un buon sonar',
    cockpit: ALL_TABS,
    card: 'nave_stormtrooper',
  },
  {
    id: 'poseidon',
    tier: 4,
    name: 'Poseidon Yacht',
    ready: false,
    price: 22000,
    lengthM: 50,
    knots: 34,
    accel: 70, // three reactors: the quickest
    coast: 30,
    brake: 90,
    tank: 1000,
    perKm: 20,
    sonar: { range: 1.3, maxKnots: 12, name: 'medio' },
    pool: 2,
    bays: [{ kind: 'boat', model: 'motoscafo_poseidon', name: 'Motoscafo', card: 'motoscafo_poseidon' }],
    special: 'La nave più veloce, con il motoscafo più veloce del mare',
    note: 'Yacht a tre reattori',
    cockpit: ALL_TABS,
    card: 'nave_poseidon',
  },
  {
    id: 'eh2',
    tier: 4,
    name: 'Expedition Hunter 2',
    ready: false,
    price: 30000,
    lengthM: 90,
    knots: 24,
    accel: 18,
    coast: 11,
    brake: 30,
    tank: 2000,
    perKm: 25,
    sonar: { range: 1.6, maxKnots: 14, name: 'buono' },
    pool: 4,
    bays: [
      { kind: 'sub', model: 'eh2_sub', name: 'Sottomarino con sonar', card: 'sottomarino_eh2' },
      { kind: 'boat', model: 'motoscafo_eh2', name: 'Motoscafo da gara', card: 'motoscafo_eh2' },
    ],
    special: 'Rompighiaccio formidabile',
    note: 'Nave da spedizione enorme e tecnologica, due portelloni',
    cockpit: ALL_TABS,
    card: 'nave_eh2',
  },
  {
    id: 'nightmare',
    tier: 5,
    name: 'Ocean’s Nightmare',
    ready: false,
    price: 50000,
    lengthM: 90,
    knots: 22,
    accel: 14, // the slowest to get going and to stop
    coast: 9,
    brake: 24,
    tank: 2500,
    perKm: 28,
    sonar: { range: 2, maxKnots: 18, name: 'il migliore' },
    pool: 5,
    bays: [
      { kind: 'drone', model: 'drone_nightmare', name: 'Drone sottomarino', card: 'drone_nightmare' },
      { kind: 'sphere', model: 'sfera_nightmare', name: 'Sfera blocca-bestie', card: 'sfera_nightmare' },
    ],
    special: 'U-Boat gigante, si immerge fino a 500 m',
    note: 'La regina delle spedizioni: non la più veloce, ma la più forte',
    cockpit: ALL_TABS,
    card: 'nave_nightmare',
  },
];

/** The ship you get from Aurelio. */
export const FIRST_SHIP = 'aurelia';

/** Trading in your ship for a new one: this share of its price comes back. Tuning. */
export const TRADE_IN_SHARE = 0.25;
