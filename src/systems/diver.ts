// The diver: swimming, dash, oxygen, hearts, death and respawn.
// Port of the diver part of update() in prototype/leviatano.html.
import { DIVER } from '../data/diver';
import { SUIT_RULES } from '../data/economy';
import { START, WORLD } from '../data/worldLayout';
import type { GameEvent } from './events';
import type { InputState } from './input';
import { clamp, range, type Rng } from './math';
import type { BodyCircle, TileMap } from './world/tileMap';
import { freshPressure, stepPressure, type AirTank } from './breath';

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
  depthWarn: number;
  /** Too deep for the suit: 1 = safe … 0 = it hurts (breath.ts). */
  pressure: number;
  pressureHurt: number;
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
    depthWarn: 0,
    ...freshPressure(),
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

function respawn(d: DiverState, at: { x: number; y: number }, events: GameEvent[]): void {
  Object.assign(d, createDiver(at.x, at.y), { face: d.face });
  d.invulnerable = DIVER.invulnerableAfterRespawn;
  events.push({ type: 'respawned' });
}

/** Air used: from the whale you ride while it has some, otherwise from your own lungs. */
function spendAir(d: DiverState, air: AirTank | undefined, amount: number): void {
  if (air && air.o2 > 0) air.o2 = Math.max(0, air.o2 - amount);
  else d.o2 = Math.max(0, d.o2 - amount);
}

function updateOxygen(
  d: DiverState,
  map: TileMap,
  dt: number,
  events: GameEvent[],
  drainMult: number,
  air: AirTank | undefined,
  /** Riding: how far above you the beast's back reaches (≤ 0). The surface counts from it: a sperm whale's body kept
   *  its rider just under the band, and its air never came back (owner, 8 ottobre). */
  topOffset = 0,
): void {
  const o = DIVER.oxygen;
  if (d.y + topOffset < map.surfaceY + o.surfaceBand + DIVER.radius) {
    d.o2 = Math.min(d.maxO2, d.o2 + o.surfaceRefill * dt);
    if (air) air.o2 = Math.min(air.max, air.o2 + o.surfaceRefill * (air.max / d.maxO2) * dt);
  } else {
    const depthF = clamp((d.y - map.surfaceY) / (o.fullDepthY - map.surfaceY), 0, 1);
    spendAir(d, air, (o.drainBase + o.drainDepthExtra * depthF) * drainMult * dt);
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

export interface DiverOptions {
  /** Where to wake up after dying (your ship, or your harbour). */
  respawnAt: { x: number; y: number };
  /** Riding a beast: its speed (u/s) replaces the diver's, and the dash is the beast's. */
  mountSpeed?: number;
  mountDash?: { speedMult: number; duration: number; cooldown: number };
  /** Riding with the dash button held: × this pace. */
  mountSprint?: number;
  mountAccelMult?: number;
  /** Suit effects (world.ts SUITS + upgrades). */
  speedMult?: number;
  o2DrainMult?: number;
  canDash?: boolean;
  /** Deepest world y the suit allows; deeper the pressure bar empties (breath.ts). */
  maxDepthY?: number;
  /** Riding: the beast's body against rock (circles along its spine), instead of the diver's own. */
  body?: readonly BodyCircle[];
  /** Riding a whale: you breathe its air while it lasts (breath.ts). */
  air?: AirTank;
}

export function stepDiver(
  d: DiverState,
  input: InputState,
  map: TileMap,
  dt: number,
  rng: Rng,
  events: GameEvent[],
  opt: DiverOptions = { respawnAt: START },
): void {
  d.invulnerable = Math.max(0, d.invulnerable - dt);
  d.dashCooldown = Math.max(0, d.dashCooldown - dt);

  if (d.dead) {
    d.deadTime -= dt;
    d.vx *= 0.9;
    d.vy = -20;
    d.y = Math.max(map.surfaceY + DIVER.radius, d.y + d.vy * dt);
    if (d.deadTime <= 0) respawn(d, opt.respawnAt, events);
    return;
  }
  const mounted = opt.mountSpeed !== undefined;
  const sprint = opt.mountSpeed !== undefined && input.dashHeld ? (opt.mountSprint ?? 1) : 1;
  const maxSpeed =
    opt.mountSpeed !== undefined ? opt.mountSpeed * sprint : DIVER.maxSpeed * (opt.speedMult ?? 1);
  // riding: enough thrust to beat the water drag and reach the beast's top speed quickly
  const accel = mounted ? maxSpeed * (DIVER.drag + (opt.mountAccelMult ?? 1)) : DIVER.accel;

  let ix = input.moveX;
  let iy = input.moveY;
  const m = Math.hypot(ix, iy);
  if (m > 1) {
    ix /= m;
    iy /= m;
  }
  d.vx += ix * accel * dt;
  d.vy += iy * accel * dt;
  if (ix === 0 && iy === 0 && !mounted) d.vy += DIVER.sinkWhenIdle * dt;
  const drag = d.dashTime > 0 ? DIVER.dash.drag : DIVER.drag;
  d.vx -= d.vx * drag * dt;
  d.vy -= d.vy * drag * dt;
  if (d.dashTime <= 0) {
    const s = Math.hypot(d.vx, d.vy);
    if (s > maxSpeed) {
      d.vx *= maxSpeed / s;
      d.vy *= maxSpeed / s;
    }
  }
  if (Math.abs(ix) > 0.2) d.face = ix > 0 ? 1 : -1;
  const wantAim = Math.hypot(ix, iy) > 0.2 ? Math.atan2(iy, ix) : d.face > 0 ? 0 : Math.PI;
  let da = wantAim - d.aim;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  d.aim += da * Math.min(1, dt * DIVER.aimTurnRate);

  if (input.dash && d.dashCooldown <= 0 && (mounted || opt.canDash !== false)) {
    // on foot the diver's own dash; riding, the beast bursts forward (TEAM_RULES.rideDash)
    const md = opt.mountDash;
    const speed = mounted && md ? maxSpeed * md.speedMult : DIVER.dash.speed;
    d.vx = Math.cos(d.aim) * speed;
    d.vy = Math.sin(d.aim) * speed;
    d.dashTime = mounted && md ? md.duration : DIVER.dash.duration;
    d.dashCooldown = mounted && md ? md.cooldown : DIVER.dash.cooldown;
    spendAir(d, opt.air, DIVER.dashAir); // a burst of speed costs breath
    events.push({ type: 'dash', x: d.x, y: d.y });
  }
  d.dashTime = Math.max(0, d.dashTime - dt);

  map.moveBody(d, mounted && opt.body ? opt.body : DIVER.radius, dt);
  if (mounted && d.y < map.surfaceY + DIVER.lengthUnits) d.y = map.surfaceY + DIVER.lengthUnits;
  const drainMult = opt.o2DrainMult ?? 1;
  // holding the sprint while riding costs breath too
  if (mounted && input.dashHeld && Math.hypot(input.moveX, input.moveY) > 0.2)
    spendAir(d, opt.air, DIVER.sprintAirPerSec * dt);
  // too deep for the suit (also on a beast): the pressure bar empties, and empty it hurts until you go up
  const overM = opt.maxDepthY !== undefined ? (d.y - opt.maxDepthY) / WORLD.unitsPerMetre : 0;
  if (overM > 0) {
    d.depthWarn -= dt;
    if (d.depthWarn <= 0) {
      d.depthWarn = SUIT_RULES.warnEvery;
      events.push({ type: 'tooDeep' });
    }
  }
  if (stepPressure(d, overM, dt)) {
    d.invulnerable = 0;
    hurtDiver(d, 1, events);
  }
  const topOffset = opt.body ? Math.min(0, ...opt.body.map((c) => c.dy - c.r)) : 0;
  updateOxygen(d, map, dt, events, drainMult, opt.air, topOffset);

  d.bubbleTime -= dt;
  if (d.bubbleTime <= 0 && d.y > map.surfaceY + 6) {
    d.bubbleTime = range(rng, DIVER.bubbleEvery[0], DIVER.bubbleEvery[1]);
    events.push({ type: 'bubble', x: d.x + d.face * DIVER.lengthUnits * 0.45, y: d.y - 2 });
  }
}
