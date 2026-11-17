// One step of the inside view (owner, 17 novembre 2026): your ship sails where its bow points at the throttle, the
// bow following the crosshair under way, and a U-Boat dives; the turret turns where you drag. An armed ship fires: above the water the
// machine gun while held (it heats up) and its gun, under the water the harpoon gun; the guided torpedo at any depth,
// reloaded sooner under the water. Every Compagnia vessel in the view perceives, sails and fights (foeAi.ts); what
// flies (ballistics.ts, torpedo.ts, darts.ts) strikes hulls (insideHits.ts). Pure logic.
import { ENEMY_CLASSES, WEAPONS, type WeaponId } from '../../data/company';
import { DUEL, HARPOON_GUN, MACHINE_GUN, TORPEDO_GUIDE, TURRET, UNDERWATER } from '../../data/turret';
import { WORLD } from '../../data/worldLayout';
import { stepDamage } from '../company/hullDamage';
import type { EnemyVessel } from '../company/enemyState';
import type { GameState } from '../newGame';
import { shipModel, shipPicture, shipRates } from '../ship/model';
import type { DuelHull, RoundEvent } from './ballistics';
import { fireRound, stepRounds } from './ballistics';
import { fireDart, stepDarts, yourWay, type DartEvent } from './darts';
import { stepFoe, yourTop, type FoeEvent } from './foeAi';
import { enemyExtent } from './hullModels';
import { hitFoe, hitYou, roundHitsYou, sinkFoe, type HitEvent } from './insideHits';
import type { FoeInView, InsideState } from './insideState';
import { launchTorpedo, stepUnder, type UnderEvent } from './torpedo';
import { wrapAngle, type P3 } from './projection';

/** What you do in the view this frame (ui/turretControls.ts, the keyboard). */
export interface TurretInput {
  /** −DUEL.reverse … 1 of your top speed (backwards < 0). */
  throttle: number;
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
  dive: 0,
  yaw: 0,
  pitch: 0,
  firing: false,
  gunShot: false,
  torpedo: false,
});

export type InsideEvent =
  | RoundEvent
  | FoeEvent
  | UnderEvent
  | DartEvent
  | HitEvent
  | { type: 'shot'; kind: 'mg' | 'dart' | WeaponId; p: P3 };

/** A hull for what flies, from the picture it borrows, its waterline `depth` metres under the surface. */
export function hullOf(
  model: string,
  a: number,
  s: number,
  heading: number,
  depth = 0,
  id: DuelHull['id'] = 'you',
): DuelHull {
  const m = shipModel({ model });
  const pic = shipPicture({ model });
  const H = m.lengthM * pic.aspect;
  return {
    id,
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

/** A vessel's hull: the rounds strike its 3D model, as you see it. */
export function foeHull(f: FoeInView, e: EnemyVessel): DuelHull {
  const h = hullOf(ENEMY_CLASSES[e.cls].look, f.a, f.s, f.heading, f.depth, f.id);
  const ext = enemyExtent(e.cls, h.length);
  return { ...h, deck: ext.top - f.depth, keel: ext.draft + f.depth, beam: ext.beam };
}

/** Your ship can dive in the view (a U-Boat), and how deep. */
export const yourMaxDepth = (g: GameState): number =>
  Math.min(UNDERWATER.maxDepthM, shipModel(g.ship).dive?.maxDepthM ?? 0);

/** Your ship carries weapons: the turret's guns (a boat with none only sails). */
export const armed = (g: GameState): boolean => shipModel(g.ship).weapons.length > 0;

/** How high the turret's eye is (m above the surface; under it < 0): the U-Boat's periscope, then under. */
export function eyeHeight(d: InsideState): number {
  const k = Math.min(1, d.you.depth / UNDERWATER.periscopeM);
  return TURRET.height + (-d.you.depth - TURRET.height) * k;
}

/** The turret's aim as a line from your eye: the guided torpedo keeps to it. */
const aimLine = (d: InsideState): { yaw: number; pitch: number; from: P3 } => ({
  yaw: d.yaw,
  pitch: d.pitch,
  from: { a: d.you.a, s: d.you.s, z: eyeHeight(d) },
});

/** The guns work only with the turret's eye above the water (under it, the harpoon gun). */
export const gunsUp = (d: InsideState): boolean => d.you.depth < UNDERWATER.periscopeM;

/** Where the rounds leave: the barrels' ends, ahead of your eye (m). */
export function turretPoint(d: InsideState): P3 {
  const reach = 3;
  return {
    a: d.you.a + Math.cos(d.yaw) * reach,
    s: d.you.s + Math.sin(d.yaw) * reach,
    z: eyeHeight(d) - 1.2,
  };
}

function moveYou(g: GameState, d: InsideState, input: TurretInput, dt: number): void {
  const U = WORLD.unitsPerMetre;
  const want = yourTop(g) * Math.max(-DUEL.reverse, Math.min(1, input.throttle));
  const accel = (shipRates(g.ship).accel / U) * dt;
  d.you.speed += Math.max(-accel, Math.min(accel, want - d.you.speed));
  // under way the bow turns towards the crosshair (owner: "la nave dovrebbe seguire dove punto il mirino"); still,
  // it does not: you look round freely. Going astern it backs the other way, its bow still towards the crosshair.
  if (Math.abs(d.you.speed) >= DUEL.followMinSpeed) {
    const way = Math.min(1, Math.abs(d.you.speed) / Math.max(1, yourTop(g) * 0.4));
    const most = DUEL.steerRate * way * dt;
    d.you.heading = wrapAngle(
      d.you.heading + Math.max(-most, Math.min(most, wrapAngle(d.yaw - d.you.heading))),
    );
  }
  d.you.a += Math.cos(d.you.heading) * d.you.speed * dt;
  d.you.s += Math.sin(d.you.heading) * d.you.speed * dt;
  d.you.depth = Math.max(0, Math.min(yourMaxDepth(g), d.you.depth + input.dive * UNDERWATER.diveSpeed * dt));
  // never on top of a vessel at your depth (deep under it, it may pass over you): pushed back out
  for (const f of d.foes) {
    if (Math.abs(d.you.depth - f.depth) >= UNDERWATER.periscopeM * 2) continue;
    const da = d.you.a - f.a;
    const ds = d.you.s - f.s;
    const dist = Math.hypot(da, ds);
    if (dist >= DUEL.nearM) continue;
    const k = DUEL.nearM / Math.max(0.01, dist);
    d.you.a = f.a + (dist > 0.01 ? da * k : -DUEL.nearM);
    d.you.s = f.s + ds * k;
  }
}

/** The machine gun above the water, the harpoon gun under it: while held, until too hot. */
function fireRapid(g: GameState, d: InsideState, input: TurretInput, dt: number, out: InsideEvent[]): void {
  const up = gunsUp(d);
  const H = up ? MACHINE_GUN : HARPOON_GUN;
  if (input.firing && !d.hot && d.weapon === 'mg' && armed(g)) {
    const at = up ? turretPoint(d) : aimLine(d).from;
    d.mgT -= dt;
    while (d.mgT <= 0) {
      // carried by your ship's way: from aboard the tracers fly straight where you aim
      if (up) fireRound(d, 'you', 'mg', at, d.yaw, d.pitch, MACHINE_GUN.spread, g.rng, yourWay(d));
      else fireDart(d, at, d.yaw, d.pitch, g.rng);
      out.push({ type: 'shot', kind: up ? 'mg' : 'dart', p: at });
      d.mgT += 1 / H.rate;
      d.heat = Math.min(1, d.heat + H.heat);
      if (d.heat >= 1) d.hot = true;
    }
  } else {
    d.mgT = Math.max(0, d.mgT - dt);
    d.heat = Math.max(0, d.heat - H.cool * dt);
    if (d.hot && d.heat < H.restartBelow) d.hot = false;
  }
}

function fireYours(g: GameState, d: InsideState, input: TurretInput, dt: number, out: InsideEvent[]): void {
  fireRapid(g, d, input, dt, out);
  const at = turretPoint(d);
  d.gunReload = Math.max(0, d.gunReload - dt);
  const gun = shipModel(g.ship).weapons.find((w) => WEAPONS[w].kind === 'shell');
  if (
    input.gunShot &&
    d.weapon === 'gun' &&
    gun &&
    gunsUp(d) &&
    d.gunReload <= 0 &&
    g.company.yourDmg.jam <= 0
  ) {
    fireRound(d, 'you', gun, at, d.yaw, d.pitch, WEAPONS[gun].spread ?? 0, g.rng);
    d.gunReload = WEAPONS[gun].reload;
    out.push({ type: 'shot', kind: gun, p: at });
  }
  // the guided torpedo, one at a time, from under your bow; under the water the tube is reloaded sooner
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
    d.torpReload = gunsUp(d) ? TORPEDO_GUIDE.reload : TORPEDO_GUIDE.underReload;
    out.push({ type: 'shot', kind: 'siluro', p });
  }
}

/** One step of the inside view; what happened, for the view and the sounds. */
export function stepInside(g: GameState, d: InsideState, input: TurretInput, dt: number): InsideEvent[] {
  const out: InsideEvent[] = [];
  d.time += dt;
  if (d.lost !== null) d.lost += dt;
  const vessel = (id: number): EnemyVessel | undefined => g.company.enemies.find((x) => x.id === id);
  // the vessels gone from the world (sunk long enough) leave the view
  d.foes = d.foes.filter((f) => vessel(f.id));
  const afloat = d.foes.filter((f) => vessel(f.id)!.sinkT <= 0);
  const hulls = afloat.map((f) => foeHull(f, vessel(f.id)!));
  const you = hullOf(g.ship.model, d.you.a, d.you.s, d.you.heading, d.you.depth);
  const hits: HitEvent[] = [];
  if (d.lost === null) {
    d.yaw += input.yaw;
    const under = !gunsUp(d);
    const lo = under ? UNDERWATER.pitchMin : TURRET.pitchMin;
    const hi = under ? UNDERWATER.pitchMax : TURRET.pitchMax;
    d.pitch = Math.max(lo, Math.min(hi, d.pitch + input.pitch));
    moveYou(g, d, input, dt);
    fireYours(g, d, input, dt, out);
  }
  for (const f of afloat) {
    const e = vessel(f.id)!;
    out.push(...stepFoe(g, d, f, e, dt));
    // the fires burn on its deck (the world leaves the vessels in here to the view)
    e.hull = Math.max(0, e.hull - stepDamage(e.dmg, dt));
  }
  for (const ev of stepRounds(d, hulls, you, dt)) {
    out.push(ev);
    if (ev.type !== 'hit') continue;
    if (ev.target === 'foe') hitFoe(g, vessel(ev.foe)!, ev.kind, ev, hits);
    else roundHitsYou(g, d, ev.kind, ev.v, hits);
  }
  for (const ev of stepDarts(d, hulls, dt)) {
    out.push(ev);
    hitFoe(g, vessel(ev.foe)!, 'dart', ev, hits);
  }
  for (const ev of stepUnder(d, hulls, you, aimLine(d), dt)) {
    out.push(ev);
    if (ev.type === 'torpHit' && ev.target === 'foe') hitFoe(g, vessel(ev.foe)!, 'torpedo', ev, hits);
    else if (ev.type === 'torpHit') hitYou(g, d, TORPEDO_GUIDE.damage, true, TORPEDO_GUIDE.flood, hits);
    else if (ev.type === 'chargeBurst' && ev.hit) hitYou(g, d, WEAPONS.carica.damage, true, 0, hits);
  }
  for (const f of afloat) {
    const e = vessel(f.id)!;
    if (e.hull <= 0) sinkFoe(e, hits);
  }
  out.push(...hits);
  return out;
}
