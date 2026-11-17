// The Compagnia dell'Olio Nero at sea, one step (owner, 17 novembre 2026; docs/PROPOSTA-COMPAGNIA.md): each vessel
// perceives your ship (detection.ts), sails (enemyAi.ts) and, hunting, shoots at it (enemyFire.ts); your weapons
// fire (yourFire.ts); battle stations (battle.ts); the shots fly and burst (ordnance.ts) and each hit strikes a
// part of the hull (hullDamage.ts). A vessel with no hull left, full of water or with its store blown up breaks in two
// and sinks. Only where there are vessels (the test arena for now). Pure logic.
import { BATTLE, ENEMY_CLASSES, HULLS_APART, SINKING, type WeaponId } from '../../data/company';
import { WORLD } from '../../data/worldLayout';
import { nightness } from '../dayNight';
import type { GameEvent } from '../events';
import type { InputState } from '../input';
import type { GameState } from '../newGame';
import { shipDraft, shipPoint } from '../ship/geometry';
import { damageShip } from '../ship/shipHull';
import { shipLength } from '../ship/model';
import { canArm, foeInReach, slowMotion, startBattle, stepBattle } from './battle';
import { perceive, stepAlert } from './detection';
import { sailEnemy } from './enemyAi';
import { enemyFires } from './enemyFire';
import { afloatEnemies, enemyPose, type EnemyVessel } from './enemyState';
import { applyHit, stepDamage, swamped, zoneOf } from './hullDamage';
import { hullBox, metresUnder, middle, quarryOf } from './hulls';
import { stepShots, type Hittable } from './ordnance';
import { fireGun, fireYourTorpedo } from './yourFire';

/** Your ship and a vessel at the same depth never sail through each other: they stop side by side. */
function keepApart(s: GameState['ship'], e: EnemyVessel): void {
  const near = Math.abs(s.dive - e.dive) < Math.max(shipDraft(s), shipDraft(enemyPose(e))) * 2;
  const gap = ((shipLength(s) + shipLength(enemyPose(e))) / 2) * HULLS_APART;
  const dx = e.x - s.x;
  if (!near || Math.abs(dx) >= gap) return;
  const side = Math.sign(dx) || 1;
  e.x = s.x + side * gap;
  e.speed = 0;
  if (s.face === side) s.speed = 0;
}

/** A vessel breaks in two and goes down. */
function sink(g: GameState, e: EnemyVessel, events: GameEvent[]): void {
  if (e.sinkT > 0) return;
  Object.assign(e, { sinkT: 0.001, speed: 0, hull: 0 });
  const at = middle(hullBox(enemyPose(e)));
  events.push({ type: 'enemySunk', ...at, name: ENEMY_CLASSES[e.cls].name });
  if (g.company.battle?.foe === e.id) slowMotion(g.company.battle);
}

/** A Compagnia vessel struck at `at`: the part it hits decides what it does. */
function hitEnemy(
  g: GameState,
  e: EnemyVessel,
  damage: number,
  at: { x: number; y: number },
  events: GameEvent[],
): void {
  if (e.sinkT > 0) return;
  const c = g.company;
  const pose = enemyPose(e);
  const mag = ENEMY_CLASSES[e.cls].magazine;
  // your first shot before it saw you
  const b = c.battle;
  const surprise = b?.foe === e.id && b.surprise ? BATTLE.surpriseMult : 1;
  if (b?.foe === e.id) b.surprise = false;
  const zone = zoneOf(at, WORLD.surfaceY + e.dive, shipPoint(pose, mag.u, mag.v));
  const taken = applyHit(e.dmg, zone, damage * surprise);
  e.hull = Math.max(0, e.hull - taken);
  events.push({ type: 'hullHit', side: 'enemy', zone, ...at });
  events.push({ type: 'enemyHit', ...at, left: e.hull, max: ENEMY_CLASSES[e.cls].hull });
  // struck, it knows where you are
  e.alert = 1;
  e.lastSeen = middle(hullBox(g.ship));
  if (e.hull <= 0 || swamped(e.dmg)) sink(g, e, events);
}

/** Your ship struck at `at`: a breach takes in water, the deck burns. */
function hitYou(g: GameState, damage: number, at: { x: number; y: number }, events: GameEvent[]): void {
  const s = g.ship;
  const d = g.company.yourDmg;
  const zone = zoneOf(at, WORLD.surfaceY + s.dive, null);
  const taken = applyHit(d, zone, damage);
  events.push({ type: 'hullHit', side: 'you', zone, ...at });
  damageShip(s, taken, events);
  s.flood = d.flood;
  if (swamped(d)) damageShip(s, s.hull, events);
}

/** Your weapons, and "Armi". */
function yourCommands(g: GameState, input: InputState, events: GameEvent[]): void {
  if (input.helmCmd === 'arm' && canArm(g)) startBattle(g, foeInReach(g)!, events);
  if (input.fireAngle !== null) fireGun(g, input.fireAngle, events);
  else if (input.helmCmd === 'fire') fireGun(g, null, events);
  if (input.helmCmd === 'torpedo') fireYourTorpedo(g, events);
}

/** One step of the Compagnia's vessels and the shots at sea; your weapons and battle stations. */
export function stepCompany(g: GameState, input: InputState, dt: number, events: GameEvent[]): void {
  const c = g.company;
  if (!c.enemies.length && !c.shots.length) {
    c.battle = null;
    return;
  }
  for (const k of Object.keys(c.yourReload) as WeaponId[])
    c.yourReload[k] = Math.max(0, (c.yourReload[k] ?? 0) - dt);
  const s = g.ship;
  const yourShipThere = s.owned && s.hull > 0;
  // your deck burning
  const burn = stepDamage(c.yourDmg, dt);
  if (burn > 0 && yourShipThere) damageShip(s, burn, events, false);
  s.fire = c.yourDmg.fire;
  if (s.aboard && yourShipThere) yourCommands(g, input, events);
  const night = nightness(g.day);
  const q = quarryOf(g);
  const foeId = c.battle && !c.battle.result ? c.battle.foe : -1;
  const standoff = (c.battle?.base ?? 0) * BATTLE.standoffShare;
  for (const e of c.enemies) {
    if (e.sinkT > 0) {
      e.sinkT += dt;
      continue;
    }
    for (const k of Object.keys(e.reload) as WeaponId[]) e.reload[k] = Math.max(0, (e.reload[k] ?? 0) - dt);
    e.hull = Math.max(0, e.hull - stepDamage(e.dmg, dt));
    if (e.hull <= 0) {
      sink(g, e, events);
      continue;
    }
    const at = middle(hullBox(enemyPose(e)));
    const halfM = shipLength(enemyPose(e)) / 2 / WORLD.unitsPerMetre;
    const p = yourShipThere
      ? perceive(ENEMY_CLASSES[e.cls], { ...at, depthM: metresUnder(at.y), halfM }, q, night)
      : 0;
    const phase = stepAlert(e, p, q, dt);
    if (phase) events.push({ type: 'enemyAlert', phase, ...at });
    const duel = e.id === foeId && e.phase === 'hunting' ? { standoff, rng: g.rng } : null;
    sailEnemy(e, q, dt, duel);
    if (e.phase === 'hunting' && yourShipThere) enemyFires(g, e, q, dt, events);
  }
  c.enemies = c.enemies.filter((e) => e.sinkT < SINKING.seconds);
  if (yourShipThere) for (const e of afloatEnemies(c)) keepApart(s, e);
  const targets: Hittable[] = afloatEnemies(c).map((e) => ({
    side: 'enemy',
    box: hullBox(enemyPose(e)),
    hit: (damage, at) => hitEnemy(g, e, damage, at, events),
  }));
  if (yourShipThere)
    targets.push({ side: 'you', box: hullBox(s), hit: (dmg, at) => hitYou(g, dmg, at, events) });
  stepShots(c, targets, dt, events);
  stepBattle(g, dt, events);
}
