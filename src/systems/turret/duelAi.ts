// The Compagnia's vessel in the turret's duel (owner, 17 novembre 2026): it keeps a fighting distance, weaving to a
// new bearing from you every few seconds so it is never still in your sights; broken, it runs, but it never vanishes.
// Its gun flashes, then its shell flies at where you were: change speed or distance to dodge. Numbers in
// data/turret.ts DUEL and data/company.ts. Pure logic.
import { BATTLE, ENEMY_CLASSES, WEAPONS } from '../../data/company';
import { DUEL } from '../../data/turret';
import { HELM } from '../../data/ship';
import { WORLD } from '../../data/worldLayout';
import { floodSpeed } from '../company/hullDamage';
import type { EnemyVessel } from '../company/enemyState';
import type { GameState } from '../newGame';
import { shipModel, shipPicture } from '../ship/model';
import { fireRound, lobPitch } from './ballistics';
import { foeFromYou, type DuelState } from './duelState';
import { wrapAngle, type P3 } from './projection';

export type FoeEvent = { type: 'foeFlash'; p: P3 } | { type: 'foeShot'; p: P3 };

const knots = (k: number): number => k / HELM.knotsPerUnit / WORLD.unitsPerMetre;

/** Where its gun is (m). */
export function foeGun(d: DuelState, e: EnemyVessel): P3 {
  const pose = { model: ENEMY_CLASSES[e.cls].look };
  const m = shipModel(pose);
  const pic = shipPicture(pose);
  const fwd = m.lengthM * 0.2;
  return {
    a: d.foe.a + Math.cos(d.foe.heading) * fwd,
    s: d.foe.s + Math.sin(d.foe.heading) * fwd,
    z: (pic.waterline - pic.deckY) * m.lengthM * pic.aspect,
  };
}

function sail(g: GameState, d: DuelState, e: EnemyVessel, dt: number): void {
  const def = ENEMY_CLASSES[e.cls];
  const f = d.foe;
  const rel = foeFromYou(d);
  const running = e.hull < def.hull * BATTLE.fleeBelow;
  // a new bearing from you now and then: on its side of you, a little ahead or behind
  f.weaveT -= dt;
  if (f.weaveT <= 0) {
    const [a, b] = DUEL.weaveSeconds;
    f.weaveT = a + g.rng() * (b - a);
    const side = Math.sign(rel.s || 1);
    f.bearing = side * (Math.PI / 2 + ((g.rng() * 2 - 1) * DUEL.weaveDeg * Math.PI) / 180);
  }
  const target = running
    ? { a: f.a + rel.a * 4, s: f.s + rel.s * 4 }
    : { a: d.you.a + Math.cos(f.bearing) * DUEL.rangeM, s: d.you.s + Math.sin(f.bearing) * DUEL.rangeM };
  const want = Math.atan2(target.s - f.s, target.a - f.a);
  const turn = wrapAngle(want - f.heading);
  f.heading = wrapAngle(f.heading + Math.max(-DUEL.turnRate * dt, Math.min(DUEL.turnRate * dt, turn)));
  const far = Math.hypot(target.a - f.a, target.s - f.s);
  const top = knots(def.huntKnots) * floodSpeed(e.dmg);
  const speed = running || far > 30 ? top : Math.min(top, Math.max(knots(def.patrolKnots), d.you.speed));
  f.speed += Math.max(-1.5 * dt, Math.min(1.5 * dt, speed - f.speed));
  f.a += Math.cos(f.heading) * f.speed * dt;
  f.s += Math.sin(f.heading) * f.speed * dt;
}

/** Its gun: a flash aimed at where you are, then the shell, lobbed to land there. */
function shoot(g: GameState, d: DuelState, e: EnemyVessel, dt: number): FoeEvent[] {
  const f = d.foe;
  const def = ENEMY_CLASSES[e.cls];
  const gun = def.weapons.find((w) => WEAPONS[w].kind === 'shell');
  f.reload = Math.max(0, f.reload - dt);
  if (!gun || e.dmg.jam > 0 || f.reload > 0) return [];
  const w = WEAPONS[gun];
  const at = foeGun(d, e);
  if (!f.aimAt) {
    if (foeFromYou(d).dist > w.rangeM * 1.6) return [];
    f.aimAt = { a: d.you.a, s: d.you.s, z: 2 };
    f.aimT = BATTLE.telegraph;
    return [{ type: 'foeFlash', p: at }];
  }
  f.aimT -= dt;
  if (f.aimT > 0) return [];
  const to = f.aimAt;
  f.aimAt = null;
  f.reload = w.reload * def.reloadMult;
  const dist = Math.hypot(to.a - at.a, to.s - at.s);
  const pitch = lobPitch(dist, to.z - at.z, w.speed, w.gravity ?? 9.8);
  if (pitch === null) return [];
  fireRound(d, 'foe', gun, at, Math.atan2(to.s - at.s, to.a - at.a), pitch, (w.spread ?? 0) * 1.5, g.rng);
  return [{ type: 'foeShot', p: at }];
}

/** One step of the vessel: it sails and shoots. */
export function stepFoe(g: GameState, d: DuelState, e: EnemyVessel, dt: number): FoeEvent[] {
  sail(g, d, e, dt);
  return shoot(g, d, e, dt);
}
