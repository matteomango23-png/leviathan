// Your beast in the water: it arrives from the dark, follows you, defends you from wild beasts,
// and can be ridden. Port of summon/recall/updateComp from prototype/leviatano.html.
import { BEAST_COMBAT, BIG_BEAST_MOTION as M, TEAM_RULES } from '../../data/beasts';
import { DIVER } from '../../data/diver';
import { clamp } from '../math';
import type { TileMap } from '../world/tileMap';
import { headOf, type BodyPose } from './combat';
import { formLengthUnits, formStats } from './forms';
import type { TeamBeast } from './team';
import { isInWater, type WildBeast } from './wild';

export interface Companion extends BodyPose {
  uid: string;
  vx: number;
  vy: number;
  pitchV: number;
  phase: number;
  jaw: number;
  flash: number;
  alpha: number;
  state: 'in' | 'follow' | 'guard' | 'leaving';
  t: number;
  attackCooldown: number;
  target: number | null;
  /** 0 = normal, rises to 1 and back while it turns around (flip animation). */
  turn: number;
  frenzy: number;
  frenzyTick: number;
  /** Seconds of doubled attack speed (buff:attackSpeed). */
  haste: number;
  charge: number;
  chargeHits: number[];
}

const U = DIVER.lengthUnits;

export function summonCompanion(
  b: TeamBeast,
  diver: { x: number; y: number; face: 1 | -1 },
  map: TileMap,
): Companion {
  const length = formLengthUnits(b.form, b.level);
  const r = length * BEAST_COMBAT.collideRadiusFrac;
  let x = diver.x - diver.face * TEAM_RULES.summonDistance;
  let y = diver.y + 10;
  if (map.hitCircle(x, y, r)) {
    x = diver.x + diver.face * TEAM_RULES.summonDistance;
    if (map.hitCircle(x, y, r)) {
      x = diver.x;
      y = diver.y;
    }
  }
  return {
    uid: b.uid,
    x,
    y,
    face: x < diver.x ? 1 : -1,
    pitch: 0,
    length,
    vx: 0,
    vy: 0,
    pitchV: 0,
    phase: 0,
    jaw: 0.5,
    flash: 0,
    alpha: 1,
    state: 'in',
    t: 0,
    attackCooldown: 1,
    target: null,
    turn: 0,
    frenzy: 0,
    frenzyTick: 0,
    haste: 0,
    charge: 0,
    chargeHits: [],
  };
}

export function sendAway(c: Companion, diverX: number): void {
  c.state = 'leaving';
  c.t = TEAM_RULES.leaveSeconds;
  c.face = c.x >= diverX ? 1 : -1;
  c.target = null;
}

function steer(c: Companion, tx: number, ty: number, speed: number, k: number, dt: number): void {
  const dx = tx - c.x;
  const dy = ty - c.y;
  const d = Math.hypot(dx, dy) || 1;
  c.vx += ((dx / d) * speed - c.vx) * Math.min(1, k * dt);
  c.vy += ((dy / d) * speed - c.vy) * Math.min(1, k * dt);
}

/** Turning around is animated (a companion may turn in view, unlike wild beasts). */
function faceTowards(c: Companion, dir: number, dt: number): void {
  const want: 1 | -1 = dir >= 0 ? 1 : -1;
  if (want !== c.face && c.turn === 0) c.turn = 0.001;
  if (c.turn > 0) {
    c.turn += dt / TEAM_RULES.turnSeconds;
    if (c.turn >= 0.5 && c.face !== want) c.face = want;
    if (c.turn >= 1) c.turn = 0;
  }
}

function animate(c: Companion, dt: number): void {
  const wp = clamp(Math.atan2(c.vy, Math.abs(c.vx) + U * 1.5), -M.pitchMax, M.pitchMax);
  const np = c.pitch + (wp - c.pitch) * Math.min(1, dt * M.pitchRate);
  c.pitchV = (np - c.pitch) / Math.max(dt, 1e-3);
  c.pitch = np;
  c.phase +=
    dt * (M.swimPhaseBase + (Math.hypot(c.vx, c.vy) / U) * M.swimPhasePerSpeed + (c.frenzy > 0 ? 5 : 0));
}

/** Nearest wild beast that threatens the diver (angry, attacking, close). */
export function nearestThreat(
  c: Companion,
  diver: { x: number; y: number },
  wilds: WildBeast[],
): WildBeast | null {
  let best: WildBeast | null = null;
  let bd = Infinity;
  for (const w of wilds) {
    if (!isInWater(w) || w.mood === 'tired' || w.mood === 'taming' || w.mood === 'fleeing') continue;
    const hostile = w.mood === 'angry' || w.motion === 'attack' || w.attackPlanned;
    if (!hostile || Math.hypot(w.x - diver.x, w.y - diver.y) > TEAM_RULES.guardRange) continue;
    const d = Math.hypot(w.x - c.x, w.y - c.y);
    if (d < bd) {
      bd = d;
      best = w;
    }
  }
  return best;
}

export interface CompanionContext {
  diver: { x: number; y: number; vx: number; vy: number; face: 1 | -1; dead: boolean };
  riding: boolean;
  wilds: WildBeast[];
  map: TileMap;
  dt: number;
}

/**
 * Moves the companion. Returns the wild beast it reached with its jaws this frame (the caller applies damage).
 */
export function stepCompanion(c: Companion, b: TeamBeast, ctx: CompanionContext): WildBeast | null {
  const { dt, diver, map } = ctx;
  c.flash = Math.max(0, c.flash - dt);
  c.jaw = Math.max(0, c.jaw - dt);
  c.attackCooldown -= c.haste > 0 ? dt * 2 : dt;
  const speed = formStats(b.form, b.level).speed;
  const r = c.length * BEAST_COMBAT.collideRadiusFrac;

  if (c.state === 'leaving') {
    c.t -= dt;
    c.vx += (c.face * speed * 1.3 - c.vx) * 2 * dt;
    c.vy += (-18 - c.vy) * dt;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.alpha = clamp(c.t / (TEAM_RULES.leaveSeconds * 0.75), 0, 1);
    animate(c, dt);
    return null;
  }
  if (ctx.riding) {
    c.x = diver.x;
    c.y = diver.y;
    c.vx = diver.vx;
    c.vy = diver.vy;
    faceTowards(c, diver.face, dt);
    animate(c, dt);
    return null;
  }

  const d = Math.hypot(diver.x - c.x, diver.y - c.y);
  if (c.state === 'in') {
    c.t += dt;
    steer(c, diver.x - diver.face * TEAM_RULES.followDistance, diver.y + 8, speed * 1.4, 3, dt);
    map.moveBody(c, r, dt);
    if (Math.abs(c.vx) > 4) faceTowards(c, c.vx, dt);
    if (d < TEAM_RULES.followDistance * 2 || c.t > 4) c.state = 'follow';
    animate(c, dt);
    return null;
  }

  // too far (stuck behind rock): catch up from the dark
  if (d > 320) {
    c.x = diver.x - diver.face * TEAM_RULES.followDistance;
    c.y = diver.y + 12;
    if (map.hitCircle(c.x, c.y, r)) {
      c.x = diver.x;
      c.y = diver.y;
    }
    c.target = null;
  }

  let reached: WildBeast | null = null;
  if (!diver.dead && c.attackCooldown <= 0 && c.target === null) {
    const t = nearestThreat(c, diver, ctx.wilds);
    if (t) c.target = t.id;
  }
  const target = c.target === null ? undefined : ctx.wilds.find((w) => w.id === c.target);
  if (
    target &&
    isInWater(target) &&
    target.mood !== 'tired' &&
    target.mood !== 'taming' &&
    d < TEAM_RULES.guardRange * 1.3
  ) {
    c.state = 'guard';
    const side = target.x > c.x ? 1 : -1;
    steer(c, target.x - side * target.length * 0.3, target.y, speed * 1.3, 4, dt);
    faceTowards(c, side, dt);
    c.jaw = Math.max(c.jaw, 0.2);
    const h = headOf(c);
    const dist = Math.hypot(h.x - target.x, h.y - target.y);
    if (c.attackCooldown <= 0 && dist < c.length * 0.25 + target.length * 0.3) {
      reached = target;
      c.attackCooldown = TEAM_RULES.biteCooldown;
      c.target = null;
      c.jaw = 0.4;
    }
  } else {
    c.state = 'follow';
    c.target = null;
    const tx = diver.x - diver.face * TEAM_RULES.followDistance;
    const ty = diver.y + 8;
    const dd = Math.hypot(tx - c.x, ty - c.y);
    if (dd > 10) steer(c, tx, ty, Math.min(speed, dd * 1.4), 3, dt);
    else {
      c.vx *= 0.95;
      c.vy *= 0.95;
    }
    if (Math.abs(c.vx) > 6) faceTowards(c, c.vx, dt);
  }
  map.moveBody(c, r, dt);
  animate(c, dt);
  return reached;
}
