// Your mount in the water: you call it from the team bar, it swims to you from the dark and you climb on;
// in the saddle you go faster and use its ability. It no longer follows you around or fights in the water
// (battles are turn-based). Climbing down sends it away.
import { BEAST_BODY, ROAM, TEAM_RULES } from '../../data/beasts';
import { DIVER } from '../../data/diver';
import { clamp } from '../math';
import type { TileMap } from '../world/tileMap';
import type { BodyPose } from './combat';
import { formLengthUnits } from './forms';
import type { TeamBeast } from './team';

export interface Mount extends BodyPose {
  uid: string;
  vx: number;
  vy: number;
  pitchV: number;
  phase: number;
  jaw: number;
  flash: number;
  alpha: number;
  /** 'in': swimming to you · 'ride': you are on it · 'leaving': going back into the dark */
  state: 'in' | 'ride' | 'leaving';
  t: number;
  /** 0 = normal, rises to 1 while it turns around (animated from the head). */
  turn: number;
  turnFrom: 1 | -1;
}

const U = DIVER.lengthUnits;

export function callMount(b: TeamBeast, diver: { x: number; y: number; face: 1 | -1 }, map: TileMap): Mount {
  const length = formLengthUnits(b.form, b.level);
  const r = length * BEAST_BODY.collideRadiusFrac;
  let x = diver.x - diver.face * TEAM_RULES.summonDistance;
  let y = diver.y + 10;
  if (map.hitCircle(x, y, r)) ({ x, y } = map.nearestOpen(diver.x, diver.y, r));
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
    jaw: 0.4,
    flash: 0,
    alpha: 1,
    state: 'in',
    t: 0,
    turn: 0,
    turnFrom: 1,
  };
}

export function sendAway(m: Mount, diverX: number): void {
  m.state = 'leaving';
  m.t = TEAM_RULES.leaveSeconds;
  m.face = m.x >= diverX ? 1 : -1;
}

function faceTowards(m: Mount, dir: number, dt: number): void {
  const want: 1 | -1 = dir >= 0 ? 1 : -1;
  if (want !== m.face && m.turn === 0) {
    m.turn = 0.001;
    m.turnFrom = m.face;
  }
  if (m.turn > 0) {
    m.turn += dt / TEAM_RULES.turnSeconds;
    if (m.turn >= 0.5 && m.face !== want) m.face = want;
    if (m.turn >= 1) m.turn = 0;
  }
}

function animate(m: Mount, dt: number): void {
  const wp = clamp(Math.atan2(m.vy, Math.abs(m.vx) + U * 1.5), -ROAM.pitchMax, ROAM.pitchMax);
  const np = m.pitch + (wp - m.pitch) * Math.min(1, dt * ROAM.pitchRate);
  m.pitchV = (np - m.pitch) / Math.max(dt, 1e-3);
  m.pitch = np;
  m.phase += dt * (ROAM.swimPhaseBase + (Math.hypot(m.vx, m.vy) / U) * ROAM.swimPhasePerSpeed);
}

/**
 * Moves the mount. Returns true the moment it reaches you (the caller puts you in the saddle).
 * While you ride it, it simply carries you (your position drives it).
 */
export function stepMount(
  m: Mount,
  diver: { x: number; y: number; vx: number; vy: number; face: 1 | -1 },
  dt: number,
): boolean {
  m.flash = Math.max(0, m.flash - dt);
  m.jaw = Math.max(0, m.jaw - dt);
  if (m.state === 'leaving') {
    m.t -= dt;
    m.vx += (m.face * U * 6 - m.vx) * 2 * dt;
    m.vy += (-18 - m.vy) * dt;
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.alpha = clamp(m.t / (TEAM_RULES.leaveSeconds * 0.75), 0, 1);
    animate(m, dt);
    return false;
  }
  if (m.state === 'ride') {
    Object.assign(m, { x: diver.x, y: diver.y, vx: diver.vx, vy: diver.vy });
    faceTowards(m, diver.face, dt);
    animate(m, dt);
    return false;
  }
  // swimming to you; it gets there in at most TEAM_RULES.arriveSeconds
  m.t += dt;
  const k = clamp(m.t / TEAM_RULES.arriveSeconds, 0, 1);
  const dx = diver.x - m.x;
  const dy = diver.y - m.y;
  m.vx = dx * 3 * (0.4 + k);
  m.vy = dy * 3 * (0.4 + k);
  m.x += m.vx * dt;
  m.y += m.vy * dt;
  faceTowards(m, dx, dt);
  animate(m, dt);
  return Math.hypot(dx, dy) < m.length * 0.15 || k >= 1;
}
