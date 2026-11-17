// Leviatano — the Compagnia dell'Olio Nero (owner, 17 novembre 2026; docs/PROPOSTA-COMPAGNIA.md): its vessels, the
// weapons at sea (theirs and your ships'), how they find you (sight and hearing, lights, night, silence) and the test
// arena where all of it is tried before it goes into the sea. Distances in metres, speeds in knots or m/s, times in
// seconds. Values marked "tuning" are a first pass: change them here, never in systems.

/** The weapons of the ships, yours and theirs. */
export type WeaponId = 'cannoncino' | 'cannone' | 'siluro' | 'carica';

export interface WeaponDef {
  name: string;
  /** A shell flies in an arc (gravity), a torpedo runs straight under the water, a charge sinks to a depth. */
  kind: 'shell' | 'torpedo' | 'charge';
  /** How fast it leaves (m/s), and how far it reaches (m). */
  speed: number;
  rangeM: number;
  /** Hull points it takes off what it hits, and how wide its blast is (m: what is that near is hit too). */
  damage: number;
  blastM: number;
  /** Seconds between two shots. */
  reload: number;
  /** Shells only: how much it falls (m/s²; less than the real one, so the arc is seen) and how far off a shot goes
   *  (radians, either way). */
  gravity?: number;
  spread?: number;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  // (battle mode, owner 17 novembre 2026: "il recoil è troppo lungo"; fast enough that a shell flies about 2 s)
  cannoncino: { name: 'Cannoncino', kind: 'shell', speed: 58, rangeM: 200, damage: 9, blastM: 4, reload: 1.2, gravity: 14, spread: 0.03 },
  cannone: { name: 'Cannone', kind: 'shell', speed: 64, rangeM: 240, damage: 15, blastM: 5, reload: 1.5, gravity: 14, spread: 0.025 },
  siluro: { name: 'Siluro', kind: 'torpedo', speed: 20, rangeM: 190, damage: 45, blastM: 6, reload: 6 },
  carica: { name: 'Carica di profondità', kind: 'charge', speed: 7, rangeM: 70, damage: 30, blastM: 10, reload: 5 },
}; // tuning

/** The Compagnia's vessels. Until their paintings come (docs/GEMINI-LOTTO-10.md) each borrows one of our ships'
 *  pictures (`look`), darkened and rusty. */
export type EnemyClassId = 'baleniera' | 'caccia' | 'uboot';

export interface EnemyClass {
  name: string;
  /** The ship whose picture it borrows (data/fleet.ts id) and the tint over it. */
  look: string;
  tint: number;
  hull: number;
  /** Knots on patrol and hunting. */
  patrolKnots: number;
  huntKnots: number;
  /** A U-Boat sails this deep (m); 0: on the surface. */
  depthM: number;
  weapons: WeaponId[];
  /** How far it sees you by day, your lights off, both on the surface (m), and hears you at full speed (m). */
  sightM: number;
  hearM: number;
  /** It hears under the water too (a hydrophone): a hunting ship or a U-Boat; a whaler only listens to the air. */
  hydrophone: boolean;
  /** Its crew reloads this many times slower than yours (a whaler's gunners are no navy). */
  reloadMult: number;
  /** Its ammunition store on the picture it borrows (shares): hit there, it blows up and breaks in two at once. */
  magazine: { u: number; v: number };
  /** The distance it keeps from you while it shoots (m). */
  holdM: number;
  /** How far it patrols each way from where it starts (m). */
  patrolM: number;
}

export const ENEMY_CLASSES: Record<EnemyClassId, EnemyClass> = {
  baleniera: {
    name: 'Baleniera dell’Olio Nero',
    look: 'aurelia',
    tint: 0x6e5646,
    hull: 70,
    patrolKnots: 8,
    huntKnots: 15,
    depthM: 0,
    weapons: ['cannoncino'],
    reloadMult: 1.5,
    magazine: { u: 0.62, v: 0.46 },
    sightM: 160,
    hearM: 130,
    hydrophone: false,
    holdM: 75,
    patrolM: 120,
  },
  caccia: {
    name: 'Nave da caccia',
    look: 'eh2',
    tint: 0x7a6a62,
    hull: 190,
    patrolKnots: 10,
    huntKnots: 19,
    depthM: 0,
    weapons: ['cannone', 'carica'],
    reloadMult: 1.2,
    magazine: { u: 0.38, v: 0.5 },
    sightM: 190,
    hearM: 160,
    hydrophone: true,
    holdM: 95,
    patrolM: 150,
  },
  uboot: {
    name: 'U-Boot dell’Olio Nero',
    look: 'stormtrooper',
    tint: 0x6f6a66,
    hull: 210,
    patrolKnots: 9,
    huntKnots: 16,
    depthM: 30,
    weapons: ['siluro'],
    reloadMult: 1.3,
    magazine: { u: 0.45, v: 0.5 },
    sightM: 70,
    hearM: 180,
    hydrophone: true,
    holdM: 120,
    patrolM: 150,
  },
}; // tuning

/** How they find you. Each second the alert grows by `rise` × how well they perceive you (0 … 1), and falls by
 *  `fall` when they do not. Tuning. */
export const DETECTION = {
  rise: 1.1,
  fall: 0.1,
  /** Alert from which it searches, and at which it hunts (it stays 1 while it hunts). */
  suspicious: 0.35,
  hunting: 1,
  /** Hunting, it loses you after this many seconds without perceiving you; then it searches the last place seen. */
  loseSeconds: 7,
  /** Your lights on make you seen this much farther; by night, lights off, this share of the day's sight. */
  lightsMult: 1.8,
  nightSight: 0.3,
  /** In Silence the darkened hull is seen this share of the distance. */
  silentSight: 0.65,
  /** Under the water (deeper than this, m) a surface ship does not see you; a U-Boat sees only this close (m). */
  periscopeM: 5,
  /** How loud you are: the engine at your speed's share (0 still … 1 top), in Silence this share of it. */
  silentNoise: 0.15,
  /** Below this share of perceiving, nothing: far away at the edge of its range it does not even wonder. */
  floor: 0.05,
  /** The engine running still makes this much noise (share of full speed's). */
  idleNoise: 0.1,
};

/** How the Compagnia's vessels move: speeding up and slowing down (m/s²), and they turn round only this slow
 *  (knots), like your ship. Tuning. */
export const ENEMY_MOTION = {
  accel: 2.2,
  turnBelowKnots: 3,
  /** Searching, it stops this close to where it last perceived you (m). */
  searchNearM: 40,
  /** Hunting, it keeps between these shares of its holding distance. */
  holdNear: 0.7,
  holdFar: 1.15,
};

/** Silence (owner, 17 novembre 2026, on the ⏻ button): engine off, lights off, the hull darker; it creeps along on
 *  electric motors at this share of its top speed. Tuning. */
export const SILENCE = {
  speedShare: 1 / 3,
  /** How dark the hull goes (tint), and how quickly it fades in and out (per second). */
  tint: 0x707680,
  /** How much its glowing parts dim (the Nightmare's runes). */
  glowDim: 0.8,
  fade: 2,
};

/** The test arena (title menu, test tools on): open sea with nothing in the way, calm. */
export const ARENA = {
  /** Where (km from the beach): the Mare blu, open water. */
  km: 8,
  /** The enemies start this far ahead of you (m), spread by `spreadM`. */
  aheadM: 280,
  spreadM: 110,
};

/** Two hulls never pass through each other: they stop this close (share of their half-lengths added). Tuning. */
export const HULLS_APART = 0.9;

/** Battle stations (owner, 17 novembre 2026: "una modalità tipo armare la nave… zoom out abbastanza grosso"). Tuning. */
export const BATTLE = {
  /** "Armi" shows with a Compagnia vessel this close (m, middle to middle); hunted this close it starts by itself. */
  armM: 300,
  /** The battle's view: this wide (m, × the helm's growth with the ship's size), the sea's surface this share of its
   *  height above the middle (some sky, more sea). It never zooms while the battle lasts. */
  frameM: 200,
  lookDown: 0.12,
  /** Begun farther apart, the view starts wider so both ships fit in its middle (× the distance), up to this many
   *  times frameM; it then keeps that size until the end. */
  fitShare: 1.6,
  maxFrame: 1.7,
  /** It moves only when a ship leaves this share of the view round its middle, at most this fast (share of its
   *  width per second). */
  deadZone: 0.72,
  panShare: 0.35,
  /** The enemy keeps this share of frameM from you, weaving this far either way (m) every few seconds. */
  standoffShare: 0.58,
  weaveM: 25,
  weaveSeconds: [2.5, 5] as [number, number],
  /** With less than this share of its hull it runs. */
  fleeBelow: 0.25,
  /** Your first shot before it has seen you: × its damage. */
  surpriseMult: 2,
  /** Before its gun fires it glints red this long (s): time to see it coming. */
  telegraph: 0.8,
  /** How much of your shell's arc shows while you aim (share of its flight). */
  arcShare: 0.35,
  /** The deciding blow in slow motion: this slow, this long (s of real time). */
  slowmo: { scale: 0.3, seconds: 1.1 },
};

/** Where a shot strikes a hull (owner, 17 novembre 2026: "deve essere proprio fighissima"). Tuning. */
export const HIT_ZONES = {
  /** On the deck: a fire (s, burning this many hull points a second) and its guns jammed for a while (s). */
  deck: { mult: 1, fireSeconds: 6, firePerSecond: 0.8, jamSeconds: 2.5 },
  /** At the waterline (within this many metres of it) or below: a breach, taking in this much water (0 … 1 full);
   *  the water makes it lean (radians at full), sit lower (share of its height) and slow down (share of its speed). */
  waterline: { mult: 1.3, bandM: 2.5, flood: 0.18, list: 0.14, sink: 0.18, slow: 0.6 },
  /** Its ammunition store: within this many metres of it, it blows up and breaks in two. */
  magazine: { radiusM: 2.6 },
};

/** A ship sinking: how long its two halves go down (s) before it is gone. Look and logic share it. */
export const SINKING = { seconds: 9 };
