// The diver: swimming, dash, oxygen, hearts, death and respawn.
// Port of the diver part of update() in prototype/leviatano.html.
import { DIVER } from '../data/diver';
import { RIDE_MOTION, TEAM_RULES } from '../data/beasts';
import { SUIT_RULES } from '../data/economy';
import { START, WORLD } from '../data/worldLayout';
import type { GameEvent } from './events';
import type { InputState } from './input';
import { clamp, range, type Rng } from './math';
import type { BodyCircle, TileMap } from './world/tileMap';
import { freshPressure, stepPressure, type AirTank } from './breath';
import { leaveWater, stepAirborne, surfaceWater, upPushShare } from './breach';
import { floating, floatPushShare, floatWater, keepInWater } from './floatSurface';
import { rideProfile, startMountDash, swimMount, type RideProfile } from './rideMotion';

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
  /** Riding, out of the water on a leap (breach.ts; not saved). */
  airborne?: boolean;
  /** Riding: seconds since the beast's dash began (rideMotion.ts; not saved). */
  rideDashT?: number;
  /** Seconds the diver keeps facing his last shot, swimming backwards meanwhile (not saved; owner, 19 ottobre:
   *  shooting behind him he flipped back and forth). */
  faceHold?: number;
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
/** What a blow touches. */
type Hurtable = Pick<DiverState, 'hp' | 'invulnerable' | 'dead' | 'deadTime'>;

export function hurtDiver(d: Hurtable, amount: number, events: GameEvent[]): void {
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

/**
 * Out of air, or the hull flooded, inside a vehicle (owner, 24 ottobre 2026: it no longer rises by itself, it could
 * come up under something): a heart every `every` seconds (the diver's own blink timer counts them: it does not run
 * aboard). True when it killed you: the caller lets you out.
 */
export function chokeAboard(d: Hurtable, every: number, dt: number, events: GameEvent[]): boolean {
  if (d.dead) return true;
  d.invulnerable -= dt;
  if (d.invulnerable > 0) return false;
  d.invulnerable = 0;
  hurtDiver(d, 1, events);
  d.invulnerable = every;
  return d.dead;
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
  waterLine = map.surfaceY,
): void {
  const o = DIVER.oxygen;
  if (d.y + topOffset < waterLine + o.surfaceBand + DIVER.radius) {
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

interface DiverOptions {
  /** Where to wake up after dying (your ship, or your harbour). */
  respawnAt: { x: number; y: number };
  /** Riding a beast: its speed (u/s) replaces the diver's, and the dash is the beast's. */
  mountSpeed?: number;
  /** Riding: how it swims (rideMotion.ts), whether it can dash now, worn out (stamina.ts). */
  ride?: { profile: RideProfile; canDash: boolean; worn: boolean };
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
  /** The water's line over you now, with its waves (sea.ts seaHeight); the flat resting line if not given. */
  waterLine?: number;
}

/** A beast of middling size and speed, when none is given (tests). */
const DEFAULT_RIDE = rideProfile(6, 1);

/** The diver swimming on his own: thrust, the water's drag, his top speed (his dash goes beyond it a moment). */
function swimSelf(d: DiverState, ix: number, iy: number, maxSpeed: number, line: number, dt: number): void {
  // the dash: a push along his aim that builds up, not a jump to full speed
  if (d.dashTime > 0) {
    d.vx += Math.cos(d.aim) * DIVER.dash.accel * dt;
    d.vy += Math.sin(d.aim) * DIVER.dash.accel * dt;
  }
  d.vx += ix * DIVER.accel * dt;
  // near the surface his push up fades as he comes up to float (floatSurface.ts)
  d.vy += iy * DIVER.accel * dt * (iy < 0 ? floatPushShare(d, line) : 1);
  if (ix === 0 && iy === 0 && !floating(d, line)) d.vy += DIVER.sinkWhenIdle * dt;
  const drag = d.dashTime > 0 ? DIVER.dash.drag : DIVER.drag;
  d.vx -= d.vx * drag * dt;
  d.vy -= d.vy * drag * dt;
  // over his pace: during the dash up to its top speed; after it he eases back to his pace
  const s = Math.hypot(d.vx, d.vy);
  const cap = d.dashTime > 0 ? DIVER.dash.speed : Math.max(maxSpeed, s * (1 - DIVER.dash.settle * dt));
  if (s > cap) {
    d.vx *= cap / s;
    d.vy *= cap / s;
  }
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
  const line = opt.waterLine ?? map.surfaceY;

  if (d.dead) {
    d.deadTime -= dt;
    d.vx *= 0.9;
    d.vy = -20;
    d.y = Math.max(line + DIVER.radius, d.y + d.vy * dt);
    if (d.deadTime <= 0) respawn(d, opt.respawnAt, events);
    return;
  }
  const mounted = opt.mountSpeed !== undefined;
  // leaping out of the water on the beast: no steering in the air (breach.ts)
  if (!mounted) d.airborne = false;
  else if (d.airborne) {
    // against rock with its whole body: never into an iceberg or an islet (21 ottobre)
    stepAirborne(d, line, dt, events, (t) => map.moveBody(d, opt.body ?? DIVER.radius, t, false));
    return;
  }
  const maxSpeed = DIVER.maxSpeed * (opt.speedMult ?? 1);
  // riding: the beast's own pace, faster with the dash button held, slower worn out (rideMotion.ts, stamina.ts)
  const ride = mounted ? (opt.ride ?? { profile: DEFAULT_RIDE, canDash: true, worn: false }) : null;
  const rideSpeed =
    (opt.mountSpeed ?? 0) *
    (ride?.worn ? RIDE_MOTION.stamina.exhaustedShare : input.dashHeld ? TEAM_RULES.rideSprintMult : 1);

  let ix = input.moveX;
  let iy = input.moveY;
  const m = Math.hypot(ix, iy);
  if (m > 1) {
    ix /= m;
    iy /= m;
  }
  if (ride) swimMount(d, ix, iy, { speed: rideSpeed, profile: ride.profile }, upPushShare(d.y, line), dt);
  else swimSelf(d, ix, iy, maxSpeed, line, dt);
  if (d.faceHold && d.faceHold > 0) d.faceHold = Math.max(0, d.faceHold - dt);
  else if (Math.abs(ix) > 0.2) d.face = ix > 0 ? 1 : -1;
  const wantAim = Math.hypot(ix, iy) > 0.2 ? Math.atan2(iy, ix) : d.face > 0 ? 0 : Math.PI;
  let da = wantAim - d.aim;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  d.aim += da * Math.min(1, dt * DIVER.aimTurnRate);

  if (input.dash && d.dashCooldown <= 0 && (ride ? ride.canDash : opt.canDash !== false)) {
    // riding, the beast's own push beyond its pace (rideMotion.ts); on foot the diver's own dash
    if (ride) {
      startMountDash(d);
      d.dashCooldown = ride.profile.cooldown;
    } else {
      d.dashTime = DIVER.dash.duration; // swimSelf pushes him along (owner, 21 ottobre: gradual)
      d.dashCooldown = DIVER.dash.cooldown;
    }
    spendAir(d, opt.air, DIVER.dashAir); // a burst of speed costs breath
    events.push({ type: 'dash', x: d.x, y: d.y });
  }
  d.dashTime = Math.max(0, d.dashTime - dt);

  if (mounted) surfaceWater(d, line, dt);
  else floatWater(d, line, iy > 0.2, dt);
  map.moveBody(d, mounted && opt.body ? opt.body : DIVER.radius, dt, false);
  // the surface like real water: riding, out of the water with enough speed (19 ottobre); swimming, never out of it
  if (ride) leaveWater(d, line, events, ride.profile.leap);
  else keepInWater(d, line);
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
  updateOxygen(d, map, dt, events, drainMult, opt.air, topOffset, line);

  d.bubbleTime -= dt;
  if (d.bubbleTime <= 0 && d.y > line + 6) {
    d.bubbleTime = range(rng, DIVER.bubbleEvery[0], DIVER.bubbleEvery[1]);
    events.push({ type: 'bubble', x: d.x + d.face * DIVER.lengthUnits * 0.45, y: d.y - 2 });
  }
}
