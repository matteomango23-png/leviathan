// A hunter roused by your weapon or your mount's bite stalks you (owner, 22 ottobre 2026: "deve fare paura… come
// faccio a schivarlo?"): it makes off into the dark out of the picture, waits there in silence and turns, then a
// warning (a red arrow on the edge it will come from, a low toll) and it charges straight at where you were, faster
// than you swim but slower than your dash, jaws open, steering only a little: a dash sideways at the last moment
// dodges it. It goes on past you and away, and comes again, until you face it, get far away, or its rage runs out.
// Numbers in data/battle.ts STALK. Pure logic: roam.ts moves it while it stalks, encounters.ts makes its bite.
import { STALK } from '../../data/battle';
import { DIVER } from '../../data/diver';
import type { Rng } from '../math';
import type { ViewRect } from '../beastState';
import type { WildBeast } from './wildState';
export type { Stalk } from './wildState';

/** Roused: it starts stalking you, or its rage is renewed if it already does. */
export function startStalk(b: WildBeast, diverX: number): void {
  if (b.stalk) {
    b.stalk.rage = STALK.seconds;
    return;
  }
  const dir: 1 | -1 = b.x >= diverX ? 1 : -1;
  b.stalk = { phase: 'away', t: 0, rage: STALK.seconds, aimX: b.x, aimY: b.y, dir };
  b.mood = 'chase';
  b.patrol = undefined;
}

/** Out of the picture (with its length beyond the edge). */
const offView = (b: WildBeast, v: ViewRect): boolean =>
  b.x < v.x - b.length * 0.6 || b.x > v.x + v.width + b.length * 0.6;

export interface StalkStep {
  /** Where it swims and how fast (units/s). */
  tx: number;
  ty: number;
  speed: number;
  /** Its warning starts now (the red arrow, the toll). */
  warned?: boolean;
  /** It is charging: its jaws open, its bite counts. */
  charging?: boolean;
}

/**
 * One step of its stalking; null when it is over (it swims off and leaves you alone a while). `view` is the
 * camera's (a box round you when there is none).
 */
export function stepStalk(
  b: WildBeast,
  d: { x: number; y: number; dead: boolean },
  view: ViewRect | null | undefined,
  rng: Rng,
  dt: number,
): StalkStep | null {
  const s = b.stalk!;
  const v = view ?? { x: d.x - 200, y: d.y - 110, width: 400, height: 220 };
  const U = DIVER.lengthUnits;
  const swim = DIVER.maxSpeed;
  s.rage -= dt;
  const dist = Math.hypot(b.x - d.x, b.y - d.y);
  if (d.dead || dist > STALK.giveUpRange || (s.rage <= 0 && s.phase !== 'charge')) {
    b.stalk = undefined;
    b.calm = STALK.afterSeconds;
    return null;
  }
  if (s.phase === 'away' || s.phase === 'pass') {
    // on its way, straight, out of the picture (after a charge it first goes on past you)
    if (s.phase === 'pass') {
      s.t -= dt;
      if (s.t <= 0) s.phase = 'away';
    } else if (offView(b, v)) {
      s.phase = 'wait';
      s.t = STALK.waitSeconds[0] + rng() * (STALK.waitSeconds[1] - STALK.waitSeconds[0]);
    }
    return { tx: b.x + s.dir * U * 20, ty: s.phase === 'pass' ? b.y : d.y, speed: swim * STALK.awaySpeed };
  }
  if (s.phase === 'wait') {
    // in the dark beyond the edge, in silence: it turns there, out of sight, towards you
    s.t -= dt;
    if (s.t <= 0) {
      s.phase = 'warn';
      s.t = STALK.warnSeconds;
      s.toll = true;
      s.dir = d.x >= b.x ? 1 : -1;
      return { tx: b.x + s.dir, ty: d.y, speed: 0, warned: true };
    }
    return { tx: b.x + (d.x >= b.x ? 1 : -1), ty: d.y, speed: 0 };
  }
  if (s.phase === 'warn') {
    s.t -= dt;
    if (s.t <= 0) {
      s.phase = 'charge';
      s.aimX = d.x;
      s.aimY = d.y;
    }
    return { tx: b.x + s.dir, ty: d.y, speed: swim * 0.2 };
  }
  // the charge: at where you were, steering only a little after you; gone past it, it goes on
  const k = Math.min(1, dt * STALK.homing);
  s.aimX += (d.x - s.aimX) * k;
  s.aimY += (d.y - s.aimY) * k;
  const ahead = (s.aimX - b.x) * s.dir;
  if (ahead < -b.length * 0.3) {
    s.phase = 'pass';
    s.t = STALK.passSeconds;
  }
  return { tx: s.aimX + s.dir * b.length, ty: s.aimY, speed: swim * STALK.chargeSpeed, charging: true };
}

/** After its bite (or a near miss) it goes on past you. */
export function stalkPassed(b: WildBeast): void {
  if (!b.stalk) return;
  b.stalk.phase = 'pass';
  b.stalk.t = STALK.passSeconds;
}
