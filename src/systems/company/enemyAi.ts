// How the Compagnia's vessels sail (owner, 17 novembre 2026): calm, back and forth on patrol; suspicious or having
// lost you, to the place where they last perceived you, slowly; hunting, they come for you and hold at their
// shooting distance. Like your ship they speed up and slow down gently and turn round only when slow. Numbers in
// data/company.ts (ENEMY_CLASSES, ENEMY_MOTION). Pure logic.
import { ENEMY_CLASSES, ENEMY_MOTION } from '../../data/company';
import { knotsToUnits, metres, type EnemyVessel } from './enemyState';

/** Where it wants to go now (world x, or null to stop) and how fast (knots). */
function wish(e: EnemyVessel, you: { x: number }): { x: number | null; knots: number } {
  const def = ENEMY_CLASSES[e.cls];
  if (e.phase === 'hunting') {
    const dx = you.x - e.x;
    const d = Math.abs(dx);
    const hold = metres(def.holdM);
    // too far: closer; too near: it backs off to its distance; between: it keeps still and shoots
    if (d > hold * ENEMY_MOTION.holdFar) return { x: you.x, knots: def.huntKnots };
    if (d < hold * ENEMY_MOTION.holdNear)
      return { x: e.x - Math.sign(dx || 1) * hold, knots: def.patrolKnots };
    return { x: null, knots: 0 };
  }
  if ((e.phase === 'suspicious' || e.phase === 'lost') && e.lastSeen) {
    if (Math.abs(e.lastSeen.x - e.x) < metres(ENEMY_MOTION.searchNearM)) return { x: null, knots: 0 };
    return { x: e.lastSeen.x, knots: def.patrolKnots };
  }
  // on patrol: to one end, then the other
  const end = e.home + e.face * metres(def.patrolM);
  const past = (end - e.x) * e.face <= 0;
  return { x: past ? e.home - e.face * metres(def.patrolM) : end, knots: def.patrolKnots };
}

/** One step of its sailing. */
export function sailEnemy(e: EnemyVessel, you: { x: number }, dt: number): void {
  const w = wish(e, you);
  const accel = metres(ENEMY_MOTION.accel) * dt;
  const wantFace: 1 | -1 = w.x === null ? e.face : w.x >= e.x ? 1 : -1;
  const top = knotsToUnits(w.knots) * (e.fouled > 0 ? 0.5 : 1);
  e.fouled = Math.max(0, e.fouled - dt);
  // the other way: it slows down first and turns round once slow (never a spin at speed)
  const want = wantFace === e.face ? top : 0;
  if (wantFace !== e.face && e.speed <= knotsToUnits(ENEMY_MOTION.turnBelowKnots)) e.face = wantFace;
  e.speed += Math.max(-accel, Math.min(accel, want - e.speed));
  e.x += e.face * e.speed * dt;
}
