// Your submarine (tappa 16, data/submarine.ts; it replaces the boat of tappa 12). Aurelio gives it to you at
// Porto Fango, in the hold of your ship. You climb in next to it at any depth, steer it under water (down to its
// model's depth, under the icebergs), get out and it waits where you left it. Inside you breathe and rest your team, but you
// cannot fight: ordinary beasts slip away (encounters.ts), big aggressive ones ram it. A broken submarine is towed
// back to Portofosco; ports repair it for teeth. Pure logic; views/submarineView.ts draws it.
import { SUB_MODELS, SUBMARINE, type SubModel } from '../data/submarine';
import { WORLD } from '../data/worldLayout';
import { maxHpOf, type TeamBeast } from './beasts/team';
import type { GameEvent } from './events';
import type { InputState } from './input';
import { clamp, type Rng } from './math';
import type { TileMap } from './world/tileMap';
import { PRESSURE } from '../data/diver';
import { freshPressure, stepPressure } from './breath';
import { HELM } from '../data/ship';
import { diveOf, stepHeading, type HelmState } from './helm';
import { litresFor } from './fuelBurn';
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
}

export interface SavedSub {
  x: number;
  y: number;
  model: string;
  models: string[];
  hull: number;
  fuel: number;
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

/** Close enough to climb in (at any depth). */
export function canBoard(g: SubWorld): boolean {
  const s = g.sub;
  const d = g.diver;
  return s.owned && !s.aboard && !d.dead && Math.hypot(d.x - s.x, d.y - s.y) < SUBMARINE.reach;
}

/** You climb in: you breathe, but nobody heals any more (owner, 4 ottobre: only on the ship and at the port). */
export function board(g: SubWorld, events: GameEvent[]): void {
  const s = g.sub;
  if (!s.owned) return;
  s.aboard = true;
  s.vx = 0;
  s.vy = 0;
  Object.assign(g.diver, { x: s.x, y: s.y, vx: 0, vy: 0 });
  g.diver.o2 = g.diver.maxO2;
  events.push({ type: 'boarded' });
}

/** Aboard the ship (and at the port): you breathe and heal, and your team rests. */
export function restAboard(g: Pick<SubWorld, 'diver' | 'beasts'>): void {
  const d = g.diver;
  d.hp = d.maxHp;
  d.o2 = d.maxO2;
  for (const t of g.beasts.team) {
    t.hp = maxHpOf(t);
    t.ppUsed = undefined;
    t.status = undefined;
    t.sleepTurns = undefined;
    t.ko = false;
  }
}

/** You get out: it stays here, still. */
export function leaveSub(g: SubWorld, events: GameEvent[]): void {
  const s = g.sub;
  if (!s.aboard) return;
  if (Math.hypot(s.vx, s.vy) >= SUBMARINE.stillBelow) {
    events.push({ type: 'shipHint', text: 'stopToLeave' });
    return;
  }
  s.aboard = false;
  s.vx = 0;
  s.vy = 0;
  const below = g.map.solidAt(s.x, s.y + 14) ? -14 : 14; // out of the hatch, under it if there is room
  Object.assign(g.diver, { x: s.x, y: Math.max(WORLD.surfaceY + 4, s.y + below), vx: 0, vy: 0 });
  events.push({ type: 'dove' });
}

/** Its length in world units (each model its own: owner, 8 ottobre, it looked too small). */
export const subLength = (s: { model: string }): number => subModel(s.model).lengthM * WORLD.unitsPerMetre;

/** Its body: the circles of SUBMARINE.body (drawn for SUBMARINE.length), scaled to its model's length. */
const subBody = (s: { model: string }): [number, number][] => {
  const k = subLength(s) / SUBMARINE.length;
  return SUBMARINE.body.map(([dx, r]) => [dx * k, r * k]);
};

/** Its body against rock. */
function hits(map: TileMap, s: SubState, x: number, y: number): boolean {
  return subBody(s).some(([dx, r]) => map.hitCircle(x + dx, y, r));
}

/** It ran into rock at this speed (one axis): it bounces back; fast enough, the hull takes it. */
function bump(g: SubWorld, speed: number, events: GameEvent[]): void {
  const B = SUBMARINE.bump;
  const s = g.sub;
  if (speed < B.minSpeed || s.bumpWait > 0) return;
  s.bumpWait = B.cooldown;
  damageHull(g, Math.max(B.minDamage, Math.round((speed - B.minSpeed) * B.damagePerSpeed)), 'rock', events);
}

/**
 * The levers move it (helm.ts): the throttle along where it points, the direction lever turns it round once slow,
 * the dive lever up or down. After a bump (moving backwards) the bounce dies out first.
 */
function steer(s: SubState, helm: HelmState, top: number, dt: number): void {
  const along = s.vx * s.face;
  if (along < 0) {
    s.vx -= s.vx * SUBMARINE.drag * dt;
    // the bounce never reaches exactly zero: below a small speed it is over, or the levers would never drive again
    if (Math.abs(s.vx) < SUBMARINE.bounceStop) s.vx = 0;
  } else {
    const rates = {
      accel: SUBMARINE.accel,
      coast: SUBMARINE.coast,
      brake: SUBMARINE.accel,
      turnBelow: HELM.subTurnBelow,
    };
    const h = stepHeading(s.face, along, helm, top, rates, dt);
    s.face = h.face;
    s.vx = h.speed * h.face;
  }
  const vyTarget = diveOf(helm.dive) * top * HELM.subDiveMult;
  const step = SUBMARINE.accel * dt;
  s.vy += Math.max(-step, Math.min(step, vyTarget - s.vy));
}

/** The engine burns fuel while it runs (the throttle, or the dive lever); dry, it says so once. */
function burnFuel(s: SubState, helm: HelmState, perKm: number, dt: number, events: GameEvent[]): void {
  const run = Math.max(helm.throttle, Math.abs(diveOf(helm.dive)));
  s.fuel = Math.max(0, s.fuel - litresFor(Math.hypot(s.vx, s.vy) * dt, run, perKm));
  if (s.fuel > 0) s.fuelWarned = false;
  else if (!s.fuelWarned) {
    s.fuelWarned = true;
    events.push({ type: 'fuelOut', vehicle: 'sub' });
  }
}

/** The deepest point this model stands (world y): deeper, the pressure bar empties. */
export const subFloorY = (s: SubState): number =>
  WORLD.surfaceY + subModel(s.model).maxDepthM * WORLD.unitsPerMetre;

/**
 * Aurelio's gift at Porto Fango (story.ts), together with the ship: the submarine waits in its hold at x. One you
 * already had (an older save) is brought into the hold too, unless you are inside it.
 */
export function giftSub(s: SubState, x: number): void {
  if (s.aboard) return;
  if (!s.owned) Object.assign(s, { owned: true, hull: subModel(s.model).hull });
  Object.assign(s, { x, y: SUBMARINE.restY, vx: 0, vy: 0 });
}

/** One step of the submarine. Returns true while you are inside (it moves you, not your swimming). */
export function stepSub(g: SubWorld, input: InputState, dt: number, events: GameEvent[]): boolean {
  const s = g.sub;
  if (!s.owned) return false;
  s.deepWarn = Math.max(0, s.deepWarn - dt);
  s.bumpWait = Math.max(0, s.bumpWait - dt);
  if (!s.aboard) return false;
  const d = g.diver;
  const m = subModel(s.model);
  const top = s.hull <= 0 || s.fuel <= 0 ? 0 : m.speed; // broken or dry, it only drifts
  steer(s, input.helm, top, dt);
  burnFuel(s, input.helm, m.perKm, dt, events);
  const nx = s.x + s.vx * dt;
  if (hits(g.map, s, nx, s.y)) {
    bump(g, Math.abs(s.vx), events);
    s.vx = -s.vx * SUBMARINE.bump.bounce;
  } else s.x = nx;
  // no invisible floor any more (owner, 4 ottobre): deeper than its model, the pressure crushes the hull
  const ny = Math.max(SUBMARINE.restY, s.y + s.vy * dt); // it stays under the surface
  if (hits(g.map, s, s.x, ny)) {
    bump(g, Math.abs(s.vy), events);
    s.vy = -s.vy * SUBMARINE.bump.bounce;
  } else s.y = ny;
  const overM = (s.y - subFloorY(s)) / WORLD.unitsPerMetre;
  if (overM > 0 && s.deepWarn <= 0) {
    events.push({ type: 'subTooDeep' });
    s.deepWarn = 6;
  }
  if (stepPressure(s, overM, dt)) damageHull(g, PRESSURE.hullDamage, 'pressure', events);
  d.face = s.face;
  Object.assign(d, { x: s.x, y: s.y, vx: s.vx, vy: s.vy, o2: d.maxO2 });
  return true;
}

/** A big beast rammed it (encounters.ts): the hull takes it and the blow pushes it away from the beast. */
export function ramSub(
  g: SubWorld,
  lengthM: number,
  fromX: number,
  fromY: number,
  events: GameEvent[],
): void {
  const s = g.sub;
  if (!s.aboard || s.hull <= 0) return;
  const dx = s.x - fromX;
  const dy = s.y - fromY;
  const dist = Math.hypot(dx, dy) || 1;
  s.vx += (dx / dist) * SUBMARINE.ram.knock;
  s.vy += (dy / dist) * SUBMARINE.ram.knock;
  damageHull(g, Math.round(SUBMARINE.ram.damage * (lengthM / 6)), 'beast', events);
}

/** The hull takes a blow; at zero the submarine is towed back to Portofosco, you with it. */
function damageHull(
  g: SubWorld,
  amount: number,
  by: 'rock' | 'beast' | 'pressure',
  events: GameEvent[],
): void {
  const s = g.sub;
  if (!s.aboard || s.hull <= 0) return;
  const max = subModel(s.model).hull;
  s.hull = Math.max(0, s.hull - amount);
  events.push({ type: 'subRammed', hull: s.hull, max, by, x: s.x, y: s.y });
  if (s.hull > 0) return;
  // broken: towed home, you with it (a price in teeth, like losing your senses)
  const teeth = Math.floor(g.gear.teeth * SUBMARINE.wreckTeethLoss);
  g.gear.teeth -= teeth;
  Object.assign(s, { x: SUBMARINE.mooredX, y: SUBMARINE.restY, vx: 0, vy: 0 });
  Object.assign(g.diver, { x: s.x, y: s.y });
  events.push({ type: 'subWrecked', teeth });
}

/** Coming into a port: the hull is mended, for the teeth you have. */
export function repairSub(g: SubWorld, events: GameEvent[]): void {
  const s = g.sub;
  const missing = subModel(s.model).hull - s.hull;
  if (!s.owned || missing <= 0) return;
  const points = Math.min(missing, Math.floor(g.gear.teeth / SUBMARINE.repairPerPoint));
  if (points <= 0) return;
  const cost = points * SUBMARINE.repairPerPoint;
  g.gear.teeth -= cost;
  s.hull += points;
  events.push({ type: 'subRepaired', cost });
}

/** Where you wake up when you own it: next to it (then you climb in). */
export const subWakePoint = (s: SubState): { x: number; y: number } => ({
  x: s.x,
  y: Math.max(WORLD.surfaceY + 6, s.y - 14),
});

/** Where the lamp points: the diver's aim, or in the submarine where its nose points. */
export function lampAim(g: {
  sub: SubState;
  diver: { aim: number };
  boat?: { aboard: boolean; face: 1 | -1 };
}): number {
  // in a vehicle its headlight points where it goes (owner, 8 ottobre: the boat's stayed to the right)
  if (g.boat?.aboard) return g.boat.face > 0 ? 0 : Math.PI;
  return g.sub.aboard ? (g.sub.face > 0 ? 0 : Math.PI) : g.diver.aim;
}

/** Its hull as circles in the world (for pushOutOfHull, hull.ts); none when it is not yours. */
export const subHull = (s: SubState): HullPart[] =>
  s.owned ? subBody(s).map(([dx, r]) => ({ x: s.x + dx, y: s.y, r })) : [];
