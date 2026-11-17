// The inside view (owner, 17 novembre 2026: "è come se switchassi da view outside a view inside… anche semplicemente
// navigare ed esplorare"): your ship and the Compagnia's vessels near it on a plane — along the sea's line (a) and to
// your side (s, right > 0), in metres — the turret's aim, its weapons, and what flies. The world keeps running: the
// distance along the line is the world's (insideWorld.ts writes it back each frame); the side exists only in here.
// Pure logic.
import { WORLD } from '../../data/worldLayout';
import type { WeaponId } from '../../data/company';
import type { P3 } from './projection';

/** Your turret's weapons: the machine gun (the harpoon gun under the water), and the ship's gun if it has one. */
export type TurretWeapon = 'mg' | 'gun';

export interface Round {
  id: number;
  /** Yours, or the id of the vessel that fired it. */
  from: 'you' | number;
  /** The machine gun's, or a gun's (data/company.ts WEAPONS). */
  kind: 'mg' | WeaponId;
  p: P3;
  v: P3;
  /** Metres it may still fly. */
  left: number;
}

/** A torpedo under the water: yours follows the turret's aim (guided), theirs runs straight. */
export interface Torpedo {
  id: number;
  from: 'you' | number;
  p: P3;
  yaw: number;
  pitch: number;
  left: number;
  /** Where it has been (its wake of bubbles). */
  trail: P3[];
}

/** A depth charge sinking to the depth it bursts at (z, m: below 0). */
export interface Charge {
  id: number;
  p: P3;
  fuse: number;
}

/** A dart of the harpoon gun, under the water. */
export interface Dart {
  id: number;
  p: P3;
  v: P3;
  left: number;
}

/** A Compagnia vessel in the view. */
export interface FoeInView {
  /** Its id in g.company.enemies. */
  id: number;
  a: number;
  s: number;
  /** Where it sails (radians: 0 along the line your way, right > 0) and how fast (m/s). */
  heading: number;
  speed: number;
  /** Hunting you: the bearing it wants from you (radians off your bow) and the seconds to the next change. */
  bearing: number;
  weaveT: number;
  /** Its gun's flash before it fires (s left) and the point it aims at; seconds to reload. */
  aimT: number;
  aimAt: P3 | null;
  reload: number;
  /** How deep it sails (an enemy U-Boat), and its torpedoes' and charges' reloads. */
  depth: number;
  torpReload: number;
  chargeReload: number;
  /** On patrol: the middle of its beat (a), its own side (s) and which way it goes now. */
  home: number;
  homeS: number;
  dir: 1 | -1;
}

export interface InsideState {
  /** Your ship: where, where its bow points (radians: 0 along the line the way it faced when you came in, right > 0),
   *  how fast (m/s, backwards < 0), how deep (m under the surface: a U-Boat dives). */
  you: { a: number; s: number; heading: number; speed: number; depth: number };
  foes: FoeInView[];
  /** Where the turret points (yaw: 0 along the line, right > 0; pitch up > 0). */
  yaw: number;
  pitch: number;
  weapon: TurretWeapon;
  /** The machine gun's (or harpoon gun's) heat (0 … 1) and whether it stopped hot; seconds to the next round; the
   *  gun's reload. */
  heat: number;
  hot: boolean;
  mgT: number;
  gunReload: number;
  rounds: Round[];
  torpedoes: Torpedo[];
  charges: Charge[];
  darts: Dart[];
  /** Your torpedo's reload (s). */
  torpReload: number;
  nextId: number;
  time: number;
  /** Seconds since your ship went down (the view holds a moment), or null. */
  lost: number | null;
  /** The world's x at a = 0, and which way along the world a grows. */
  origin: { x: number; face: 1 | -1 };
}

/** A new inside view with your ship at a = 0, its bow along the line. */
export function newInside(origin: { x: number; face: 1 | -1 }, depth: number, speed: number): InsideState {
  return {
    you: { a: 0, s: 0, heading: 0, speed, depth },
    foes: [],
    yaw: 0,
    pitch: 0,
    weapon: 'mg',
    heat: 0,
    hot: false,
    mgT: 0,
    gunReload: 0,
    rounds: [],
    torpedoes: [],
    charges: [],
    darts: [],
    torpReload: 0,
    nextId: 1,
    time: 0,
    lost: null,
    origin,
  };
}

/** World units along the sea's line for metres of the view. */
export const toUnits = (m: number): number => m * WORLD.unitsPerMetre;

/** Where a vessel is from you now (m). */
export const foeFrom = (d: InsideState, f: FoeInView): { a: number; s: number; dist: number } => {
  const a = f.a - d.you.a;
  const s = f.s - d.you.s;
  return { a, s, dist: Math.hypot(a, s) };
};
