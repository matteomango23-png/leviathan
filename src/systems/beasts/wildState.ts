// Wild beasts in the open sea: their state, how they (re)appear, and simple queries. Movement is in roam.ts.
// They do not fight in the water: touching them, or hitting them with a weapon, starts a turn-based battle.
import { BEAST_BODY, type WildSpawnDef } from '../../data/beasts';
import type { BodyPose } from './combat';
import { formLengthUnits, type BeastForm, shapeOfForm } from './forms';

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
  /** Title in the battle for named beasts (a Guardian, the Vedova's crocodile). */
  boss?: string;
  /** Guardian id (e.g. 'sfregiato') when this beast is a region's Guardian. */
  guardian?: string;
  /** Lives in a Guardian's lair: moved by guardian.ts, never respawns on its own. */
  arena?: boolean;
  /** A beast of the story (the Re Corallo): beaten it stays, and the story decides what happens (chapter3.ts). */
  storyBoss?: boolean;
  /** How its last battle ended, for the story to read (storyBoss only). */
  beaten?: 'won' | 'caught';
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

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
    respawn: 0,
    turn: 0,
    turnFrom: 1,
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
    turn: 0,
    jaw: 0,
    flash: 0,
    boss: undefined,
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
