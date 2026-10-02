// Your boat (tappa 12): Aurelio gives it to you at the end of chapter 1. You climb aboard at the surface next
// to it, sail fast along the surface (no air used, no wild beast reaches you), dive from it (it waits at anchor),
// rest your team aboard and wake up on it after losing your senses. From it you can fish: wait for a bite,
// tap while the float is under. Pure logic; views/boatView.ts draws it.
import { BOAT, BOAT_FISH } from '../data/boat';
import { ENDLESS } from '../data/endless';
import { STORY_STEPS, type StoryStep } from '../data/story';
import { ICE, LAYOUT, OPEN_SEA_X, WORLD, east } from '../data/worldLayout';
import { maxHpOf, type TeamBeast } from './beasts/team';
import type { GameEvent } from './events';
import type { InputState } from './input';
import { clamp, range, type Rng } from './math';
import { biomeAt } from './world/endless';
import type { TileMap } from './world/tileMap';

export interface BoatState {
  owned: boolean;
  /** Where it is (at anchor, or under you). */
  x: number;
  vx: number;
  aboard: boolean;
  /** Fishing: seconds left (waiting for a bite, or to tap once it bites). */
  fishing: { t: number; bite: boolean } | null;
  /** The weapon button was held last frame (a tap is its press). */
  firePrev: boolean;
}

export const newBoat = (saved: { x: number } | null): BoatState => ({
  owned: !!saved,
  x: saved?.x ?? BOAT.mooredX,
  vx: 0,
  aboard: false,
  fishing: null,
  firePrev: false,
});

export interface BoatWorld {
  boat: BoatState;
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
  gear: { bag: Record<string, number> };
  fishCaught: Record<string, number>;
  seen: Set<string>;
}

const after = (step: StoryStep, than: StoryStep): boolean =>
  STORY_STEPS.indexOf(step) >= STORY_STEPS.indexOf(than);

/** Close enough, at the surface, to climb aboard. */
export function canBoard(g: BoatWorld): boolean {
  const b = g.boat;
  const d = g.diver;
  return (
    b.owned &&
    !b.aboard &&
    !d.dead &&
    d.y < WORLD.surfaceY + BOAT.surfaceBand &&
    Math.abs(d.x - b.x) < BOAT.reach
  );
}

/** You climb aboard: you and your team rest (the boat is a moving sanctuary). */
export function board(g: BoatWorld, events: GameEvent[]): void {
  const b = g.boat;
  if (!b.owned) return;
  b.aboard = true;
  b.vx = 0;
  b.fishing = null;
  const d = g.diver;
  Object.assign(d, { x: b.x, y: WORLD.surfaceY + 4, vx: 0, vy: 0, hp: d.maxHp, o2: d.maxO2 });
  for (const t of g.beasts.team) {
    t.hp = maxHpOf(t);
    t.ko = false;
  }
  events.push({ type: 'boarded' });
}

/** You dive from the boat: it stays here at anchor. */
export function dive(g: BoatWorld, events: GameEvent[]): void {
  const b = g.boat;
  if (!b.aboard) return;
  b.aboard = false;
  b.vx = 0;
  b.fishing = null;
  Object.assign(g.diver, { x: b.x, y: WORLD.surfaceY + 12, vx: 0, vy: 40 });
  events.push({ type: 'dove' });
}

/** The fish that bite here, by the kind of sea. */
export function boatFishAt(x: number): string[] {
  const b = biomeAt(x);
  if (b) return BOAT_FISH[b.id];
  if (x < LAYOUT.island.x0) return BOAT_FISH.baia;
  if (x < OPEN_SEA_X) return BOAT_FISH.delta;
  if (x < east(4020)) return BOAT_FISH.barriera;
  if (x < ICE.xMin) return BOAT_FISH.foresta;
  return x < ENDLESS.startX ? BOAT_FISH.ghiaccio : BOAT_FISH.aperto;
}

function fish(g: BoatWorld, tap: boolean, dt: number, events: GameEvent[]): void {
  const b = g.boat;
  const F = BOAT.fishing;
  if (Math.abs(b.vx) > F.maxSpeed) {
    b.fishing = null; // sailing pulls the line in
    return;
  }
  const f = b.fishing;
  if (!f) {
    if (tap) {
      b.fishing = { t: range(g.rng, F.wait[0], F.wait[1]), bite: false };
      events.push({ type: 'lineCast' });
    }
    return;
  }
  f.t -= dt;
  if (!f.bite) {
    if (tap) {
      b.fishing = null; // pulled in too early
      events.push({ type: 'fishEscaped' });
    } else if (f.t <= 0) {
      f.bite = true;
      f.t = F.window;
      events.push({ type: 'fishBite' });
    }
    return;
  }
  if (tap) {
    const kinds = boatFishAt(b.x);
    const kind = kinds[Math.floor(g.rng() * kinds.length)]!;
    g.gear.bag[kind] = (g.gear.bag[kind] ?? 0) + 1;
    const count = (g.fishCaught[kind] ?? 0) + 1;
    g.fishCaught[kind] = count;
    if (!g.seen.has(kind)) {
      g.seen.add(kind);
      events.push({ type: 'creatureSeen', id: kind });
    }
    events.push({ type: 'fishCaught', fishId: kind, count, healed: false });
    b.fishing = null;
  } else if (f.t <= 0) {
    b.fishing = null;
    events.push({ type: 'fishEscaped' });
  }
}

/**
 * One step of the boat. Returns true while you are aboard (the boat moves you, not your swimming).
 * Also: Aurelio's gift once chapter 1 is over.
 */
export function stepBoat(g: BoatWorld, input: InputState, dt: number, events: GameEvent[]): boolean {
  const b = g.boat;
  if (!b.owned && after(g.story.step, 'chapter1Done')) {
    b.owned = true;
    b.x = BOAT.mooredX;
    events.push({ type: 'boatGiven' });
  }
  if (!b.owned) return false;
  const tap = (input.fireHeld && !b.firePrev) || !!input.shotAt;
  b.firePrev = input.fireHeld;
  if (!b.aboard) return false;
  const d = g.diver;
  b.vx += input.moveX * BOAT.accel * dt;
  b.vx -= b.vx * BOAT.drag * dt;
  b.vx = clamp(b.vx, -BOAT.speed, BOAT.speed);
  // land and icebergs stop it (checked at its bow, just under the surface)
  const nx = b.x + b.vx * dt;
  const bow = nx + Math.sign(b.vx) * (BOAT.length / 2);
  if (b.vx !== 0 && g.map.solidAt(bow, WORLD.surfaceY + 6)) b.vx = 0;
  else b.x = nx;
  if (Math.abs(input.moveX) > 0.2) d.face = input.moveX > 0 ? 1 : -1;
  Object.assign(d, { x: b.x, y: WORLD.surfaceY + 4, vx: b.vx, vy: 0, o2: d.maxO2 });
  fish(g, tap, dt, events);
  return true;
}

/** Where you wake up when you own the boat: next to it (then you climb aboard). */
export const boatWakePoint = (b: BoatState): { x: number; y: number } => ({ x: b.x, y: WORLD.surfaceY + 8 });
