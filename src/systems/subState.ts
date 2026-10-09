// The submarine's state, its save, its model and its shape (submarine.ts steps it). No stepping here.
import { freshPressure } from './breath';
import { SUB_MODELS, SUBMARINE, type SubModel } from '../data/submarine';
import { WORLD } from '../data/worldLayout';
import { type TeamBeast } from './beasts/team';
import { clamp, type Rng } from './math';
import type { TileMap } from './world/tileMap';
import type { HullPart } from './hull';

export interface SubState {
  owned: boolean;
  /** The model you use, and those you own. */
  model: string;
  models: string[];
  /** Where it is (where you left it, or under you). */
  x: number;
  y: number;
  vx: number;
  vy: number;
  face: 1 | -1;
  hull: number;
  /** Litres of fuel (fuel.ts); dry, it does not move. */
  fuel: number;
  /** Already said it is dry (until it gets fuel again). */
  fuelWarned: boolean;
  aboard: boolean;
  /** Seconds before the "too deep" message may show again. */
  deepWarn: number;
  /** Seconds before running into rock can damage it again. */
  bumpWait: number;
  /** Deeper than its model allows: 1 = safe … 0 = the hull is crushed little by little (breath.ts). */
  pressure: number;
  pressureHurt: number;
  /** Seconds of air left under water (subAir.ts; saved). */
  air: number;
}

export interface SavedSub {
  x: number;
  y: number;
  model: string;
  models: string[];
  hull: number;
  fuel: number;
  /** Seconds of air (added 9 ottobre; missing = full). */
  air?: number;
}

export const subModel = (id: string): SubModel => SUB_MODELS.find((m) => m.id === id) ?? SUB_MODELS[0]!;

export function newSub(saved: SavedSub | null): SubState {
  const model = saved ? subModel(saved.model).id : SUB_MODELS[0]!.id;
  return {
    owned: !!saved,
    model,
    models: saved ? [...saved.models] : [model],
    x: saved?.x ?? SUBMARINE.mooredX,
    y: saved?.y ?? SUBMARINE.restY,
    vx: 0,
    vy: 0,
    face: 1,
    hull: saved ? clamp(saved.hull, 0, subModel(model).hull) : subModel(model).hull,
    aboard: false,
    deepWarn: 0,
    bumpWait: 0,
    fuel: saved ? clamp(saved.fuel, 0, subModel(model).tank) : subModel(model).tank,
    fuelWarned: false,
    ...freshPressure(),
    air: Math.min(subModel(model).airSeconds, saved?.air ?? subModel(model).airSeconds),
  };
}

export const saveSub = (s: SubState): SavedSub | null =>
  s.owned
    ? {
        x: Math.round(s.x),
        y: Math.round(s.y),
        model: s.model,
        models: [...s.models],
        hull: Math.round(s.hull),
        fuel: Math.round(s.fuel * 10) / 10,
        air: Math.round(s.air),
      }
    : null;

export interface SubWorld {
  sub: SubState;
  map: TileMap;
  rng: Rng;
  diver: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    face: 1 | -1;
    o2: number;
    maxO2: number;
    hp: number;
    maxHp: number;
    dead: boolean;
  };
  beasts: { team: TeamBeast[] };
  gear: { teeth: number };
}

/** Its length in world units (each model its own: owner, 8 ottobre, it looked too small). */
export const subLength = (s: { model: string }): number => subModel(s.model).lengthM * WORLD.unitsPerMetre;

/** The highest it goes (world y of its middle): surfaced, deck and tower out of the water. */
export const subTopY = (s: { model: string }): number =>
  WORLD.surfaceY - SUBMARINE.surfaceFloat * subLength(s);

/** Its body: the circles of SUBMARINE.body (drawn for SUBMARINE.length), scaled to its model's length. */
export const subBody = (s: { model: string }): [number, number][] => {
  const k = subLength(s) / SUBMARINE.length;
  return SUBMARINE.body.map(([dx, r]) => [dx * k, r * k]);
};

/** Where you wake up when you own it: next to it (then you climb in). */
export const subWakePoint = (s: SubState): { x: number; y: number } => ({
  x: s.x,
  y: Math.max(WORLD.surfaceY + 6, s.y - 14),
});

/** Its hull as circles in the world (for pushOutOfHull, hull.ts); none when it is not yours. */
export const subHull = (s: SubState): HullPart[] =>
  s.owned ? subBody(s).map(([dx, r]) => ({ x: s.x + dx, y: s.y, r })) : [];
