// One step of the turret's duel (owner, 17 novembre 2026): your ship sails where its bow points at the throttle,
// the rudder turning it ("il gas per avvicinarsi non funziona bene"), and, a U-Boat, dives; the turret turns where you drag; above the water the machine gun fires while held
// (and heats up) and the gun one shell at a time, at any depth the guided torpedo; the vessel answers (duelAi.ts);
// the rounds (ballistics.ts), torpedoes and charges (torpedo.ts) strike hulls (duelHits.ts). It opens from the world
// and gives it back. Pure logic.
import { ENEMY_CLASSES, WEAPONS, type WeaponId } from '../../data/company';
import { DUEL, MACHINE_GUN, TORPEDO_GUIDE, TURRET, UNDERWATER } from '../../data/turret';
import { WORLD } from '../../data/worldLayout';
import { stepDamage } from '../company/hullDamage';
import type { EnemyVessel } from '../company/enemyState';
import type { GameState } from '../newGame';
import { damageShip } from '../ship/shipHull';
import { shipModel, shipPicture, shipRates } from '../ship/model';
import type { DuelHull, RoundEvent } from './ballistics';
import { fireRound, stepRounds } from './ballistics';
import { stepFoe, yourTop, type FoeEvent } from './duelAi';
import { hitFoe, roundHitsYou, hitYou, sinkFoe, type EndEvent } from './duelHits';
import { newDuel, toUnits, type DuelState } from './duelState';
import { launchTorpedo, stepUnder, type UnderEvent } from './torpedo';
import { enemyExtent } from './hullModels';
import { wrapAngle } from './projection';

/** What you do in the turret this frame (ui/turretControls.ts, the keyboard). */
export interface TurretInput {
  /** −DUEL.reverse … 1 of your top speed (backwards < 0). */
  throttle: number;
  /** The rudder: −1 to the left … 1 to the right. */
  steer: number;
  /** A U-Boat's dive lever: −1 up … 1 down. */
  dive: number;
  /** Radians to turn the turret this frame (dragged). */
  yaw: number;
  pitch: number;
  firing: boolean;
  /** The gun's and the torpedo's buttons pressed this frame. */
  gunShot: boolean;
  torpedo: boolean;
}

export const restingInput = (): TurretInput => ({
  throttle: 0,
  steer: 0,
  dive: 0,
  yaw: 0,
  pitch: 0,
  firing: false,
  gunShot: false,
  torpedo: false,
});

export type DuelEvent =
  | RoundEvent
  | FoeEvent
  | UnderEvent
  | EndEvent
  | { type: 'shot'; kind: 'mg' | WeaponId; p: { a: number; s: number; z: number } };

/** A hull for the rounds, from the picture it borrows, its waterline `depth` metres under the surface. */
export function hullOf(model: string, a: number, s: number, heading: number, depth = 0): DuelHull {
  const m = shipModel({ model });
  const pic = shipPicture({ model });
  const H = m.lengthM * pic.aspect;
  return {
    a,
    s,
    heading,
    length: m.lengthM * 0.9,
    beam: m.lengthM * 0.16,
    keel: (pic.keel - pic.waterline) * H + depth,
    // its superstructure counts: most of the picture above the water
    deck: pic.waterline * H * 0.85 - depth,
    waterline: pic.waterline,
    picH: H,
  };
}

/** Your ship can dive in the duel (a U-Boat), and how deep. */
export const yourMaxDepth = (g: GameState): number =>
  Math.min(UNDERWATER.maxDepthM, shipModel(g.ship).dive?.maxDepthM ?? 0);

/** The duel with this vessel, from where both are on the sea's line. */
export function openDuel(g: GameState, e: EnemyVessel): DuelState {
  const s = g.ship;
  const U = WORLD.unitsPerMetre;
  const along = ((e.x - s.x) * s.face) / U;
  const d = newDuel(e.id, along, e.speed / U, e.face !== s.face, e.dive / U, s.dive / U);
  d.you.speed = s.speed / U;
  return d;
}

/** Back to the sea's line: your ship's travel and depth, the vessel's place and way. */
export function closeDuel(g: GameState, d: DuelState): void {
  const s = g.ship;
  const e = g.company.enemies.find((x) => x.id === d.foeId);
  s.x += s.face * toUnits(d.you.a - d.startA);
  s.dive = toUnits(d.you.depth);
  if (e) {
    e.x = s.x + s.face * toUnits(d.foe.a - d.you.a);
    e.face = Math.cos(d.foe.heading) >= 0 ? s.face : (-s.face as 1 | -1);
    e.speed = toUnits(Math.abs(d.foe.speed));
  }
  // turned past across, your ship sails the other way along the line
  const along = Math.cos(d.you.heading) * Math.sign(d.you.speed || 1);
  if (along < 0) s.face = -s.face as 1 | -1;
  s.speed = toUnits(Math.abs(d.you.speed * Math.cos(d.you.heading)));
  g.company.battle = null;
}

/** How high the turret's eye is (m above the surface; under it < 0): the U-Boat's periscope, then under. */
export function eyeHeight(d: DuelState): number {
  const k = Math.min(1, d.you.depth / UNDERWATER.periscopeM);
  return TURRET.height + (-d.you.depth - TURRET.height) * k;
}

/** The turret's aim as a line from your eye: the guided torpedo keeps to it. */
const aimLine = (
  d: DuelState,
): { yaw: number; pitch: number; from: { a: number; s: number; z: number } } => ({
  yaw: d.yaw,
  pitch: d.pitch,
  from: { a: d.you.a, s: d.you.s, z: eyeHeight(d) },
});

/** The guns work only with the turret's eye above the water. */
export const gunsUp = (d: DuelState): boolean => d.you.depth < UNDERWATER.periscopeM;

/** Where the rounds leave: the barrels' ends, ahead of your eye (m). */
export function turretPoint(d: DuelState): { a: number; s: number; z: number } {
  const reach = 3;
  return {
    a: d.you.a + Math.cos(d.yaw) * reach,
    s: d.you.s + Math.sin(d.yaw) * reach,
    z: eyeHeight(d) - 1.2,
  };
}

function moveYou(g: GameState, d: DuelState, input: TurretInput, dt: number): void {
  const U = WORLD.unitsPerMetre;
  const want = yourTop(g) * Math.max(-DUEL.reverse, Math.min(1, input.throttle));
  const accel = (shipRates(g.ship).accel / U) * dt;
  d.you.speed += Math.max(-accel, Math.min(accel, want - d.you.speed));
  // the rudder turns the bow, a little even when still, fully with way on
  const way = 0.35 + 0.65 * Math.min(1, Math.abs(d.you.speed) / Math.max(1, yourTop(g) * 0.4));
  d.you.heading = wrapAngle(
    d.you.heading + Math.max(-1, Math.min(1, input.steer)) * DUEL.steerRate * way * dt,
  );
  d.you.a += Math.cos(d.you.heading) * d.you.speed * dt;
  d.you.s += Math.sin(d.you.heading) * d.you.speed * dt;
  d.you.depth = Math.max(0, Math.min(yourMaxDepth(g), d.you.depth + input.dive * UNDERWATER.diveSpeed * dt));
  // never on top of it (deep under it, it may pass over you): pushed back out the way you came
  const da = d.you.a - d.foe.a;
  const ds = d.you.s - d.foe.s;
  const dist = Math.hypot(da, ds);
  const apart = Math.abs(d.you.depth - d.foe.depth) < UNDERWATER.periscopeM * 2;
  if (apart && dist < DUEL.nearM) {
    const k = DUEL.nearM / Math.max(0.01, dist);
    d.you.a = d.foe.a + (dist > 0.01 ? da * k : -DUEL.nearM);
    d.you.s = d.foe.s + ds * k;
  }
}

function fireYours(g: GameState, d: DuelState, input: TurretInput, dt: number, out: DuelEvent[]): void {
  const at = turretPoint(d);
  const up = gunsUp(d);
  // the machine gun: while held, until it is too hot
  if (input.firing && !d.hot && d.weapon === 'mg' && up) {
    d.mgT -= dt;
    while (d.mgT <= 0) {
      fireRound(d, 'you', 'mg', at, d.yaw, d.pitch, MACHINE_GUN.spread, g.rng);
      out.push({ type: 'shot', kind: 'mg', p: at });
      d.mgT += 1 / MACHINE_GUN.rate;
      d.heat = Math.min(1, d.heat + MACHINE_GUN.heat);
      if (d.heat >= 1) d.hot = true;
    }
  } else {
    d.mgT = Math.max(0, d.mgT - dt);
    d.heat = Math.max(0, d.heat - MACHINE_GUN.cool * dt);
    if (d.hot && d.heat < MACHINE_GUN.restartBelow) d.hot = false;
  }
  d.gunReload = Math.max(0, d.gunReload - dt);
  const gun = shipModel(g.ship).weapons.find((w) => WEAPONS[w].kind === 'shell');
  if (input.gunShot && d.weapon === 'gun' && gun && up && d.gunReload <= 0 && g.company.yourDmg.jam <= 0) {
    fireRound(d, 'you', gun, at, d.yaw, d.pitch, WEAPONS[gun].spread ?? 0, g.rng);
    d.gunReload = WEAPONS[gun].reload;
    out.push({ type: 'shot', kind: gun, p: at });
  }
  // the guided torpedo, one at a time, from under your bow
  d.torpReload = Math.max(0, d.torpReload - dt);
  const hasTorpedo = shipModel(g.ship).weapons.includes('siluro');
  const running = d.torpedoes.some((t) => t.from === 'you');
  if (input.torpedo && hasTorpedo && !running && d.torpReload <= 0) {
    const p = {
      a: d.you.a + Math.cos(d.yaw) * 6,
      s: d.you.s + Math.sin(d.yaw) * 6,
      z: -(d.you.depth + TORPEDO_GUIDE.depthMin + 1),
    };
    launchTorpedo(d, 'you', p, d.yaw, Math.max(-0.4, Math.min(0.4, d.pitch)));
    d.torpReload = TORPEDO_GUIDE.reload;
    out.push({ type: 'shot', kind: 'siluro', p });
  }
}

/** One step of the duel; what happened, for the view and the sounds. */
export function stepDuel(g: GameState, d: DuelState, input: TurretInput, dt: number): DuelEvent[] {
  const out: DuelEvent[] = [];
  d.time += dt;
  const e = g.company.enemies.find((x) => x.id === d.foeId);
  const look = ENEMY_CLASSES[e?.cls ?? 'baleniera'].look;
  const foeHull = hullOf(look, d.foe.a, d.foe.s, d.foe.heading, d.foe.depth);
  // the rounds strike its 3D model, as you see it
  const ext = enemyExtent(e?.cls ?? 'baleniera', foeHull.length);
  Object.assign(foeHull, { deck: ext.top - d.foe.depth, keel: ext.draft + d.foe.depth, beam: ext.beam });
  const youHull = hullOf(g.ship.model, d.you.a, d.you.s, d.you.heading, d.you.depth);
  if (d.end || !e) {
    if (d.end) d.end.t += dt;
    if (e && e.sinkT > 0) e.sinkT += dt;
    stepRounds(d, foeHull, youHull, dt);
    stepUnder(d, foeHull, youHull, aimLine(d), dt);
    return out;
  }
  d.yaw += input.yaw;
  const under = !gunsUp(d);
  const lo = under ? UNDERWATER.pitchMin : TURRET.pitchMin;
  const hi = under ? UNDERWATER.pitchMax : TURRET.pitchMax;
  d.pitch = Math.max(lo, Math.min(hi, d.pitch + input.pitch));
  moveYou(g, d, input, dt);
  fireYours(g, d, input, dt, out);
  out.push(...stepFoe(g, d, e, dt));
  // the fires burn on both decks
  e.hull = Math.max(0, e.hull - stepDamage(e.dmg, dt));
  const burn = stepDamage(g.company.yourDmg, dt);
  if (burn > 0) damageShip(g.ship, burn, [], false);
  g.ship.fire = g.company.yourDmg.fire;
  const ends: EndEvent[] = [];
  for (const ev of stepRounds(d, foeHull, youHull, dt)) {
    out.push(ev);
    if (ev.type !== 'hit') continue;
    if (ev.target === 'foe') hitFoe(g, d, e, ev.kind, ev, ends);
    else roundHitsYou(g, d, ev.kind, ev.v, ends);
  }
  for (const ev of stepUnder(d, foeHull, youHull, aimLine(d), dt)) {
    out.push(ev);
    if (ev.type === 'torpHit' && ev.target === 'foe') hitFoe(g, d, e, 'torpedo', ev, ends);
    else if (ev.type === 'torpHit') hitYou(g, d, TORPEDO_GUIDE.damage, true, TORPEDO_GUIDE.flood, ends);
    else if (ev.type === 'chargeBurst' && ev.hit) hitYou(g, d, WEAPONS.carica.damage, true, 0, ends);
  }
  if (e.hull <= 0) sinkFoe(d, e, ends);
  out.push(...ends);
  return out;
}
