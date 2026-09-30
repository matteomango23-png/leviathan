// How beasts move inside a Guardian's lair. The cave is closed and fits on screen, so here a visible turn
// is always against a wall (allowed by CLAUDE.md). The Guardian circles the cave at the diver's depth and
// lunges with open jaws first; in phase 2 it bites in bursts and swipes with its tail at a diver behind it.
// Its escort uses the same moves without bursts or tail. A fleeing beast swims out through the shaft.
import {
  BEAST_COMBAT,
  BIG_BEAST_MOTION as M,
  STATUS_RULES,
  TAMING_FLOW,
  TEAM_RULES,
} from '../../data/beasts';
import { DIVER } from '../../data/diver';
import { WEAPON_RULES } from '../../data/economy';
import { GUARDIAN_FIGHT as F, LAIR } from '../../data/guardians';
import type { GameEvent } from '../events';
import { clamp, range, type Rng } from '../math';
import { inLairCave, lairRoofY } from '../world/lair';
import type { TileMap } from '../world/tileMap';
import { headOf, inBiteReach } from './combat';
import type { WildBeast } from './wildState';
import { updateMood } from './wildStatus';

const U = DIVER.lengthUnits;

/** What each arena beast remembers between frames. */
export interface ArenaAi {
  attackT: number; // seconds before it may attack again
  burst: number; // bites left in a burst
  tailT: number; // seconds before the next tail swipe
  fleeT: number; // seconds left to swim out when fleeing
}

export const newArenaAi = (): ArenaAi => ({ attackT: 1.5, burst: 0, tailT: 0, fleeT: F.fleeSeconds });

export interface ArenaContext {
  diver: { x: number; y: number; dead: boolean };
  map: TileMap;
  rng: Rng;
  dt: number;
  /** 1, or 2 for the Guardian below GUARDIAN_FIGHT.phase2HpFraction. */
  phase: 1 | 2;
}

function turnAround(w: WildBeast): void {
  w.turnFrom = w.face;
  w.turn = 0.001;
  w.face = w.face > 0 ? -1 : 1;
  w.vx = w.face * Math.abs(w.vx) * 0.3;
}

/** Attack, burst and tail swipe. Returns the speed it wants and the depth it aims for. */
function fight(w: WildBeast, ai: ArenaAi, ctx: ArenaContext, events: GameEvent[]): [number, number] {
  const d = ctx.diver;
  const boss = !!w.guardian;
  const head = headOf(w);
  const ahead = (d.x - head.x) * w.face;
  let want = F.cruiseSpeed * U;
  const ty = d.y;
  if (w.motion !== 'attack' && ai.attackT <= 0 && w.stun <= 0 && !d.dead) {
    if (ahead > 0 && ahead < F.attackRange * U && Math.abs(d.y - w.y) < LAIR.ry) {
      w.motion = 'attack';
      w.telegraph = F.telegraph[ctx.phase - 1]!;
      w.jaw = w.telegraph + 0.3;
      w.bit = false;
      if (boss && ctx.phase === 2 && ai.burst <= 0) ai.burst = F.burstBites;
    }
  }
  if (w.motion === 'attack') {
    if (w.telegraph > 0) {
      w.telegraph -= ctx.dt;
      want *= 0.5;
    } else {
      w.jaw = Math.max(w.jaw, 0.2);
      want = F.attackSpeed * U;
    }
    const passed = ahead < -w.length * 0.1;
    if (w.telegraph <= 0 && !w.bit && !d.dead && inBiteReach(w, d.x, d.y)) {
      w.bit = true;
      w.jaw = 0.45;
      events.push({ type: 'wildBite', id: w.id });
    }
    if (w.bit || passed || d.dead) {
      w.motion = 'cruise';
      ai.burst = Math.max(0, ai.burst - 1);
      if (ai.burst > 0 && !passed) ai.attackT = 0.25;
      else {
        ai.burst = 0;
        ai.attackT = range(ctx.rng, F.attackPause[0], F.attackPause[1]);
      }
    }
  }
  if (boss && ctx.phase === 2 && ai.tailT <= 0 && !d.dead && w.stun <= 0) {
    const tail = headOf(w, -0.45);
    if (Math.hypot(d.x - tail.x, d.y - tail.y) < w.length * F.tailReachFrac) {
      ai.tailT = F.tailCooldown;
      w.phase += 2.5; // a visible flick of the tail
      events.push({ type: 'tailSwipe', id: w.id, dir: w.face > 0 ? -1 : 1 });
    }
  }
  return [want, ty];
}

export function stepArenaBeast(w: WildBeast, ai: ArenaAi, ctx: ArenaContext, events: GameEvent[]): void {
  const { dt, map } = ctx;
  w.flash = Math.max(0, w.flash - dt);
  w.jaw = Math.max(0, w.jaw - dt);
  w.barTime = Math.max(0, w.barTime - dt);
  w.stun = Math.max(0, w.stun - dt);
  w.slow = Math.max(0, w.slow - dt);
  ai.attackT -= dt;
  ai.tailT -= dt;
  if (w.motion === 'gone' || w.mood === 'taming') return;
  updateMood(w, dt, events);
  if (w.mood === 'angry') w.angryTime = Math.max(w.angryTime, 1); // stays angry for the whole fight

  let want: number;
  let ty: number;
  let tx: number | null = null;
  if (w.mood === 'fleeing') {
    // out through the shaft, then gone
    ai.fleeT -= dt;
    want = M.boltSpeed * U * 0.6;
    tx = (LAIR.shaft.x0 + LAIR.shaft.x1) / 2;
    ty = LAIR.shaft.yTop - 40;
    if (ai.fleeT <= 0 || w.y < lairRoofY() - 10) {
      w.motion = 'gone';
      return;
    }
  } else if (w.mood === 'tired') {
    want = TAMING_FLOW.tiredSpeed * U;
    ty = w.y;
  } else [want, ty] = fight(w, ai, ctx, events);

  const r = w.length * BEAST_COMBAT.collideRadiusFrac;
  if (tx === null) {
    ty = clamp(ty, LAIR.y - LAIR.ry + r * 3, LAIR.y + LAIR.ry - r * 3);
    // the cave wall ahead: turn around (a visible turn against a wall is allowed)
    const nose = w.x + w.face * (w.length * 0.5 + 6);
    if (w.turn === 0 && !inLairCave(nose, w.y, r * 2)) {
      if (w.motion === 'attack') w.motion = 'cruise';
      turnAround(w);
    }
  } else if (Math.sign(tx - w.x) !== w.face && Math.abs(tx - w.x) > w.length * 0.3 && w.turn === 0)
    turnAround(w);
  if (w.stun > 0) want *= STATUS_RULES.stunSlowdown;
  else if (w.slow > 0) want *= WEAPON_RULES.rete.slowMult;

  const steerX = tx === null ? w.face * want : clamp((tx - w.x) * 2, -want, want);
  w.vx += (steerX - w.vx) * Math.min(1, dt * M.steerX);
  const ky = w.motion === 'attack' && w.telegraph <= 0 ? 4 : tx !== null ? 3 : M.steerY;
  w.vy += ((ty - w.y) * 0.8 - w.vy) * Math.min(1, dt * ky);
  map.moveBody(w, r, dt);

  if (w.turn > 0) {
    w.turn += dt / TEAM_RULES.turnSeconds;
    if (w.turn >= 1) w.turn = 0;
  }
  const wp = clamp(Math.atan2(w.vy, Math.abs(w.vx) + U * 1.5), -M.pitchMax, M.pitchMax);
  const np = w.pitch + (wp - w.pitch) * Math.min(1, dt * M.pitchRate);
  w.pitchV = (np - w.pitch) / Math.max(dt, 1e-3);
  w.pitch = np;
  const speed = Math.hypot(w.vx, w.vy);
  w.phase += dt * (M.swimPhaseBase + (speed / U) * M.swimPhasePerSpeed + (w.motion === 'attack' ? 4 : 0));
}
