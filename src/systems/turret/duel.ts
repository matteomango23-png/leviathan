// One step of the turret's duel (owner, 17 novembre 2026): your ship sails at the throttle and closes or opens the
// distance; the turret turns where you drag; the machine gun fires while held (and heats up), the gun fires one shell
// at a time; the vessel answers (duelAi.ts); the rounds strike hulls or the sea (ballistics.ts) and each hit strikes
// a part of the hull as in the side battle (company/hullDamage.ts). It opens from the world and gives it back.
// Pure logic.
import { ENEMY_CLASSES, HIT_ZONES, WEAPONS, type WeaponId } from '../../data/company';
import { DUEL, MACHINE_GUN, TURRET } from '../../data/turret';
import { WORLD } from '../../data/worldLayout';
import { applyHit, floodSpeed, stepDamage, swamped, zoneOf } from '../company/hullDamage';
import type { EnemyVessel } from '../company/enemyState';
import type { GameState } from '../newGame';
import { damageShip } from '../ship/shipHull';
import { shipModel, shipPicture, shipRates, shipTopSpeed } from '../ship/model';
import type { DuelHull, RoundEvent } from './ballistics';
import { fireRound, stepRounds } from './ballistics';
import { stepFoe, type FoeEvent } from './duelAi';
import { newDuel, toUnits, type DuelState } from './duelState';

/** What you do in the turret this frame (ui/turretControls.ts, the keyboard). */
export interface TurretInput {
  /** 0 … 1 of your top speed. */
  throttle: number;
  /** −1 open the distance … 1 close it. */
  side: number;
  /** Radians to turn the turret this frame (dragged). */
  yaw: number;
  pitch: number;
  firing: boolean;
  /** The gun's button pressed this frame. */
  gunShot: boolean;
}

export const restingInput = (): TurretInput => ({
  throttle: 0,
  side: 0,
  yaw: 0,
  pitch: 0,
  firing: false,
  gunShot: false,
});

export type DuelEvent =
  | RoundEvent
  | FoeEvent
  | { type: 'shot'; kind: 'mg' | WeaponId; p: { a: number; s: number; z: number } }
  | { type: 'zone'; target: 'foe' | 'you'; zone: 'deck' | 'waterline' | 'magazine' }
  | { type: 'end'; result: 'victory' | 'lost' };

/** Its hull for the rounds, from the picture it borrows. */
export function hullOf(model: string, a: number, s: number, heading: number): DuelHull {
  const m = shipModel({ model });
  const pic = shipPicture({ model });
  const H = m.lengthM * pic.aspect;
  return {
    a,
    s,
    heading,
    length: m.lengthM * 0.9,
    beam: m.lengthM * 0.16,
    keel: (pic.keel - pic.waterline) * H,
    // its superstructure counts: most of the picture above the water
    deck: pic.waterline * H * 0.85,
    waterline: pic.waterline,
    picH: H,
  };
}

/** The duel with this vessel, from where both are on the sea's line. */
export function openDuel(g: GameState, e: EnemyVessel): DuelState {
  const s = g.ship;
  const along = ((e.x - s.x) * s.face) / WORLD.unitsPerMetre;
  const d = newDuel(e.id, along, e.speed / WORLD.unitsPerMetre, e.face !== s.face);
  d.you.speed = s.speed / WORLD.unitsPerMetre;
  return d;
}

/** Back to the sea's line: your ship's travel, the vessel's place and way. */
export function closeDuel(g: GameState, d: DuelState): void {
  const s = g.ship;
  const e = g.company.enemies.find((x) => x.id === d.foeId);
  s.x += s.face * toUnits(d.you.a - d.startA);
  s.speed = toUnits(d.you.speed);
  if (e) {
    e.x = s.x + s.face * toUnits(d.foe.a - d.you.a);
    e.face = Math.cos(d.foe.heading) >= 0 ? s.face : (-s.face as 1 | -1);
    e.speed = toUnits(Math.abs(d.foe.speed));
  }
  g.company.battle = null;
}

/** Where the rounds leave: the barrels' ends, ahead of the turret where you sit (m). */
export function turretPoint(d: DuelState): { a: number; s: number; z: number } {
  const reach = 3; // the barrels' ends, ahead of your eye (m)
  return {
    a: d.you.a + Math.cos(d.yaw) * reach,
    s: d.you.s + Math.sin(d.yaw) * reach,
    z: TURRET.height - 1.2,
  };
}

function moveYou(g: GameState, d: DuelState, input: TurretInput, dt: number): void {
  const U = WORLD.unitsPerMetre;
  const top = (shipTopSpeed(g.ship) / U) * floodSpeed(g.company.yourDmg);
  const want = top * Math.max(0, Math.min(1, input.throttle));
  const accel = (shipRates(g.ship).accel / U) * dt;
  d.you.speed += Math.max(-accel, Math.min(accel, want - d.you.speed));
  d.you.a += d.you.speed * dt;
  d.you.s += input.side * DUEL.sideSpeed * Math.sign(d.foe.s - d.you.s || 1) * dt;
  // never on top of it
  const ds = d.foe.s - d.you.s;
  if (Math.hypot(d.foe.a - d.you.a, ds) < DUEL.nearM) d.you.s = d.foe.s - Math.sign(ds || 1) * DUEL.nearM;
}

function fireYours(g: GameState, d: DuelState, input: TurretInput, dt: number, out: DuelEvent[]): void {
  const at = turretPoint(d);
  // the machine gun: while held, until it is too hot
  if (input.firing && !d.hot && d.weapon === 'mg') {
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
  if (input.gunShot && d.weapon === 'gun' && gun && d.gunReload <= 0 && g.company.yourDmg.jam <= 0) {
    fireRound(d, 'you', gun, at, d.yaw, d.pitch, WEAPONS[gun].spread ?? 0, g.rng);
    d.gunReload = WEAPONS[gun].reload;
    out.push({ type: 'shot', kind: gun, p: at });
  }
}

/** A round struck the vessel at this picture point. */
function hitFoe(
  g: GameState,
  d: DuelState,
  e: EnemyVessel,
  ev: Extract<RoundEvent, { type: 'hit' }>,
  out: DuelEvent[],
): void {
  const pose = { model: ENEMY_CLASSES[e.cls].look };
  const m = shipModel(pose);
  const pic = shipPicture(pose);
  const L = toUnits(m.lengthM);
  const H = toUnits(m.lengthM * pic.aspect);
  const mag = ENEMY_CLASSES[e.cls].magazine;
  const at = { x: ev.u * L, y: ev.v * H };
  let zone = zoneOf(at, pic.waterline * H, { x: mag.u * L, y: mag.v * H });
  let taken: number;
  if (ev.kind === 'mg') {
    // the machine gun scars and sometimes sets the deck alight, but never breaches the hull nor blows the store
    zone = 'deck';
    taken = MACHINE_GUN.damage;
    if (g.rng() < MACHINE_GUN.fireChance) e.dmg.fire = Math.max(e.dmg.fire, HIT_ZONES.deck.fireSeconds);
  } else taken = applyHit(e.dmg, zone, WEAPONS[ev.kind].damage);
  e.hull = Math.max(0, e.hull - taken);
  e.alert = 1;
  if (ev.kind !== 'mg') out.push({ type: 'zone', target: 'foe', zone });
  if ((e.hull <= 0 || swamped(e.dmg)) && !d.end) {
    Object.assign(e, { sinkT: 0.001, speed: 0, hull: 0 });
    d.end = { result: 'victory', t: 0 };
    out.push({ type: 'end', result: 'victory' });
  }
}

/** A round struck your ship. */
function hitYou(
  g: GameState,
  d: DuelState,
  ev: Extract<RoundEvent, { type: 'hit' }>,
  out: DuelEvent[],
): void {
  const pic = shipPicture(g.ship);
  const zone =
    ev.v >= pic.waterline - HIT_ZONES.waterline.bandM / (shipModel(g.ship).lengthM * pic.aspect)
      ? 'waterline'
      : 'deck';
  const dmg = ev.kind === 'mg' ? MACHINE_GUN.damage : WEAPONS[ev.kind].damage;
  const taken = applyHit(g.company.yourDmg, zone, dmg);
  damageShip(g.ship, taken, [], false);
  g.ship.flood = g.company.yourDmg.flood;
  out.push({ type: 'zone', target: 'you', zone });
  if ((g.ship.hull <= 0 || swamped(g.company.yourDmg)) && !d.end) {
    g.ship.hull = 0;
    d.end = { result: 'lost', t: 0 };
    out.push({ type: 'end', result: 'lost' });
  }
}

/** One step of the duel; what happened, for the view and the sounds. */
export function stepDuel(g: GameState, d: DuelState, input: TurretInput, dt: number): DuelEvent[] {
  const out: DuelEvent[] = [];
  d.time += dt;
  const e = g.company.enemies.find((x) => x.id === d.foeId);
  if (d.end || !e) {
    if (d.end) d.end.t += dt;
    if (e && e.sinkT > 0) e.sinkT += dt;
    stepRounds(
      d,
      hullOf(ENEMY_CLASSES[e?.cls ?? 'baleniera'].look, d.foe.a, d.foe.s, d.foe.heading),
      hullOf(g.ship.model, d.you.a, d.you.s, 0),
      dt,
    );
    return out;
  }
  d.yaw += input.yaw;
  d.pitch = Math.max(TURRET.pitchMin, Math.min(TURRET.pitchMax, d.pitch + input.pitch));
  moveYou(g, d, input, dt);
  fireYours(g, d, input, dt, out);
  out.push(...stepFoe(g, d, e, dt));
  // the fires burn on both decks
  e.hull = Math.max(0, e.hull - stepDamage(e.dmg, dt));
  const burn = stepDamage(g.company.yourDmg, dt);
  if (burn > 0) damageShip(g.ship, burn, [], false);
  g.ship.fire = g.company.yourDmg.fire;
  const foeHull = hullOf(ENEMY_CLASSES[e.cls].look, d.foe.a, d.foe.s, d.foe.heading);
  for (const ev of stepRounds(d, foeHull, hullOf(g.ship.model, d.you.a, d.you.s, 0), dt)) {
    out.push(ev);
    if (ev.type !== 'hit') continue;
    if (ev.target === 'foe') hitFoe(g, d, e, ev, out);
    else hitYou(g, d, ev, out);
  }
  if (e.hull <= 0 && !d.end) {
    Object.assign(e, { sinkT: 0.001, speed: 0 });
    d.end = { result: 'victory', t: 0 };
    out.push({ type: 'end', result: 'victory' });
  }
  return out;
}
