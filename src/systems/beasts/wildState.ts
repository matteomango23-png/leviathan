// Wild beasts: their state, how they (re)appear, and simple queries. Movement is in wild.ts.
import { BEAST_COMBAT, BEAST_TEMPER, BIG_BEAST_MOTION as M, type WildSpawnDef } from '../../data/beasts';
import type { Stats } from '../../data/species';
import { range, type Rng } from '../math';
import type { TileMap } from '../world/tileMap';
import type { BodyPose } from './combat';
import { formLengthUnits, formStats, type BeastForm } from './forms';

export type Mood = 'calm' | 'angry' | 'tired' | 'taming' | 'fleeing';
export type Motion = 'gone' | 'away' | 'hidden' | 'enter' | 'cruise' | 'exit' | 'bolt' | 'attack';

export interface WildBeast extends BodyPose {
  id: number;
  spawn: WildSpawnDef;
  form: BeastForm;
  level: number;
  stats: Stats;
  hp: number;
  maxHp: number;
  vx: number;
  vy: number;
  pitchV: number;
  phase: number;
  jaw: number;
  flash: number;
  barTime: number;
  motion: Motion;
  mood: Mood;
  t: number;
  dy: number;
  onScreenTime: number;
  followTime: number;
  angryTime: number;
  tiredTime: number;
  attackPlanned: boolean;
  telegraph: number;
  biteCooldown: number;
  bit: boolean;
  respawn: number;
  leaving: boolean;
  announced: boolean;
  /** Seconds left stunned (no attacks, almost still). */
  stun: number;
  /** Seconds left slowed (e.g. caught in a net). */
  slow: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WildContext {
  diver: { x: number; y: number; vx: number; vy: number; dead: boolean };
  view: Rect;
  map: TileMap;
  rng: Rng;
  dt: number;
}

export function createWild(id: number, spawn: WildSpawnDef): WildBeast {
  const form: BeastForm = { speciesId: spawn.speciesId, variant: 'comune' };
  return {
    id,
    spawn,
    form,
    level: 1,
    stats: formStats(form, 1),
    hp: 1,
    maxHp: 1,
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
    barTime: 0,
    motion: 'gone',
    mood: 'calm',
    t: 0,
    dy: 0,
    onScreenTime: 0,
    followTime: 0,
    angryTime: 0,
    tiredTime: 0,
    attackPlanned: false,
    telegraph: 0,
    biteCooldown: 0,
    bit: false,
    respawn: 0,
    leaving: false,
    announced: false,
    stun: 0,
    slow: 0,
  };
}

/** Brings a beast (back) into the world as a given form and level; it waits off screen. */
export function spawnWild(
  b: WildBeast,
  form: BeastForm,
  level: number,
  rng: Rng,
  waitSeconds?: number,
): void {
  b.form = form;
  b.level = level;
  b.stats = formStats(form, level);
  b.maxHp = b.stats.hp;
  b.hp = b.maxHp;
  b.length = formLengthUnits(form, level);
  b.mood = 'calm';
  b.motion = 'hidden';
  b.t = waitSeconds ?? range(rng, M.waitCalm[0], M.waitCalm[1]);
  b.face = rng() < 0.5 ? 1 : -1;
  b.vx = 0;
  b.vy = 0;
  b.attackPlanned = false;
  b.leaving = false;
  b.announced = false;
  b.biteCooldown = 0;
  b.stun = 0;
  b.slow = 0;
}

/** Chance that a calm beast of this species attacks on a pass. */
export function attackChanceOf(b: WildBeast): number {
  return BEAST_TEMPER[b.form.speciesId]?.attackChance ?? BEAST_COMBAT.attackChance;
}

/** Stuns (and interrupts an attack). */
export function stunWild(b: WildBeast, seconds: number): void {
  if (!isInWater(b) || b.mood === 'taming') return;
  b.stun = Math.max(b.stun, seconds);
  if (b.motion === 'attack') b.motion = 'exit';
  b.attackPlanned = false;
}

export const isInWater = (b: WildBeast): boolean =>
  b.motion !== 'gone' && b.motion !== 'away' && b.motion !== 'hidden';
export const isVisibleWild = isInWater;
