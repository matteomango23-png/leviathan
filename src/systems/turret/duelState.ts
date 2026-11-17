// The turret's duel (owner, 17 novembre 2026): your ship and one Compagnia vessel on a plane — along your course (a)
// and to your side (s, right > 0), in metres — the turret's aim, its weapons and the rounds in the air. It opens from
// the sea's line (the vessel ahead or behind you, to your side) and goes back to it when it closes: the distance
// along your course is the world's, and the damage was done to the same hulls. Pure logic.
import { DUEL } from '../../data/turret';
import { WORLD } from '../../data/worldLayout';
import type { WeaponId } from '../../data/company';
import type { P3 } from './projection';

/** Your turret's weapons: the machine gun, and the ship's gun if it has one. */
export type TurretWeapon = 'mg' | 'gun';

export interface Round {
  id: number;
  from: 'you' | 'foe';
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
  from: 'you' | 'foe';
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

export interface DuelState {
  /** The vessel you fight (its id in g.company.enemies). */
  foeId: number;
  /** Your ship: where, where its bow points (radians: 0 your course on the sea's line, right > 0), how fast (m/s,
   *  backwards < 0), how deep (m under the surface: a U-Boat dives). */
  you: { a: number; s: number; heading: number; speed: number; depth: number };
  foe: {
    a: number;
    s: number;
    /** Where it sails (radians: 0 your way, right > 0) and how fast (m/s). */
    heading: number;
    speed: number;
    /** Its weaving: the bearing it wants from you (radians off your bow) and the seconds to the next change. */
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
  };
  /** Where the turret points (yaw: 0 ahead, right > 0; pitch up > 0). */
  yaw: number;
  pitch: number;
  weapon: TurretWeapon;
  /** The machine gun's heat (0 … 1) and whether it stopped hot; seconds to the next round; the gun's reload. */
  heat: number;
  hot: boolean;
  mgT: number;
  gunReload: number;
  rounds: Round[];
  torpedoes: Torpedo[];
  charges: Charge[];
  /** Your torpedo's reload (s). */
  torpReload: number;
  nextId: number;
  time: number;
  /** How it ended (the view holds a moment), and the seconds since. */
  end: { result: 'victory' | 'lost'; t: number } | null;
  /** The start of the duel along your course, to give the world back your ship's travel. */
  startA: number;
}

/** A new duel with this vessel, `along` metres ahead along your course (behind < 0). */
export function newDuel(
  foeId: number,
  along: number,
  foeSpeed: number,
  foeTowardYou: boolean,
  foeDepth = 0,
  yourDepth = 0,
): DuelState {
  return {
    foeId,
    you: { a: 0, s: 0, heading: 0, speed: 0, depth: yourDepth },
    foe: {
      a: along,
      s: DUEL.startSideM,
      heading: foeTowardYou ? Math.PI : 0,
      speed: foeSpeed,
      bearing: Math.atan2(DUEL.startSideM, along),
      weaveT: 0,
      aimT: 0,
      aimAt: null,
      reload: 1.5,
      depth: foeDepth,
      torpReload: 3,
      chargeReload: 0,
    },
    // the turret turned to it at once
    yaw: Math.atan2(DUEL.startSideM, along),
    pitch: 0,
    weapon: 'mg',
    heat: 0,
    hot: false,
    mgT: 0,
    gunReload: 0,
    rounds: [],
    torpedoes: [],
    charges: [],
    torpReload: 0,
    nextId: 1,
    time: 0,
    end: null,
    startA: 0,
  };
}

/** World units along the sea's line for metres of the duel. */
export const toUnits = (m: number): number => m * WORLD.unitsPerMetre;

/** Where the vessel is from you now (m). */
export const foeFromYou = (d: DuelState): { a: number; s: number; dist: number } => {
  const a = d.foe.a - d.you.a;
  const s = d.foe.s - d.you.s;
  return { a, s, dist: Math.hypot(a, s) };
};
