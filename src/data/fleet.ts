// Leviatano — the fleet (owner, 8 ottobre 2026, block 4 of docs/BACKLOG.md): eight ships, each bought at the
// shipyard of Porto Fango with its own vehicles inside. Their numbers come from the table the owner corrected
// (bigger ones slow to speed up and to stop, the Poseidon quick; the advanced sonars hear at higher speeds).
// Only the `ready` ones sail yet: the others show in the shipyard as "In cantiere" (parts 4c–4d).
// Values marked "tuning" are a first pass: change them here, never in systems.

/** Where things are on a ship's picture (bow on the right), as shares of its width and height. */
export interface ShipPicture {
  aspect: number; // height / width
  waterline: number; // the sea surface crosses the hull here
  keel: number; // bottom of the hull
  helmX: number; // the wheelhouse: where you stand at the helm
  deckY: number;
  propX: number; // the propeller (bubbles when it turns)
  propY: number;
  /** Where the bow meets the water (the painted bow may stick out above it): the bow wave starts here. */
  bowU: number;
  /** Where a diving U-Boat's headlight starts (default bowU): a little back into a blunt bow, so the beam touches
   *  the hull (owner, 9 ottobre: on the Nightmare it floated ahead of it). */
  lampU?: number;
}

/** The top of a smokestack on the picture (shares) and how big its smoke is (1 = the main one). */
export interface ShipStack {
  u: number;
  v: number;
  size: number;
  /** A reactor's nozzle, not a chimney: it smokes only while the engine pushes (owner, 9 ottobre). */
  reactor?: boolean;
}

/** What a hatch holds: a submarine (data/submarine.ts), a speedboat or a jet ski (data/boats.ts), or part 4d's. */
export type BayKind = 'sub' | 'boat' | 'jetski' | 'drone' | 'sphere';

/** Where a hatch is on the ship's picture (shares): the middle of its opening, and the foot of its open ramp
 *  (`rampX`: when the ramp reaches out sideways, like the Imperium's stern). */
export interface BayHatch {
  x: number;
  y: number;
  rampEnd: number;
  rampX?: number;
}

export interface BayDef {
  kind: BayKind;
  /** Its model (SUB_MODELS / BOAT_MODELS id) and its card in public/art. */
  model: string;
  name: string;
  card: string;
  hatch: BayHatch;
  /** The picture with only this hatch open (ships with two hatches; `art.open` has them all open). */
  open?: string;
}

/** The tabs of its cockpit (owner, 8 ottobre: each ship its own; new instruments come with parts 4b–4d). */
export type CockpitTab = 'sonar' | 'plancia' | 'diario' | 'recinto' | 'zaino' | 'drone';

export interface ShipModelDef {
  id: string;
  name: string;
  /** How premium it is, 1…5: the colour of its frame, like the rarity of the beasts (data/cards.ts RARITY). */
  tier: 1 | 2 | 3 | 4 | 5;
  /** Its tab in the shipyard. */
  category: ShipCategory;
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
  /** The sonar: how far it hears (× the base range), up to which speed (knots), and how many sizes of echo it
   *  tells apart (2 … 5, data/hunts.ts SONAR). */
  sonar: { range: number; maxKnots: number; name: string; classes: 2 | 3 | 4 | 5 };
  /** U-Boats only (block 4c): how deep and how long it dives, and how fast it sinks and rises (units/s). Tuning. */
  dive?: { maxDepthM: number; airSeconds: number; sinkSpeed: number; riseSpeed: number };
  /** Places in its tank for beasts of the team (owner, 8 ottobre; it works from block 6). */
  pool: number;
  bays: BayDef[];
  special?: string;
  note: string;
  cockpit: CockpitTab[];
  /** Its cockpit's colours, same layout (ui/cockpitTheme.ts; owner, 9 ottobre: the Nightmare's red). */
  cockpitTheme?: 'nightmare';
  card: string; // public/art/<card>.webp
  /** Its painting in public/world (hatches closed and all open, and the propeller turning if painted: same frame)
   *  and where things are on it. */
  art?: {
    closed: string;
    open: string;
    picture: ShipPicture;
    moving?: string;
    stacks?: ShipStack[];
    /** Its lit red parts alone (made by `npm run art`), glowing and pulsing over it (the Nightmare's runes). */
    glow?: string;
  };
}

const ALL_TABS: CockpitTab[] = ['sonar', 'plancia', 'diario', 'recinto', 'zaino'];

export const SHIP_MODELS: ShipModelDef[] = [
  {
    id: 'aurelia',
    category: 'spedizione',
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
    sonar: { range: 1, maxKnots: 10, name: 'debole', classes: 2 },
    pool: 0,
    bays: [
      {
        kind: 'sub',
        model: 'batiscafo',
        name: 'Batiscafo di Aurelio',
        card: 'sottomarino_batiscafo',
        hatch: { x: 0.45, y: 0.62, rampEnd: 0.93 },
      },
    ],
    note: 'La vecchia nave di Aurelio: lenta, pesante, ma tiene il mare',
    cockpit: ALL_TABS,
    card: 'nave_aurelia',
    art: {
      closed: 'nave_1',
      open: 'nave_1_aperta',
      stacks: [
        { u: 0.527, v: 0.17, size: 1 },
        { u: 0.276, v: 0.11, size: 0.45 },
      ],
      picture: {
        aspect: 752 / 1379,
        waterline: 0.57,
        keel: 0.79,
        helmX: 0.35,
        deckY: 0.38,
        propX: 0.15,
        propY: 0.72,
        bowU: 0.96,
      },
    },
  },
  {
    id: 'eh1',
    category: 'spedizione',
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
    sonar: { range: 1.2, maxKnots: 10, name: 'normale', classes: 3 },
    pool: 2,
    bays: [
      {
        kind: 'sub',
        model: 'squalo_acciaio',
        name: 'Squalo d’acciaio',
        card: 'sottomarino_eh1',
        hatch: { x: 0.48, y: 0.6, rampEnd: 0.92 },
      },
    ],
    note: 'Nave da caccia pesante, un portellone. Il suo sottomarino squalo è il più veloce del mare',
    cockpit: ALL_TABS,
    card: 'nave_eh1',
    art: {
      closed: 'nave_eh1',
      open: 'nave_eh1_aperta',
      moving: 'nave_eh1_moto', // the propeller turning (owner, 8 ottobre)
      stacks: [{ u: 0.267, v: 0.09, size: 1.3 }],
      picture: {
        aspect: 768 / 1376,
        waterline: 0.6,
        keel: 0.78,
        helmX: 0.35,
        deckY: 0.39,
        propX: 0.12,
        propY: 0.68,
        bowU: 0.88, // the shark's jaw: its snout sticks out over the water
      },
    },
  },
  {
    id: 'whale',
    category: 'uboat',
    tier: 2,
    name: 'U-Boat Whale Exploration',
    ready: true,
    price: 7500,
    lengthM: 28,
    knots: 22,
    accel: 50,
    coast: 28,
    brake: 75,
    tank: 400,
    perKm: 8,
    sonar: { range: 1, maxKnots: 10, name: 'di prossimità, a 360°', classes: 3 },
    pool: 1,
    bays: [],
    special: 'Si immerge: fino a 150 m per 3 minuti',
    note: 'Piccolo U-Boat a forma di balena: il tuttofare per cominciare',
    cockpit: ALL_TABS,
    card: 'nave_whale',
    dive: { maxDepthM: 150, airSeconds: 300, sinkSpeed: 45, riseSpeed: 55 },
    art: {
      closed: 'nave_whale',
      open: 'nave_whale', // no hatch
      moving: 'nave_whale_moto', // its reactors burning: the owner likes it, under water too (9 ottobre)
      stacks: [
        { u: 0.38, v: 0.24, size: 0.7 },
        { u: 0.74, v: 0.2, size: 0.5 },
      ],
      picture: {
        aspect: 781 / 1400,
        waterline: 0.52,
        keel: 0.78,
        helmX: 0.48,
        deckY: 0.27,
        propX: 0.08,
        propY: 0.52,
        bowU: 0.95,
      },
    },
  },
  {
    id: 'imperium',
    category: 'spedizione',
    tier: 3,
    name: 'Imperium Explorer VI',
    ready: true,
    price: 15000,
    lengthM: 60,
    knots: 28,
    accel: 36,
    coast: 20,
    brake: 55,
    tank: 900,
    perKm: 15,
    sonar: { range: 1.6, maxKnots: 16, name: 'ottimo', classes: 4 },
    pool: 3,
    bays: [
      {
        kind: 'sub',
        model: 'imperium_sub',
        name: 'Sottomarino imperiale',
        card: 'sottomarino_imperium',
        hatch: { x: 0.46, y: 0.74, rampEnd: 0.9 },
        open: 'nave_imperium_aperta_1',
      },
      {
        kind: 'jetski',
        model: 'moto_imperium',
        name: 'Moto d’acqua',
        card: 'moto_imperium',
        hatch: { x: 0.15, y: 0.68, rampEnd: 0.83, rampX: 0.07 }, // the stern ramp reaches out behind
        open: 'nave_imperium_aperta_2',
      },
    ],
    special: 'Il compromesso perfetto: veloce, autonoma, ottima tecnologia',
    note: 'Ispirata all’impero romano: grande e alta, due vani',
    cockpit: ALL_TABS,
    card: 'nave_imperium',
    art: {
      closed: 'nave_imperium',
      open: 'nave_imperium_aperta',
      stacks: [
        { u: 0.335, v: 0.27, size: 1 },
        { u: 0.43, v: 0.26, size: 0.8 },
      ],
      picture: {
        aspect: 781 / 1400,
        waterline: 0.7,
        keel: 0.83,
        helmX: 0.55,
        deckY: 0.4,
        propX: 0.25,
        propY: 0.8,
        bowU: 0.86,
      },
    },
  },
  {
    id: 'stormtrooper',
    category: 'uboat',
    tier: 3,
    name: 'U-Boat Stormtrooper',
    ready: true,
    price: 18000,
    lengthM: 75,
    knots: 20,
    accel: 24,
    coast: 14,
    brake: 38,
    tank: 1200,
    perKm: 16,
    sonar: { range: 1.6, maxKnots: 14, name: 'a 360°, forte', classes: 4 },
    pool: 3,
    bays: [],
    special: 'Si immerge: fino a 300 m per 6 minuti. Troppo lungo per i passaggi stretti',
    note: 'U-Boat grosso e lento, con un buon sonar',
    cockpit: ALL_TABS,
    card: 'nave_stormtrooper',
    dive: { maxDepthM: 300, airSeconds: 480, sinkSpeed: 25, riseSpeed: 30 },
    art: {
      closed: 'nave_stormtrooper',
      open: 'nave_stormtrooper', // no hatch
      moving: 'nave_stormtrooper_moto', // the propellers turning
      picture: {
        aspect: 692 / 1400,
        waterline: 0.56,
        keel: 0.72,
        helmX: 0.5,
        deckY: 0.27,
        propX: 0.13,
        propY: 0.7,
        bowU: 0.97,
      },
    },
  },
  {
    id: 'poseidon',
    category: 'yacht',
    tier: 4,
    name: 'Poseidon Yacht',
    ready: true,
    price: 22000,
    lengthM: 50,
    knots: 34,
    accel: 70, // three reactors: the quickest
    coast: 30,
    brake: 90,
    tank: 1000,
    perKm: 20,
    sonar: { range: 1.3, maxKnots: 12, name: 'medio', classes: 3 },
    pool: 2,
    bays: [
      {
        kind: 'boat',
        model: 'motoscafo_poseidon',
        name: 'Motoscafo',
        card: 'motoscafo_poseidon',
        hatch: { x: 0.44, y: 0.7, rampEnd: 0.83 },
      },
    ],
    special: 'La nave più veloce, con il motoscafo più veloce del mare',
    note: 'Yacht a tre reattori',
    cockpit: ALL_TABS,
    card: 'nave_poseidon',
    art: {
      closed: 'nave_poseidon',
      open: 'nave_poseidon_aperta',
      // (its picture with the reactors on fire is gone, owner 9 ottobre: they smoke instead)
      stacks: [
        { u: 0.22, v: 0.13, size: 1.1 },
        { u: 0.165, v: 0.23, size: 0.8 },
        { u: 0.03, v: 0.5, size: 0.9, reactor: true },
        { u: 0.03, v: 0.58, size: 0.9, reactor: true },
        { u: 0.03, v: 0.67, size: 0.9, reactor: true },
      ],
      picture: {
        aspect: 781 / 1400,
        waterline: 0.68,
        keel: 0.84,
        helmX: 0.42,
        deckY: 0.33,
        propX: 0.13,
        propY: 0.78,
        bowU: 0.86,
      },
    },
  },
  {
    id: 'eh2',
    category: 'spedizione',
    tier: 4,
    name: 'Expedition Hunter 2',
    ready: true,
    price: 30000,
    lengthM: 90,
    knots: 24,
    accel: 18,
    coast: 11,
    brake: 30,
    tank: 2000,
    perKm: 25,
    sonar: { range: 1.6, maxKnots: 14, name: 'buono', classes: 4 },
    pool: 4,
    bays: [
      {
        kind: 'sub',
        model: 'eh2_sub',
        name: 'Sottomarino con sonar',
        card: 'sottomarino_eh2',
        hatch: { x: 0.365, y: 0.62, rampEnd: 0.76 },
        open: 'nave_eh2_aperta_1',
      },
      {
        kind: 'boat',
        model: 'motoscafo_eh2',
        name: 'Motoscafo da gara',
        card: 'motoscafo_eh2',
        hatch: { x: 0.57, y: 0.62, rampEnd: 0.76 },
        open: 'nave_eh2_aperta_2',
      },
    ],
    special: 'Rompighiaccio formidabile',
    note: 'Nave da spedizione enorme e tecnologica, due portelloni',
    cockpit: ALL_TABS,
    card: 'nave_eh2',
    art: {
      closed: 'nave_eh2',
      open: 'nave_eh2_aperta',
      moving: 'nave_eh2_moto', // the propellers turning (owner, 8 ottobre)
      stacks: [
        { u: 0.175, v: 0.19, size: 1.3 },
        { u: 0.135, v: 0.24, size: 1 },
      ],
      picture: {
        aspect: 781 / 1400,
        waterline: 0.58,
        keel: 0.7,
        helmX: 0.33,
        deckY: 0.38,
        propX: 0.06,
        propY: 0.6,
        bowU: 0.94,
      },
    },
  },
  {
    id: 'nightmare',
    category: 'uboat',
    tier: 5,
    name: 'Ocean’s Nightmare',
    ready: true,
    price: 50000,
    lengthM: 90,
    knots: 22,
    accel: 14, // the slowest to get going and to stop
    coast: 9,
    brake: 24,
    tank: 2500,
    perKm: 28,
    sonar: { range: 2, maxKnots: 18, name: 'il migliore', classes: 5 },
    pool: 5,
    bays: [
      // the drone is a submarine too (owner, 9 ottobre: you can also drive it by hand); on its own it scouts the
      // beasts the sonar hears (systems/ship/recon.ts)
      {
        kind: 'sub',
        model: 'drone_nightmare',
        name: 'Drone sottomarino',
        card: 'drone_nightmare',
        hatch: { x: 0.59, y: 0.47, rampEnd: 0.7 },
        open: 'nave_nightmare_aperta_1',
      },
      // the sphere goes by itself to the beast you pick from the drone's report and holds it (systems/ship/sphere.ts)
      {
        kind: 'sphere',
        model: 'sfera_nightmare',
        name: 'Sfera blocca-bestie',
        card: 'sfera_nightmare',
        hatch: { x: 0.35, y: 0.47, rampEnd: 0.67 },
        open: 'nave_nightmare_aperta_2',
      },
    ],
    special: 'U-Boat gigante, fino a 500 m: drone da ricognizione e sfera che blocca le bestie',
    note: 'La regina delle spedizioni: non la più veloce, ma la più forte',
    cockpit: [...ALL_TABS, 'drone'], // the drone's report (owner, 9 ottobre)
    cockpitTheme: 'nightmare',
    card: 'nave_nightmare',
    dive: { maxDepthM: 500, airSeconds: 600, sinkSpeed: 20, riseSpeed: 25 },
    art: {
      closed: 'nave_nightmare',
      open: 'nave_nightmare_aperta',
      moving: 'nave_nightmare_moto',
      glow: 'nave_nightmare_glow', // its runes and red lights pulse (owner, 9 ottobre)
      stacks: [],
      picture: {
        aspect: 781 / 1400,
        waterline: 0.48,
        keel: 0.64,
        helmX: 0.37,
        deckY: 0.29,
        propX: 0.03,
        propY: 0.5,
        bowU: 0.96,
        lampU: 0.88,
      },
    },
  },
];

/** The ship you get from Aurelio. */
export const FIRST_SHIP = 'aurelia';

/** Selling a ship you own (not the one in use): this share of its price comes back (owner, 8 ottobre). Tuning. */
export const SELL_SHARE = 0.5;

/** Aurelio's gift: it is never sold, so you always have a ship (owner, 8 ottobre). */
export const KEEP_FOREVER = 'aurelia';

/** The kinds of ship, the shipyard's tabs (owner, 8 ottobre), after "Possedute". */
export type ShipCategory = 'spedizione' | 'yacht' | 'uboat';
export const SHIP_CATEGORIES: { id: ShipCategory; name: string }[] = [
  { id: 'spedizione', name: 'Navi da spedizione' },
  { id: 'yacht', name: 'Yacht' },
  { id: 'uboat', name: 'U-Boat' },
];
