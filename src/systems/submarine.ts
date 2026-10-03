// Your submarine (tappa 16, data/submarine.ts; it replaces the boat of tappa 12). Aurelio gives it to you at the
// end of chapter 1. You climb in next to it at any depth, steer it under water (down to its model's depth, under
// the icebergs), get out and it waits where you left it. Inside you breathe, rest your team and fish, but you
// cannot fight: ordinary beasts slip away (encounters.ts), big aggressive ones ram it. A broken submarine is towed
// back to Portofosco; ports repair it for teeth. Pure logic; views/submarineView.ts draws it.
import { SUB_FISH, SUB_MODELS, SUBMARINE, type SubModel } from '../data/submarine';
import { ENDLESS } from '../data/endless';
import { STORY_STEPS, type StoryStep } from '../data/story';
import { ICE, LAYOUT, OPEN_SEA_X, WORLD, east } from '../data/worldLayout';
import { maxHpOf, type TeamBeast } from './beasts/team';
import type { GameEvent } from './events';
import type { InputState } from './input';
import { clamp, range, type Rng } from './math';
import { biomeAt } from './world/endless';
import type { TileMap } from './world/tileMap';

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
  aboard: boolean;
  /** Fishing: seconds left (waiting for a bite, or to tap once it bites). */
  fishing: { t: number; bite: boolean } | null;
  /** The weapon button was held last frame (a tap is its press). */
  firePrev: boolean;
  /** Seconds before the "too deep" message may show again. */
  deepWarn: number;
}

export interface SavedSub {
  x: number;
  y: number;
  model: string;
  models: string[];
  hull: number;
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
    fishing: null,
    firePrev: false,
    deepWarn: 0,
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
  story: { step: StoryStep };
  beasts: { team: TeamBeast[] };
  gear: { bag: Record<string, number>; teeth: number };
  fishCaught: Record<string, number>;
  seen: Set<string>;
}

const after = (step: StoryStep, than: StoryStep): boolean =>
  STORY_STEPS.indexOf(step) >= STORY_STEPS.indexOf(than);

/** Close enough to climb in (at any depth). */
export function canBoard(g: SubWorld): boolean {
  const s = g.sub;
  const d = g.diver;
  return s.owned && !s.aboard && !d.dead && Math.hypot(d.x - s.x, d.y - s.y) < SUBMARINE.reach;
}

/** You climb in: you and your team rest (it is a moving sanctuary). */
export function board(g: SubWorld, events: GameEvent[]): void {
  const s = g.sub;
  if (!s.owned) return;
  s.aboard = true;
  s.vx = 0;
  s.vy = 0;
  s.fishing = null;
  const d = g.diver;
  Object.assign(d, { x: s.x, y: s.y, vx: 0, vy: 0, hp: d.maxHp, o2: d.maxO2 });
  for (const t of g.beasts.team) {
    t.hp = maxHpOf(t);
    t.ppUsed = undefined;
    t.status = undefined;
    t.sleepTurns = undefined;
    t.ko = false;
  }
  events.push({ type: 'boarded' });
}

/** You get out: it stays here, still. */
export function leaveSub(g: SubWorld, events: GameEvent[]): void {
  const s = g.sub;
  if (!s.aboard) return;
  s.aboard = false;
  s.vx = 0;
  s.vy = 0;
  s.fishing = null;
  const below = g.map.solidAt(s.x, s.y + 14) ? -14 : 14; // out of the hatch, under it if there is room
  Object.assign(g.diver, { x: s.x, y: Math.max(WORLD.surfaceY + 4, s.y + below), vx: 0, vy: 0 });
  events.push({ type: 'dove' });
}

/** The fish that bite here, by the kind of sea. */
export function subFishAt(x: number): string[] {
  const b = biomeAt(x);
  if (b) return SUB_FISH[b.id];
  if (x < LAYOUT.island.x0) return SUB_FISH.baia;
  if (x < OPEN_SEA_X) return SUB_FISH.delta;
  if (x < east(4020)) return SUB_FISH.barriera;
  if (x < ICE.xMin) return SUB_FISH.foresta;
  return x < ENDLESS.startX ? SUB_FISH.ghiaccio : SUB_FISH.aperto;
}

function fish(g: SubWorld, tap: boolean, dt: number, events: GameEvent[]): void {
  const s = g.sub;
  const F = SUBMARINE.fishing;
  if (Math.hypot(s.vx, s.vy) > F.maxSpeed) {
    s.fishing = null; // moving pulls the line in
    return;
  }
  const f = s.fishing;
  if (!f) {
    if (tap) {
      s.fishing = { t: range(g.rng, F.wait[0], F.wait[1]), bite: false };
      events.push({ type: 'lineCast' });
    }
    return;
  }
  f.t -= dt;
  if (!f.bite) {
    if (tap) {
      s.fishing = null; // pulled in too early
      events.push({ type: 'fishEscaped' });
    } else if (f.t <= 0) {
      f.bite = true;
      f.t = F.window;
      events.push({ type: 'fishBite' });
    }
    return;
  }
  if (tap) {
    const kinds = subFishAt(s.x);
    const kind = kinds[Math.floor(g.rng() * kinds.length)]!;
    g.gear.bag[kind] = (g.gear.bag[kind] ?? 0) + 1;
    const count = (g.fishCaught[kind] ?? 0) + 1;
    g.fishCaught[kind] = count;
    if (!g.seen.has(kind)) {
      g.seen.add(kind);
      events.push({ type: 'creatureSeen', id: kind });
    }
    events.push({ type: 'fishCaught', fishId: kind, count, healed: false });
    s.fishing = null;
  } else if (f.t <= 0) {
    s.fishing = null;
    events.push({ type: 'fishEscaped' });
  }
}

/** Its body against rock: bow, middle and stern. */
function hits(map: TileMap, x: number, y: number): boolean {
  const off = SUBMARINE.length / 2 - SUBMARINE.radius;
  return [-off, 0, off].some((dx) => map.hitCircle(x + dx, y, SUBMARINE.radius));
}

/** The deepest point this model reaches (world y). */
export const subFloorY = (s: SubState): number =>
  WORLD.surfaceY + subModel(s.model).maxDepthM * WORLD.unitsPerMetre;

/**
 * One step of the submarine. Returns true while you are inside (it moves you, not your swimming).
 * Also: Aurelio's gift once chapter 1 is over.
 */
export function stepSub(g: SubWorld, input: InputState, dt: number, events: GameEvent[]): boolean {
  const s = g.sub;
  if (!s.owned && after(g.story.step, 'chapter1Done')) {
    s.owned = true;
    Object.assign(s, { x: SUBMARINE.mooredX, y: SUBMARINE.restY, hull: subModel(s.model).hull });
    events.push({ type: 'subGiven' });
  }
  if (!s.owned) return false;
  s.deepWarn = Math.max(0, s.deepWarn - dt);
  const tap = (input.fireHeld && !s.firePrev) || !!input.shotAt;
  s.firePrev = input.fireHeld;
  if (!s.aboard) return false;
  const d = g.diver;
  const m = subModel(s.model);
  const broken = s.hull <= 0;
  const k = broken ? 0 : 1;
  s.vx += input.moveX * SUBMARINE.accel * k * dt;
  s.vy += input.moveY * SUBMARINE.accel * k * dt;
  s.vx -= s.vx * SUBMARINE.drag * dt;
  s.vy -= s.vy * SUBMARINE.drag * dt;
  const sp = Math.hypot(s.vx, s.vy);
  if (sp > m.speed) {
    s.vx *= m.speed / sp;
    s.vy *= m.speed / sp;
  }
  const nx = s.x + s.vx * dt;
  if (hits(g.map, nx, s.y)) s.vx = 0;
  else s.x = nx;
  let ny = s.y + s.vy * dt;
  const floor = subFloorY(s);
  if (ny > floor) {
    ny = floor;
    s.vy = 0;
    if (input.moveY > 0.3 && s.deepWarn <= 0) {
      events.push({ type: 'subTooDeep' });
      s.deepWarn = 6;
    }
  }
  ny = Math.max(SUBMARINE.restY, ny); // it stays under the surface
  if (hits(g.map, s.x, ny)) s.vy = 0;
  else s.y = ny;
  if (Math.abs(input.moveX) > 0.2) s.face = input.moveX > 0 ? 1 : -1;
  d.face = s.face;
  Object.assign(d, { x: s.x, y: s.y, vx: s.vx, vy: s.vy, o2: d.maxO2 });
  fish(g, tap, dt, events);
  return true;
}

/** A big beast rammed it (encounters.ts): the hull takes it; at zero it is towed back to Portofosco. */
export function ramSub(g: SubWorld, lengthM: number, events: GameEvent[]): void {
  const s = g.sub;
  if (!s.aboard || s.hull <= 0) return;
  const max = subModel(s.model).hull;
  s.hull = Math.max(0, s.hull - Math.round(SUBMARINE.ram.damage * (lengthM / 6)));
  events.push({ type: 'subRammed', hull: s.hull, max });
  if (s.hull > 0) return;
  // broken: towed home, you with it (a price in teeth, like losing your senses)
  const teeth = Math.floor(g.gear.teeth * SUBMARINE.wreckTeethLoss);
  g.gear.teeth -= teeth;
  Object.assign(s, { x: SUBMARINE.mooredX, y: SUBMARINE.restY, vx: 0, vy: 0, fishing: null });
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

/** Buying (or switching to) a model at the port: a new one comes out of the yard at full hull. */
export function buySub(g: SubWorld, id: string): { ok: boolean; reason?: string } {
  const m = SUB_MODELS.find((x) => x.id === id);
  const s = g.sub;
  if (!m) return { ok: false, reason: 'Sottomarino sconosciuto.' };
  if (!s.owned) return { ok: false, reason: 'Prima Aurelio deve lasciarti il suo batiscafo.' };
  if (!s.models.includes(id)) {
    if (g.gear.teeth < m.price)
      return { ok: false, reason: `Servono ${m.price} denti (ne hai ${g.gear.teeth}).` };
    g.gear.teeth -= m.price;
    s.models.push(id);
    s.hull = m.hull;
  } else {
    // switching to one you own: the same share of hull (the yard keeps them in the same state)
    s.hull = Math.round((s.hull / subModel(s.model).hull) * m.hull);
  }
  s.model = id;
  return { ok: true };
}

/** Where you wake up when you own it: next to it (then you climb in). */
export const subWakePoint = (s: SubState): { x: number; y: number } => ({
  x: s.x,
  y: Math.max(WORLD.surfaceY + 6, s.y - 14),
});
