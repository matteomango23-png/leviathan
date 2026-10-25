// Wild beasts in the open sea: their state, how they (re)appear, and simple queries. Movement is in roam.ts.
// They do not fight in the water: touching them, or hitting them with a weapon, starts a turn-based battle.
import { HARPOON_WEAKEN } from '../../data/battle';
import { BEAST_BODY, BEAST_TEMPER, type WildSpawnDef } from '../../data/beasts';
import type { BodyPose } from './combat';
import type { Fear } from './mountTraits';
import { formLengthUnits, type BeastForm, shapeOfForm } from './forms';

/** A big hunter's passes before it charges (beasts/patrol.ts). */
export interface Patrol {
  /** Passes still to make before it charges. */
  passes: number;
  st: 'pass' | 'wait' | 'bolt';
  /** Seconds left waiting off screen. */
  t: number;
  /** Seconds in view this pass, and seconds you have been following it. */
  onT: number;
  followT: number;
  /** How far above or below your depth it passes (units). */
  dy: number;
  /** This pass ends with a turn in view instead of leaving the screen. */
  turnInView: boolean;
}

/** A hunter stalking you (beasts/stalk.ts). */
export type StalkPhase = 'away' | 'wait' | 'warn' | 'charge' | 'pass';

export interface Stalk {
  phase: StalkPhase;
  /** Seconds left in this phase (wait, warn, pass). */
  t: number;
  /** Seconds of rage left (renewed by each hit). */
  rage: number;
  /** Where its charge aims (where you were when it set off), moving a little after you. */
  aimX: number;
  aimY: number;
  /** The way it heads (−1 left, 1 right). */
  dir: 1 | -1;
  /** Its warning has just started: the toll and the red arrow (encounters.ts sends the event). */
  toll?: boolean;
}

export interface WildBeast extends BodyPose {
  id: number;
  spawn: WildSpawnDef;
  form: BeastForm;
  level: number;
  vx: number;
  vy: number;
  pitchV: number;
  phase: number;
  jaw: number;
  flash: number;
  /** 'gone': out of the world, waiting to come back · 'roam': in the water. */
  motion: 'gone' | 'roam';
  /** Which appearance of its slot this is (each spawn counts one more): the tracker, the sphere and the sonar's notes
   *  follow this one beast, not whatever comes out of the same slot later (owner, 15 ottobre). */
  serial?: number;
  /** What it is doing: wandering, coming at you, slipping away. */
  mood: 'wander' | 'chase' | 'flee';
  /** Where it is swimming to while wandering. */
  target: { x: number; y: number } | null;
  /** Seconds it still ignores you (after a battle you fled from, or while the sardine swarm hides you). */
  calm: number;
  respawn: number;
  /** 0 = normal; 0..1 while turning around, from turnFrom. */
  turn: number;
  turnFrom: 1 | -1;
  /** Title in the battle for named beasts. */
  boss?: string;
  /** Its pack (block 5b): how many mates swim with it now. */
  pack: number;
  /** A hunted beast beaten, back in its den until it comes out again: the sonar hears no anomalous echo meanwhile
   *  (owner, 20 ottobre: the legend just beaten stayed on the sonar). */
  resting?: boolean;
  /** The light under the still ship calls it there (ship/underLight.ts), or null. */
  drawn: { x: number; y: number } | null;
  /** What it hunts now (a sardine school, a smaller beast), or what hunts it (beasts/packHunt.ts), or null. */
  hunt: { x: number; y: number; prey?: number; school?: number } | null;
  fleeFrom: { x: number; y: number } | null;
  /** A big hunter's passes before it charges (beasts/patrol.ts); undefined: none. */
  patrol?: Patrol;
  /** It made passes this time (patrolled), and now it charges, faster. */
  patrolled?: boolean;
  charging?: boolean;
  /** Seconds before it looks again for something to hunt. */
  lookT: number;
  /** Share of its health your weapons took in the sea (0 … HARPOON_WEAKEN.max): it starts the battle without it. */
  wounds?: number;
  /** A touch happened: the battle starts in `t` seconds (encounters.ts), the bites seen meanwhile. */
  battleIn?: { t: number; first: 'you' | 'foe' | 'normal'; fear?: Fear };
  /** You hit it first (your weapon, your mount's bite): in the battle you go first (swimFight.ts touchOutcome). */
  struckFirst?: boolean;
  /** Seconds it stays roused by your weapons: fleeing fast (swimFight.ts, roam.ts). */
  provoked?: number;
  /** A hunter roused by your weapon or your mount: stalking you, charging from the dark (beasts/stalk.ts). */
  stalk?: Stalk;
}

/** Worn down to half its health by your weapons or your mount: it no longer attacks, it limps away (swimFight.ts). */
export const isWorn = (w: { wounds?: number }): boolean => (w.wounds ?? 0) >= HARPOON_WEAKEN.max - 1e-6;

export function createWild(id: number, spawn: WildSpawnDef): WildBeast {
  const form: BeastForm = { speciesId: spawn.speciesId, variant: 'comune' };
  return {
    id,
    spawn,
    form,
    level: 1,
    x: -1000,
    y: 0,
    face: 1,
    pitch: 0,
    length: formLengthUnits(form),
    vx: 0,
    vy: 0,
    pitchV: 0,
    phase: 0,
    jaw: 0,
    flash: 0,
    motion: 'gone',
    mood: 'wander',
    target: null,
    calm: 0,
    wounds: 0,
    provoked: 0,
    respawn: 0,
    turn: 0,
    turnFrom: 1,
    pack: 0,
    drawn: null,
    hunt: null,
    fleeFrom: null,
    patrol: undefined,
    charging: undefined,
    patrolled: undefined,
    lookT: 0,
  };
}

/** Brings a beast into the world as a given form and level, at a point. */
export function spawnWild(
  b: WildBeast,
  form: BeastForm,
  level: number,
  x: number,
  y: number,
  face: 1 | -1,
): void {
  Object.assign(b, {
    resting: false,
    serial: (b.serial ?? 0) + 1,
    form,
    level,
    length: formLengthUnits(form, level),
    shape: shapeOfForm(form),
    x,
    y,
    face,
    vx: 0,
    vy: 0,
    motion: 'roam',
    mood: 'wander',
    target: null,
    calm: 0,
    wounds: 0,
    struckFirst: false,
    battleIn: undefined,
    provoked: 0,
    turn: 0,
    jaw: 0,
    flash: 0,
    boss: undefined,
    pack: BEAST_TEMPER[form.speciesId]?.school ?? 0, // its mates come out of the dark with it
    drawn: null,
    hunt: null,
    fleeFrom: null,
    patrol: undefined,
    charging: undefined,
    patrolled: undefined,
    lookT: 0,
  });
}

/** Out of the world until it comes back. */
export function removeWild(b: WildBeast, respawnSeconds: number): void {
  b.motion = 'gone';
  b.respawn = respawnSeconds;
  b.boss = undefined;
}

export const isInWater = (b: WildBeast): boolean => b.motion !== 'gone';

/** A rare find: albino, alfa, a legendary or a Guardian (they shine and slip away). */
export const isRare = (b: WildBeast): boolean => b.form.variant !== 'comune' || !!b.form.unique;

/** The radius used against rock. */
export const bodyRadius = (b: WildBeast): number => b.length * BEAST_BODY.collideRadiusFrac;
