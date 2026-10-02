// How wild beasts swim around you (owner's decision of 1 ottobre 2026): slowly, as shapes in the dark that
// your lamp reveals. They turn around only out of the light (or against a wall). By temperament they come at
// you, ignore you, or slip away slowly — never vanishing at full speed. Touching one starts a battle.
import { BEAST_TEMPER, ROAM, type Temper } from '../../data/beasts';
import { DIVER } from '../../data/diver';
import { clamp, type Rng } from '../math';
import type { TileMap } from '../world/tileMap';
import { distanceToBody } from './combat';
import { uniqueOf } from './forms';
import { bodyRadius, isRare, type WildBeast } from './wildState';

const U = DIVER.lengthUnits;

export interface RoamContext {
  diver: { x: number; y: number; dead: boolean };
  map: TileMap;
  rng: Rng;
  dt: number;
  /** The sardine swarm hides you: nobody comes at you. */
  hidden: boolean;
  /** Length of the beast you ride (0 on foot): much smaller beasts keep away instead of attacking. */
  riderLength?: number;
  /** You are inside your submarine and this beast is not one that rams it: it slips away (submarine.ts). */
  scared?: boolean;
}

/** Rare beasts are always shy (you have to reach them); named ones always come at you. */
export function temperOf(b: WildBeast): Temper {
  if (b.boss) return 'aggressive';
  const legend = uniqueOf(b.form)?.temper;
  if (legend) return legend;
  if (isRare(b)) return 'shy';
  return BEAST_TEMPER[b.form.speciesId]?.temper ?? 'calm';
}

/** A random point of open water in the beast's area (near `near` if given). */
export function wanderPoint(
  b: WildBeast,
  map: TileMap,
  rng: Rng,
  near?: { x: number; y: number },
): { x: number; y: number } {
  const [x0, y0, x1, y1] = b.spawn.area;
  const r = bodyRadius(b) * 2;
  const span = 320;
  const ax = near ? Math.max(x0, near.x - span) : x0;
  const bx = near ? Math.min(x1, near.x + span) : x1;
  return map.randomOpen(rng, ax, Math.max(y0, map.surfaceY + r), bx, y1, r);
}

/** A place in the dark to appear: in its area, at least ROAM.spawnMinDistance from you. */
export function appearPoint(
  b: WildBeast,
  map: TileMap,
  rng: Rng,
  diver: { x: number; y: number },
): { x: number; y: number } | null {
  for (let i = 0; i < 30; i++) {
    const p = wanderPoint(b, map, rng);
    if (Math.hypot(p.x - diver.x, p.y - diver.y) >= ROAM.spawnMinDistance) return p;
  }
  return null;
}

function turnAround(b: WildBeast): void {
  b.turnFrom = b.face;
  b.turn = 0.001;
  b.face = b.face > 0 ? -1 : 1;
}

/** One step. Returns true when the beast touches the diver (a battle starts). */
export function stepRoam(b: WildBeast, ctx: RoamContext): boolean {
  const { dt, map, rng } = ctx;
  const d = ctx.diver;
  b.flash = Math.max(0, b.flash - dt);
  b.jaw = Math.max(0, b.jaw - dt);
  b.calm = Math.max(0, b.calm - dt);
  if (b.motion === 'gone') return false;

  const dist = Math.hypot(d.x - b.x, d.y - b.y);
  const temper = temperOf(b);
  const quiet = d.dead || b.calm > 0 || ctx.hidden;
  // named beasts (a Guardian in its lair, a commander's beast) always know where you are
  const sight = b.boss ? Infinity : ROAM.sightRange * U;
  const lose = b.boss ? Infinity : ROAM.loseRange * U;
  // a small predator does not come at a diver riding something far bigger than itself: it keeps away
  const afraid = !b.boss && (ctx.riderLength ?? 0) * ROAM.fearRatio > b.length;
  if (quiet) b.mood = 'wander';
  else if (b.mood === 'wander' && dist < sight)
    b.mood = temper === 'aggressive' && !afraid ? 'chase' : temper === 'shy' || afraid ? 'flee' : 'wander';
  else if (b.mood === 'chase' && afraid) b.mood = 'flee';
  else if (b.mood !== 'wander' && dist > lose) b.mood = 'wander';
  if (ctx.scared && !b.boss && dist < sight) b.mood = 'flee';

  const spec = BEAST_TEMPER[b.form.speciesId];
  const mult = spec?.speedMult ?? 1;
  const r = bodyRadius(b);
  const top = map.surfaceY + b.length * 0.12;
  let tx: number;
  let ty: number;
  let speed: number;
  if (b.mood === 'chase') {
    [tx, ty, speed] = [d.x, d.y, ROAM.chaseSpeed * U * mult];
    b.jaw = Math.max(b.jaw, dist < ROAM.sightRange * U * 0.4 ? 0.2 : 0);
  } else if (b.mood === 'flee') {
    const k = (ROAM.loseRange * U) / Math.max(1, dist);
    [tx, ty, speed] = [b.x + (b.x - d.x) * k, b.y + (b.y - d.y) * k * 0.5, ROAM.shySpeed * U * mult];
  } else {
    if (!b.target || Math.hypot(b.target.x - b.x, b.target.y - b.y) < ROAM.targetReach)
      b.target = wanderPoint(b, map, rng, b);
    [tx, ty, speed] = [b.target.x, b.target.y, ROAM.cruiseSpeed * U * mult];
  }
  // stay in its own waters; a hunter follows you a little way out of them, then gives up and goes back
  const [x0, y0, x1, y1] = b.spawn.area;
  const leash = b.mood === 'chase' ? ROAM.chaseLeash : 0;
  const outside = Math.max(x0 - b.x, b.x - x1, y0 - b.y, b.y - y1, 0);
  if (b.mood === 'chase' && outside > ROAM.chaseLeash) {
    b.mood = 'wander'; // it gives up and swims home, leaving you alone meanwhile
    b.calm = ROAM.homeSeconds;
  }
  tx = clamp(tx, x0 - leash, x1 + leash);
  ty = clamp(ty, Math.max(y0 - leash, top), y1 + leash);
  if ((spec?.surface || uniqueOf(b.form)?.surface) && b.mood !== 'chase') ty = top;

  // turn around only out of the light (a visible turn is allowed against a wall)
  const want = Math.sign(tx - b.x) || b.face;
  const lit = !d.dead && dist < ROAM.litRadius;
  if (want !== b.face && b.turn === 0 && !lit && Math.abs(tx - b.x) > b.length * 0.3) turnAround(b);

  const len = Math.hypot(tx - b.x, ty - b.y) || 1;
  const wantVx = b.face * Math.abs(((tx - b.x) / len) * speed) || b.face * speed * 0.3;
  const wantVy = ((ty - b.y) / len) * speed;
  const k = Math.min(1, dt * ROAM.steer);
  b.vx += (wantVx - b.vx) * k;
  b.vy += (wantVy - b.vy) * k;
  const before = b.vx;
  const blocked = map.moveBody(b, r, dt);
  if (blocked && b.turn === 0 && Math.sign(before) === b.face && Math.abs(b.vx) < Math.abs(before) * 0.5) {
    turnAround(b);
    b.target = null;
  }

  if (b.turn > 0) {
    b.turn += dt / ROAM.turnSeconds;
    if (b.turn >= 1) b.turn = 0;
  }
  const wp = clamp(Math.atan2(b.vy, Math.abs(b.vx) + U * 1.5), -ROAM.pitchMax, ROAM.pitchMax);
  const np = b.pitch + (wp - b.pitch) * Math.min(1, dt * ROAM.pitchRate);
  b.pitchV = (np - b.pitch) / Math.max(dt, 1e-3);
  b.pitch = np;
  b.phase += dt * (ROAM.swimPhaseBase + (Math.hypot(b.vx, b.vy) / U) * ROAM.swimPhasePerSpeed);

  return !quiet && distanceToBody(b, d.x, d.y) < b.length * ROAM.contactFrac + DIVER.radius;
}
