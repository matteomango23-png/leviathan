// The patrol of the big predators (CLAUDE.md "Regole di movimento delle bestie grandi"; owner, 15 ottobre 2026: "il
// nuoto mi piace… falli per tutti i predatori ma non sempre, va bene che qualche virata si veda"). A big hunter that
// spots you does not always charge at once: now and then it makes a few passes first. It comes in from the edge
// and slows, cruises past near your depth, speeds up towards the far edge until it is off the screen, waits a
// moment there, turns out of sight and comes back from the same side. Followed for about a second, or in view too
// long, it bolts away faster than you; left behind off screen facing you, it catches up. Sometimes it turns in
// view instead of leaving. After its passes it charges. Pure logic: roam.ts asks it where to swim.
import { PATROL, ROAM } from '../../data/beasts';
import { DIVER } from '../../data/diver';
import type { Rng } from '../math';
import type { ViewRect } from '../beastState';
import { speciesOf } from './forms';
import type { WildBeast } from './wildState';
export type { Patrol } from './wildState';

const U = DIVER.lengthUnits;

/** A big hunter (not a named beast) may patrol. */
const canPatrol = (b: WildBeast): boolean => {
  const size = speciesOf(b.form).size;
  return !b.boss && (size === 'grande' || size === 'colossale');
};

function newPass(b: WildBeast, rng: Rng): void {
  const p = b.patrol!;
  const side = rng() < 0.5 ? -1 : 1;
  Object.assign(p, {
    st: 'pass',
    onT: 0,
    followT: 0,
    // it passes above or below you, clear of you: a pass is not an attack
    dy: side * (b.length * 0.35 + DIVER.radius + U * (1 + rng() * 2)),
    turnInView: rng() < PATROL.turnInView,
  });
}

/** It has just spotted you: a few passes first (sometimes), or straight at you. */
export function startPatrol(b: WildBeast, rng: Rng): boolean {
  if (!canPatrol(b) || rng() >= PATROL.chance) return false;
  b.patrol = {
    passes: 1 + Math.floor(rng() * PATROL.maxPasses),
    st: 'pass',
    t: 0,
    onT: 0,
    followT: 0,
    dy: 0,
    turnInView: false,
  };
  b.patrolled = true;
  newPass(b, rng);
  return true;
}

interface PatrolStep {
  tx: number;
  ty: number;
  speed: number;
  /** Turn round now (off screen, or the turn in view). */
  turn?: boolean;
}

/**
 * Where it swims this step on its patrol; null when the passes are over (it charges: roam.ts).
 * @param diver you, with your speed (to bolt faster than you and to tell when you follow it)
 */
export function stepPatrol(
  b: WildBeast,
  diver: { x: number; y: number; vx: number },
  view: ViewRect,
  rng: Rng,
  dt: number,
): PatrolStep | null {
  const p = b.patrol;
  if (!p) return null;
  const half = b.length * 0.6;
  const left = view.x - half;
  const right = view.x + view.width + half;
  const off = b.x < left || b.x > right;
  // across the screen in the way it swims: 0 at the edge it came from, 1 at the far one
  const rel = b.face > 0 ? (b.x - view.x) / view.width : 1 - (b.x - view.x) / view.width;
  const ahead = off && rel > 1; // gone out of the far edge
  const ty = diver.y + p.dy;
  const far = b.face > 0 ? right + half * 2 : left - half * 2;
  const cruise = ROAM.cruiseSpeed * U * PATROL.cruiseMult;
  if (p.st === 'wait') {
    p.t -= dt;
    if (p.t > 0) return { tx: b.x, ty, speed: 0 };
    newPass(b, rng);
    return { tx: b.x - b.face * view.width, ty, speed: cruise, turn: true }; // it turns out of sight, comes back in
  }
  if (!off) {
    p.onT += dt;
    const following = Math.sign(diver.vx) === b.face && Math.abs(diver.vx) > U * PATROL.followSpeed;
    p.followT = following ? p.followT + dt : Math.max(0, p.followT - dt * 0.5);
    if (p.st === 'pass' && (p.followT > PATROL.followSeconds || p.onT > PATROL.inViewSeconds)) p.st = 'bolt';
  }
  if (ahead) {
    // out of the far edge: one pass less; the last one over, it charges
    p.passes--;
    if (p.passes <= 0) {
      b.patrol = undefined;
      return null;
    }
    Object.assign(p, {
      st: 'wait',
      t: PATROL.waitSeconds[0] + rng() * (PATROL.waitSeconds[1] - PATROL.waitSeconds[0]),
    });
    return { tx: b.x, ty, speed: 0 };
  }
  if (p.st === 'bolt') {
    const speed = Math.max(ROAM.chaseSpeed * U * PATROL.boltMult, Math.abs(diver.vx) + U * PATROL.boltOver);
    return { tx: far, ty: b.y, speed };
  }
  if (off) return { tx: far, ty, speed: ROAM.chaseSpeed * U * PATROL.catchUpMult }; // behind, facing in: catches up
  if (p.turnInView && rel > 0.72) {
    // this time it turns in view (owner: "va bene che qualche virata si veda") and passes back
    p.passes--;
    if (p.passes <= 0) {
      b.patrol = undefined;
      return null;
    }
    newPass(b, rng);
    p.turnInView = false;
    return { tx: b.x - b.face * view.width, ty, speed: cruise, turn: true };
  }
  // coming in it slows, cruises past you, then speeds up out of the far edge
  const speed =
    rel < 0.35
      ? cruise * (2.5 - (rel / 0.35) * 1.5)
      : rel < 0.72
        ? cruise
        : cruise + ((rel - 0.72) / 0.28) ** 2 * ROAM.chaseSpeed * U * PATROL.exitMult;
  return { tx: far, ty, speed };
}
