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
  cannoncino: { name: 'Cannoncino', kind: 'shell', speed: 36, rangeM: 110, damage: 9, blastM: 4, reload: 2.4, gravity: 12, spread: 0.03 },
  cannone: { name: 'Cannone', kind: 'shell', speed: 42, rangeM: 140, damage: 16, blastM: 5, reload: 3, gravity: 12, spread: 0.025 },
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

/** At the helm the view widens to hold a Compagnia vessel within this reach of your ship too (m), with this margin
 *  each side (m), up to this many times its usual size. Tuning. */
/** Two hulls never pass through each other: they stop this close (share of their half-lengths added). Tuning. */
export const HULLS_APART = 0.9;

export const COMBAT_VIEW = { withinM: 220, marginM: 18, maxScale: 2.6 };

/** A ship sinking: how long its two halves go down (s) before it is gone. Look and logic share it. */
export const SINKING = { seconds: 9 };
