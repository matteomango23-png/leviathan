// The diver: swimming, dash, oxygen, hearts, death and respawn.
// Port of the diver part of update() in prototype/leviatano.html.
import { DIVER } from '../data/diver';
import { START } from '../data/worldLayout';
import type { GameEvent } from './events';
import type { InputState } from './input';
import { clamp, range, type Rng } from './math';
import type { TileMap } from './world/tileMap';

export interface DiverState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  face: 1 | -1;
  aim: number;
  hp: number;
  maxHp: number;
  o2: number;
  maxO2: number;
  invulnerable: number;
  dashTime: number;
  dashCooldown: number;
  dead: boolean;
  deadTime: number;
  chokeTime: number;
  bubbleTime: number;
  oxygenWarned: boolean;
}

export function createDiver(x = START.x, y = START.y): DiverState {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    face: 1,
    aim: 0,
    hp: DIVER.maxHp,
    maxHp: DIVER.maxHp,
    o2: DIVER.maxO2,
    maxO2: DIVER.maxO2,
    invulnerable: 0,
    dashTime: 0,
    dashCooldown: 0,
    dead: false,
    deadTime: 0,
    chokeTime: 0,
    bubbleTime: 0,
    oxygenWarned: false,
  };
}

/** Loses one heart (with a short invulnerability). */
export function hurtDiver(d: DiverState, amount: number, events: GameEvent[]): void {
  if (d.invulnerable > 0 || d.dead) return;
  d.hp = Math.max(0, d.hp - amount);
  d.invulnerable = DIVER.invulnerableAfterHit;
  events.push({ type: 'hurt' });
  if (d.hp <= 0) {
    d.dead = true;
    d.deadTime = DIVER.respawnDelay;
    events.push({ type: 'died' });
  }
}

function respawn(d: DiverState, events: GameEvent[]): void {
  Object.assign(d, createDiver(), { face: d.face });
  d.invulnerable = 1.5;
  events.push({ type: 'respawned' });
}

function updateOxygen(d: DiverState, map: TileMap, dt: number, events: GameEvent[]): void {
  const o = DIVER.oxygen;
  if (d.y < map.surfaceY + o.surfaceBand + DIVER.radius) {
    d.o2 = Math.min(d.maxO2, d.o2 + o.surfaceRefill * dt);
  } else {
    const depthF = clamp((d.y - map.surfaceY) / (o.fullDepthY - map.surfaceY), 0, 1);
    d.o2 = Math.max(0, d.o2 - (o.drainBase + o.drainDepthExtra * depthF) * dt);
  }
  if (d.o2 <= 0) {
    d.chokeTime -= dt;
    if (d.chokeTime <= 0) {
      d.chokeTime = o.chokeInterval;
      d.invulnerable = 0;
      hurtDiver(d, 1, events);
    }
  }
  if (d.o2 < d.maxO2 * o.lowFraction && !d.oxygenWarned) {
    d.oxygenWarned = true;
    events.push({ type: 'oxygenLow' });
  }
  if (d.o2 > d.maxO2 * 0.5) d.oxygenWarned = false;
}

export function stepDiver(
  d: DiverState,
  input: InputState,
  map: TileMap,
  dt: number,
  rng: Rng,
  events: GameEvent[],
): void {
  d.invulnerable = Math.max(0, d.invulnerable - dt);
  d.dashCooldown = Math.max(0, d.dashCooldown - dt);

  if (d.dead) {
    d.deadTime -= dt;
    d.vx *= 0.9;
    d.vy = -20;
    d.y = Math.max(map.surfaceY + DIVER.radius, d.y + d.vy * dt);
    if (d.deadTime <= 0) respawn(d, events);
    return;
  }

  let ix = input.moveX;
  let iy = input.moveY;
  const m = Math.hypot(ix, iy);
  if (m > 1) {
    ix /= m;
    iy /= m;
  }
  d.vx += ix * DIVER.accel * dt;
  d.vy += iy * DIVER.accel * dt;
  if (ix === 0 && iy === 0) d.vy += DIVER.sinkWhenIdle * dt;
  const drag = d.dashTime > 0 ? DIVER.dash.drag : DIVER.drag;
  d.vx -= d.vx * drag * dt;
  d.vy -= d.vy * drag * dt;
  if (d.dashTime <= 0) {
    const s = Math.hypot(d.vx, d.vy);
    if (s > DIVER.maxSpeed) {
      d.vx *= DIVER.maxSpeed / s;
      d.vy *= DIVER.maxSpeed / s;
    }
  }
  if (Math.abs(ix) > 0.2) d.face = ix > 0 ? 1 : -1;
  const wantAim = Math.hypot(ix, iy) > 0.2 ? Math.atan2(iy, ix) : d.face > 0 ? 0 : Math.PI;
  let da = wantAim - d.aim;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  d.aim += da * Math.min(1, dt * DIVER.aimTurnRate);

  if (input.dash && d.dashCooldown <= 0) {
    d.vx = Math.cos(d.aim) * DIVER.dash.speed;
    d.vy = Math.sin(d.aim) * DIVER.dash.speed;
    d.dashTime = DIVER.dash.duration;
    d.dashCooldown = DIVER.dash.cooldown;
    events.push({ type: 'dash', x: d.x, y: d.y });
  }
  d.dashTime = Math.max(0, d.dashTime - dt);

  map.moveBody(d, DIVER.radius, dt);
  updateOxygen(d, map, dt, events);

  d.bubbleTime -= dt;
  if (d.bubbleTime <= 0 && d.y > map.surfaceY + 6) {
    d.bubbleTime = range(rng, DIVER.bubbleEvery[0], DIVER.bubbleEvery[1]);
    events.push({ type: 'bubble', x: d.x + d.face * DIVER.lengthUnits * 0.45, y: d.y - 2 });
  }
}
