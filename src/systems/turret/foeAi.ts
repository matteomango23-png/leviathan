// A Compagnia vessel in the inside view (owner, 17 novembre 2026): it perceives you as in the world (company/
// detection.ts) but from where it really is on the plane, so you can come at it slowly, in Silence, or pass under
// it in a U-Boat. Not hunting you, it patrols its beat and never shoots; hunting, it keeps a fighting distance,
// weaving to a new bearing from you every few seconds, never faster than you can chase ("le navi tendono ad
// allontanarsi di brutto") and never farther than its leash; broken, it runs, but slowly. Its gun flashes, then its
// shell flies at where you were. Numbers in data/turret.ts DUEL, INSIDE and data/company.ts. Pure logic.
import { BATTLE, ENEMY_CLASSES, WEAPONS } from '../../data/company';
import { DUEL, INSIDE, TORPEDO_GUIDE, UNDERWATER } from '../../data/turret';
import { HELM } from '../../data/ship';
import { WORLD } from '../../data/worldLayout';
import { nightness } from '../dayNight';
import { perceive, stepAlert } from '../company/detection';
import { floodSpeed } from '../company/hullDamage';
import { quarryOf } from '../company/hulls';
import type { AlertPhase, EnemyVessel } from '../company/enemyState';
import type { GameState } from '../newGame';
import { shipModel, shipPicture, shipTopSpeed } from '../ship/model';
import { fireRound, lobPitch } from './ballistics';
import { foeFrom, toUnits, type FoeInView, type InsideState } from './insideState';
import { dropCharge, launchTorpedo } from './torpedo';
import { wrapAngle, type P3 } from './projection';

export type FoeEvent =
  | { type: 'foeFlash'; p: P3 }
  | { type: 'foeShot'; p: P3 }
  | { type: 'foeAlert'; foe: number; phase: AlertPhase };

const knots = (k: number): number => k / HELM.knotsPerUnit / WORLD.unitsPerMetre;

/** Your ship's top speed in the view now (m/s): slower with water in the hull. */
export const yourTop = (g: GameState): number =>
  (shipTopSpeed(g.ship) / WORLD.unitsPerMetre) * floodSpeed(g.company.yourDmg);

/** You are deep enough that guns cannot reach you (the turret's periscope depth). */
const deep = (d: InsideState): boolean => d.you.depth >= UNDERWATER.periscopeM;

/** Where its gun is (m). */
export function foeGun(f: FoeInView, e: EnemyVessel): P3 {
  const pose = { model: ENEMY_CLASSES[e.cls].look };
  const m = shipModel(pose);
  const pic = shipPicture(pose);
  const fwd = m.lengthM * 0.2;
  return {
    a: f.a + Math.cos(f.heading) * fwd,
    s: f.s + Math.sin(f.heading) * fwd,
    z: (pic.waterline - pic.deckY) * m.lengthM * pic.aspect,
  };
}

/** What it perceives of you from where it is on the plane: the world's rules, the plane's distance. */
function sense(g: GameState, d: InsideState, f: FoeInView, e: EnemyVessel, dt: number): FoeEvent[] {
  const q = quarryOf(g);
  const rel = foeFrom(d, f);
  const pose = { model: ENEMY_CLASSES[e.cls].look };
  const at = {
    x: q.x + toUnits(rel.dist),
    y: q.y + toUnits(f.depth - d.you.depth),
    depthM: f.depth,
    halfM: shipModel(pose).lengthM / 2,
  };
  const p = g.ship.hull > 0 ? perceive(ENEMY_CLASSES[e.cls], at, q, nightness(g.day)) : 0;
  const phase = stepAlert(e, p, q, dt);
  return phase ? [{ type: 'foeAlert', foe: f.id, phase }] : [];
}

/** Turns towards a point and goes at this speed, never faster than you can chase. */
function steer(
  g: GameState,
  f: FoeInView,
  e: EnemyVessel,
  to: { a: number; s: number },
  speed: number,
  dt: number,
): void {
  const want = Math.atan2(to.s - f.s, to.a - f.a);
  const turn = wrapAngle(want - f.heading);
  f.heading = wrapAngle(f.heading + Math.max(-DUEL.turnRate * dt, Math.min(DUEL.turnRate * dt, turn)));
  const cap = Math.max(knots(ENEMY_CLASSES[e.cls].patrolKnots) * 0.5, yourTop(g) * DUEL.foeSpeedShare);
  f.speed += Math.max(-1.5 * dt, Math.min(1.5 * dt, speed - f.speed));
  f.speed = Math.min(f.speed, cap);
  f.a += Math.cos(f.heading) * f.speed * dt;
  f.s += Math.sin(f.heading) * f.speed * dt;
}

/** Not hunting: up and down its beat at patrol speed (back to it from wherever the hunt took it). */
function patrol(g: GameState, f: FoeInView, e: EnemyVessel, dt: number): void {
  const end = f.home + f.dir * INSIDE.patrolM;
  if ((end - f.a) * f.dir < 10) f.dir = -f.dir as 1 | -1;
  const to = { a: f.home + f.dir * INSIDE.patrolM, s: f.homeS };
  steer(g, f, e, to, knots(ENEMY_CLASSES[e.cls].patrolKnots) * floodSpeed(e.dmg), dt);
}

/** Hunting: its fighting distance, weaving; over you to drop charges; broken, it runs slowly; past the leash, back. */
function hunt(g: GameState, d: InsideState, f: FoeInView, e: EnemyVessel, dt: number): void {
  const def = ENEMY_CLASSES[e.cls];
  const rel = foeFrom(d, f);
  const leashed = rel.dist > DUEL.leashM;
  const running = e.hull < def.hull * BATTLE.fleeBelow && !leashed;
  f.weaveT -= dt;
  if (f.weaveT <= 0) {
    const [a, b] = DUEL.weaveSeconds;
    f.weaveT = a + g.rng() * (b - a);
    const side = Math.sign(wrapAngle(Math.atan2(rel.s, rel.a) - d.you.heading) || 1);
    f.bearing = side * (Math.PI / 2 + ((g.rng() * 2 - 1) * DUEL.weaveDeg * Math.PI) / 180);
  }
  const overYou = deep(d) && def.weapons.includes('carica');
  const b = d.you.heading + f.bearing;
  const to = running
    ? { a: f.a + rel.a * 4, s: f.s + rel.s * 4 }
    : overYou
      ? { a: d.you.a, s: d.you.s }
      : { a: d.you.a + Math.cos(b) * DUEL.rangeM, s: d.you.s + Math.sin(b) * DUEL.rangeM };
  const far = Math.hypot(to.a - f.a, to.s - f.s);
  const top = knots(def.huntKnots) * floodSpeed(e.dmg) * (running ? DUEL.fleeShare : leashed ? 0.5 : 1);
  const speed =
    running || far > 30 ? top : Math.min(top, Math.max(knots(def.patrolKnots), Math.abs(d.you.speed)));
  steer(g, f, e, to, speed, dt);
}

/** Its gun: a flash aimed at where you are, then the shell, lobbed to land there. */
function shoot(g: GameState, d: InsideState, f: FoeInView, e: EnemyVessel, dt: number): FoeEvent[] {
  const def = ENEMY_CLASSES[e.cls];
  const gun = def.weapons.find((w) => WEAPONS[w].kind === 'shell');
  f.reload = Math.max(0, f.reload - dt);
  // under the water you are out of its gun's sight
  if (!gun || e.dmg.jam > 0 || f.reload > 0 || deep(d)) return [];
  const w = WEAPONS[gun];
  const at = foeGun(f, e);
  if (!f.aimAt) {
    if (foeFrom(d, f).dist > w.rangeM * 1.6) return [];
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
  fireRound(d, f.id, gun, at, Math.atan2(to.s - at.s, to.a - at.a), pitch, (w.spread ?? 0) * 1.5, g.rng);
  return [{ type: 'foeShot', p: at }];
}

/** Under the water: an enemy U-Boat's torpedoes at where you are; a hunting ship's charges over you. */
function underArms(d: InsideState, f: FoeInView, e: EnemyVessel, dt: number): FoeEvent[] {
  const def = ENEMY_CLASSES[e.cls];
  f.torpReload = Math.max(0, f.torpReload - dt);
  f.chargeReload = Math.max(0, f.chargeReload - dt);
  const rel = foeFrom(d, f);
  const out: FoeEvent[] = [];
  if (def.weapons.includes('siluro') && f.torpReload <= 0 && rel.dist < TORPEDO_GUIDE.rangeM * 0.7) {
    const from = { a: f.a + Math.cos(f.heading) * 10, s: f.s + Math.sin(f.heading) * 10, z: -(f.depth + 2) };
    const yaw = Math.atan2(d.you.s - from.s, d.you.a - from.a);
    const pitch = Math.atan2(-(d.you.depth + 2) - from.z, Math.hypot(d.you.a - from.a, d.you.s - from.s));
    launchTorpedo(d, f.id, from, yaw, pitch);
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

/** One step of a vessel: it perceives you, sails and, hunting, shoots. */
export function stepFoe(g: GameState, d: InsideState, f: FoeInView, e: EnemyVessel, dt: number): FoeEvent[] {
  const out = sense(g, d, f, e, dt);
  if (e.phase !== 'hunting' || g.ship.hull <= 0) {
    patrol(g, f, e, dt);
    f.aimAt = null;
    return out;
  }
  hunt(g, d, f, e, dt);
  return [...out, ...shoot(g, d, f, e, dt), ...underArms(d, f, e, dt)];
}
