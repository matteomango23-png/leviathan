// The Compagnia's guns at your ship (owner, 17 novembre 2026: shots you see coming and can dodge): a hunting vessel's
// gun glints red for a moment, aimed where you are then; it fires there when the moment is over, so moving meanwhile
// makes it miss. Torpedoes run at you from in front, depth charges roll off over you when you are under. A fire on
// its deck jams its guns. Numbers in data/company.ts (WEAPONS, BATTLE.telegraph). Pure logic.
import { BATTLE, DETECTION, ENEMY_CLASSES, WEAPONS } from '../../data/company';
import type { GameEvent } from '../events';
import type { GameState } from '../newGame';
import { shipPoint } from '../ship/geometry';
import { shipPicture } from '../ship/model';
import type { Quarry } from './detection';
import { enemyPose, metres, type EnemyVessel } from './enemyState';
import { dropCharge, fireShell, fireTorpedo } from './ordnance';

/** Where its gun is (the deck, forward of the middle). */
export function enemyGun(e: EnemyVessel): { x: number; y: number } {
  const pose = enemyPose(e);
  return shipPoint(pose, 0.7, shipPicture(pose).deckY);
}

/** One step of a hunting vessel's weapons at you. */
export function enemyFires(g: GameState, e: EnemyVessel, q: Quarry, dt: number, events: GameEvent[]): void {
  const c = g.company;
  const pose = enemyPose(e);
  const pic = shipPicture(pose);
  const dx = q.x - e.x;
  const def = ENEMY_CLASSES[e.cls];
  const jammed = e.dmg.jam > 0;
  for (const weapon of def.weapons) {
    if ((e.reload[weapon] ?? 0) > 0 || jammed) continue;
    const w = WEAPONS[weapon];
    if (Math.abs(dx) > metres(w.rangeM)) continue;
    let fired = false;
    if (w.kind === 'shell') {
      if (q.depthM > DETECTION.periscopeM || e.dive >= metres(DETECTION.periscopeM)) continue;
      // first the glint, aimed where you are now; then the shot there
      if (!e.aimAt) {
        e.aimAt = { x: q.x, y: q.y };
        e.aimT = BATTLE.telegraph;
        events.push({ type: 'enemyAim', ...enemyGun(e) });
        continue;
      }
      e.aimT -= dt;
      if (e.aimT > 0) continue;
      fired = fireShell(c, weapon, 'enemy', enemyGun(e), e.aimAt, g.rng);
      e.aimAt = null;
    } else if (w.kind === 'torpedo' && dx * e.face > 0) {
      fireTorpedo(c, 'enemy', shipPoint(pose, pic.lamp.u, pic.waterline + 0.05), q, e.face);
      fired = true;
    } else if (
      w.kind === 'charge' &&
      q.depthM > DETECTION.periscopeM &&
      Math.abs(dx) < metres(w.blastM * 2)
    ) {
      dropCharge(c, 'enemy', shipPoint(pose, 0.1, pic.waterline), q.y);
      fired = true;
    }
    if (!fired) continue;
    e.reload[weapon] = w.reload * def.reloadMult;
    events.push({ type: 'shotFired', from: 'enemy', weapon, ...enemyGun(e) });
  }
}
