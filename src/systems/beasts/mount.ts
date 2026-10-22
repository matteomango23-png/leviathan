// Your beast in the water: you call it from the team bar and it swims to you from the dark. A mount (or a
// second stage that can carry you) takes you in the saddle: you go faster and use its ability. Any other
// beast follows you around and eats the small fish it meets. It never fights in the water (battles are
// turn-based). Climbing down, or a second tap, sends it away. It comes in from just off the screen and swims
// off it again, never appearing or fading out of nothing (owner, 22 ottobre 2026), and it slows as it reaches you
// so that climbing on is smooth.
import { BEAST_BODY, PACK, ROAM, TEAM_RULES } from '../../data/beasts';
import { DIVER } from '../../data/diver';
import { clamp } from '../math';
import type { TileMap } from '../world/tileMap';
import { bodyCircles, type BodyPose } from './combat';
import { formLengthUnits, shapeOfForm } from './forms';
import { riderForwardOf } from './mountTraits';
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
  /** 'in': swimming to you · 'ride': you are on it · 'follow': swimming with you · 'leaving': going away */
  state: 'in' | 'ride' | 'follow' | 'leaving';
  /** You climb on when it reaches you (otherwise it follows you). */
  rider: boolean;
  t: number;
  /** 0 = normal; 0..1 while it turns around (sideways, like the wild beasts: the head first, then the body). */
  turn: number;
  /** The way it faced before the turn. */
  turnFrom: 1 | -1;
  /** Swimming with you: your way of travel, smoothed over a few seconds (it follows where you go, not your face). */
  travel: number;
  /** The side of you it keeps while you stay put. */
  side: 1 | -1;
  /** In the pack (systems/pack.ts): its place round you (0 or 1), the fish it goes for, seconds to its next bite. */
  slot?: number;
  target?: { x: number; y: number } | null;
  feed?: number;
  /** Where you sit along it (× its length, mountTraits.ts riderForwardOf). */
  seatForward?: number;
  /** Climbing on: where you were from your seat (units), and the seconds left to close it (seat.ts seatLag). */
  seatFrom?: { x: number; y: number };
  seatT?: number;
}

/** What the camera shows (world units): beasts come in and go out at its edges. */
interface View {
  x: number;
  y: number;
  width: number;
  height: number;
}

const U = DIVER.lengthUnits;

export function callMount(
  b: TeamBeast,
  diver: { x: number; y: number; face: 1 | -1 },
  map: TileMap,
  rider = true,
  view: View | null = null,
): Mount {
  const length = formLengthUnits(b.form, b.level);
  const r = length * BEAST_BODY.collideRadiusFrac;
  // from just off the screen behind you, at your depth (without a view, as far as summonDistance)
  const edge = view
    ? Math.max(
        Math.abs((diver.face > 0 ? view.x : view.x + view.width) - diver.x) + length * 0.6,
        TEAM_RULES.summonDistance,
      )
    : TEAM_RULES.summonDistance;
  let x = diver.x - diver.face * edge;
  let y = Math.max(map.surfaceY + r + 4, diver.y + 10);
  if (map.hitCircle(x, y, r)) ({ x, y } = map.nearestOpen(x, y, r, true));
  return {
    uid: b.uid,
    shape: shapeOfForm(b.form),
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
    rider,
    t: 0,
    turn: 0,
    turnFrom: 1,
    travel: 0,
    side: x < diver.x ? -1 : 1,
    seatForward: riderForwardOf(b.form),
  };
}

/** It swims off the screen; `keepFace`: on its way (you climbed down), else away from you. */
export function sendAway(m: Mount, diverX: number, keepFace = false): void {
  m.state = 'leaving';
  m.t = TEAM_RULES.leaveSeconds * TEAM_RULES.leaveFallback;
  if (!keepFace) m.face = m.x >= diverX ? 1 : -1;
}

/** Gone: swum off the screen (or, kept in sight too long, faded out). */
export const leftView = (m: Mount, view: View | null): boolean =>
  m.state === 'leaving' &&
  (m.t <= 0 ||
    (!!view &&
      (m.x < view.x - m.length * 0.6 ||
        m.x > view.x + view.width + m.length * 0.6 ||
        m.y > view.y + view.height + m.length * 0.6)));

/**
 * Turning around sideways, like the wild beasts: the head turns first and the body follows, staying level
 * (owner, 3 ottobre 2026: the loop through the vertical looked like a full roll, head up or down).
 */
function faceTowards(m: Mount, dir: number, dt: number): void {
  const want: 1 | -1 = dir >= 0 ? 1 : -1;
  if (want !== m.face && m.turn === 0) {
    m.turnFrom = m.face;
    m.face = want;
    m.turn = 0.001;
  }
  if (m.turn > 0) {
    m.turn += dt / TEAM_RULES.turnSeconds;
    if (m.turn >= 1) m.turn = 0;
  }
}

function animate(m: Mount, dt: number): void {
  const P = TEAM_RULES.pitchMax;
  let wp = clamp(Math.atan2(m.vy, Math.abs(m.vx) + U * 0.4), -P, P);
  if (m.turn > 0) wp *= 0.3; // level while it turns
  const np = m.pitch + (wp - m.pitch) * Math.min(1, dt * ROAM.pitchRate);
  m.pitchV = m.turn > 0 ? 0 : (np - m.pitch) / Math.max(dt, 1e-3);
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
  map?: TileMap,
  /** Following you: this much farther out (units), clear of the beast you ride (systems/pack.ts). */
  around = 0,
): boolean {
  m.flash = Math.max(0, m.flash - dt);
  m.jaw = Math.max(0, m.jaw - dt);
  if (m.state === 'leaving') {
    // on its way and faster and faster, off the screen; only kept in sight too long does it fade (leftView)
    m.t -= dt;
    m.vx += (m.face * U * TEAM_RULES.leaveSpeed - m.vx) * Math.min(1, 1.5 * dt);
    m.vy -= m.vy * Math.min(1, dt);
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.alpha = clamp(m.t / (TEAM_RULES.leaveSeconds * 0.75), 0, 1);
    animate(m, dt);
    return false;
  }
  if (m.state === 'ride') {
    m.seatT = Math.max(0, (m.seatT ?? 0) - dt);
    Object.assign(m, { x: diver.x, y: diver.y, vx: diver.vx, vy: diver.vy });
    faceTowards(m, diver.face, dt);
    animate(m, dt);
    return false;
  }
  if (m.state === 'follow') {
    // like a real dolphin swimming with you (owner, 4 ottobre): it follows the way you travel, smoothed over a few
    // seconds, not the way you face; while you stay put it idles around you on its own side, and it turns only
    // when it really swims the other way, so turning on the spot does not make it flip back and forth
    const f = TEAM_RULES.follow;
    m.travel += (diver.vx - m.travel) * Math.min(1, dt / f.travelSeconds);
    const travelling = Math.abs(m.travel) > U * f.travelMin;
    if (travelling) m.side = m.travel > 0 ? -1 : 1; // behind you, the way you go
    m.t += dt;
    const reach = m.length * f.behind + f.gap + around;
    // in the pack the second one keeps the other side, a little lower (PACK.slotBelow); hunting, it goes for its fish
    const slot = m.slot ?? 0;
    const side = slot === 1 ? -m.side : m.side;
    const tx =
      m.target?.x ??
      diver.x + side * reach * (travelling ? 1 : 0.8) + Math.sin(m.t * 0.3) * m.length * f.wander;
    const ty =
      m.target?.y ??
      diver.y +
        f.below +
        slot * m.length * PACK.slotBelow +
        Math.sin(m.t * 0.45 + 1) * m.length * f.wander * 0.6;
    const k = Math.min(1, dt * f.speed);
    m.vx += ((tx - m.x) * f.speed - m.vx) * k;
    m.vy += ((ty - m.y) * f.speed - m.vy) * k;
    // it swims around rock with its whole body; left far behind, it catches up the straight way
    if (map && Math.hypot(tx - m.x, ty - m.y) < m.length * TEAM_RULES.followFreeAfter)
      map.moveBody(m, bodyCircles(m), dt);
    else {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
    }
    if (Math.abs(m.vx) > U * f.turnSpeed) faceTowards(m, m.vx, dt);
    else faceTowards(m, m.face, dt);
    animate(m, dt);
    return false;
  }
  // swimming to you, fast from afar and slowing as it comes, to where its back will be under you (a companion: to
  // you), so you climb on at your own pace; it gets there in at most TEAM_RULES.arriveSeconds
  m.t += dt;
  const A = TEAM_RULES.arrive;
  const face = diver.face;
  const tx = m.rider ? diver.x - face * (m.seatForward ?? TEAM_RULES.riderOffset[0]) * m.length : diver.x;
  const ty = m.rider ? diver.y - TEAM_RULES.riderOffset[1] * m.length : diver.y;
  const dx = tx - m.x;
  const dy = ty - m.y;
  const d = Math.hypot(dx, dy) || 1;
  const want = Math.min(U * A.speed, d * A.slowing);
  const k = Math.min(1, dt * A.steer);
  m.vx += (diver.vx + (dx / d) * want - m.vx) * k;
  m.vy += (diver.vy + (dy / d) * want - m.vy) * k;
  m.x += m.vx * dt;
  m.y += m.vy * dt;
  // far off it faces the way it swims; close by, your way (you climb on facing forward)
  faceTowards(m, d < m.length ? face : dx, dt);
  animate(m, dt);
  const slowEnough = Math.hypot(m.vx - diver.vx, m.vy - diver.vy) < U * A.reachSpeed;
  // a companion joins you once near: then it swims round you (state follow)
  if (!m.rider) return d < m.length * A.joinReach || m.t >= TEAM_RULES.arriveSeconds;
  return (d < Math.max(m.length * A.reach, 3) && slowEnough) || m.t >= TEAM_RULES.arriveSeconds;
}
