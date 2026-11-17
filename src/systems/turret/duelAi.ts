// The Compagnia's vessel in the turret's duel (owner, 17 novembre 2026): it keeps a fighting distance, weaving to a
// new bearing from you every few seconds so it is never still in your sights; it is never faster than you can chase
// ("le navi tendono ad allontanarsi di brutto"), and never farther than its leash: broken, it runs, but slowly, and
// past the leash it circles back. It never vanishes.
// Its gun flashes, then its shell flies at where you were: change speed or distance to dodge. Numbers in
// data/turret.ts DUEL and data/company.ts. Pure logic.
import { BATTLE, ENEMY_CLASSES, WEAPONS } from '../../data/company';
import { DUEL, TORPEDO_GUIDE, UNDERWATER } from '../../data/turret';
import { HELM } from '../../data/ship';
import { WORLD } from '../../data/worldLayout';
import { floodSpeed } from '../company/hullDamage';
import type { EnemyVessel } from '../company/enemyState';
import type { GameState } from '../newGame';
import { shipModel, shipPicture, shipTopSpeed } from '../ship/model';
import { fireRound, lobPitch } from './ballistics';
import { foeFromYou, type DuelState } from './duelState';
import { dropCharge, launchTorpedo } from './torpedo';
import { wrapAngle, type P3 } from './projection';

export type FoeEvent = { type: 'foeFlash'; p: P3 } | { type: 'foeShot'; p: P3 };

const knots = (k: number): number => k / HELM.knotsPerUnit / WORLD.unitsPerMetre;

/** Your ship's top speed in the duel now (m/s): slower with water in the hull. */
export const yourTop = (g: GameState): number =>
  (shipTopSpeed(g.ship) / WORLD.unitsPerMetre) * floodSpeed(g.company.yourDmg);

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
  const leashed = rel.dist > DUEL.leashM;
  const running = e.hull < def.hull * BATTLE.fleeBelow && !leashed;
  // a new bearing from you now and then: on its side of your bow, a little ahead or behind
  f.weaveT -= dt;
  if (f.weaveT <= 0) {
    const [a, b] = DUEL.weaveSeconds;
    f.weaveT = a + g.rng() * (b - a);
    const side = Math.sign(wrapAngle(Math.atan2(rel.s, rel.a) - d.you.heading) || 1);
    f.bearing = side * (Math.PI / 2 + ((g.rng() * 2 - 1) * DUEL.weaveDeg * Math.PI) / 180);
  }
  // you deep under it: a hunting ship comes over you to drop its charges; the others keep their distance
  const overYou = deep(d) && def.weapons.includes('carica');
  const b = d.you.heading + f.bearing;
  const target = running
    ? { a: f.a + rel.a * 4, s: f.s + rel.s * 4 }
    : overYou
      ? { a: d.you.a, s: d.you.s }
      : { a: d.you.a + Math.cos(b) * DUEL.rangeM, s: d.you.s + Math.sin(b) * DUEL.rangeM };
  const want = Math.atan2(target.s - f.s, target.a - f.a);
  const turn = wrapAngle(want - f.heading);
  f.heading = wrapAngle(f.heading + Math.max(-DUEL.turnRate * dt, Math.min(DUEL.turnRate * dt, turn)));
  const far = Math.hypot(target.a - f.a, target.s - f.s);
  // never faster than you can chase it; running broken, slower still
  const cap = Math.max(knots(def.patrolKnots) * 0.5, yourTop(g) * DUEL.foeSpeedShare);
  // past the leash it slows as it turns back to you
  const top =
    Math.min(knots(def.huntKnots) * floodSpeed(e.dmg), cap) * (running ? DUEL.fleeShare : leashed ? 0.5 : 1);
  const speed =
    running || far > 30 ? top : Math.min(top, Math.max(knots(def.patrolKnots), Math.abs(d.you.speed)));
  f.speed += Math.max(-1.5 * dt, Math.min(1.5 * dt, speed - f.speed));
  f.speed = Math.min(f.speed, cap);
  f.a += Math.cos(f.heading) * f.speed * dt;
  f.s += Math.sin(f.heading) * f.speed * dt;
}

/** Its gun: a flash aimed at where you are, then the shell, lobbed to land there. */
function shoot(g: GameState, d: DuelState, e: EnemyVessel, dt: number): FoeEvent[] {
  const f = d.foe;
  const def = ENEMY_CLASSES[e.cls];
  const gun = def.weapons.find((w) => WEAPONS[w].kind === 'shell');
  f.reload = Math.max(0, f.reload - dt);
  // under the water you are out of its gun's sight
  if (!gun || e.dmg.jam > 0 || f.reload > 0 || deep(d)) return [];
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

/** You are deep enough that guns cannot reach you (the turret's periscope depth). */
const deep = (d: DuelState): boolean => d.you.depth >= UNDERWATER.periscopeM;

/** Under the water: an enemy U-Boat's torpedoes at where you are; a hunting ship's charges over you. */
function underArms(d: DuelState, e: EnemyVessel, dt: number): FoeEvent[] {
  const f = d.foe;
  const def = ENEMY_CLASSES[e.cls];
  f.torpReload = Math.max(0, f.torpReload - dt);
  f.chargeReload = Math.max(0, f.chargeReload - dt);
  const rel = foeFromYou(d);
  const out: FoeEvent[] = [];
  if (def.weapons.includes('siluro') && f.torpReload <= 0 && rel.dist < TORPEDO_GUIDE.rangeM * 0.7) {
    const from = { a: f.a + Math.cos(f.heading) * 10, s: f.s + Math.sin(f.heading) * 10, z: -(f.depth + 2) };
    const yaw = Math.atan2(d.you.s - from.s, d.you.a - from.a);
    const pitch = Math.atan2(-(d.you.depth + 2) - from.z, Math.hypot(d.you.a - from.a, d.you.s - from.s));
    launchTorpedo(d, 'foe', from, yaw, pitch);
    f.torpReload = TORPEDO_GUIDE.foeReload;
    out.push({ type: 'foeShot', p: from });
  }
  if (
    def.weapons.includes('carica') &&
    deep(d) &&
    f.chargeReload <= 0 &&
    rel.dist < WEAPONS.carica.blastM * 2.5
  ) {
    dropCharge(
      d,
      { a: f.a - Math.cos(f.heading) * 12, s: f.s - Math.sin(f.heading) * 12, z: 0 },
      -d.you.depth,
    );
    f.chargeReload = WEAPONS.carica.reload;
  }
  return out;
}

/** One step of the vessel: it sails and shoots. */
export function stepFoe(g: GameState, d: DuelState, e: EnemyVessel, dt: number): FoeEvent[] {
  sail(g, d, e, dt);
  return [...shoot(g, d, e, dt), ...underArms(d, e, dt)];
}
