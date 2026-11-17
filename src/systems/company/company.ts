// The Compagnia dell'Olio Nero at sea, one step (owner, 17 novembre 2026; docs/PROPOSTA-COMPAGNIA.md): each vessel
// perceives your ship (detection.ts), sails (enemyAi.ts) and, hunting, shoots at it; your weapons fire at the
// nearest in reach; the shots fly and burst (ordnance.ts). A vessel with no hull left breaks in two and sinks.
// Only where there are vessels (the test arena for now). Pure logic.
import { DETECTION, ENEMY_CLASSES, HULLS_APART, SINKING, WEAPONS, type WeaponId } from '../../data/company';
import { WORLD } from '../../data/worldLayout';
import { nightness } from '../dayNight';
import type { GameEvent } from '../events';
import type { InputState } from '../input';
import type { GameState } from '../newGame';
import { shipDraft, shipPoint } from '../ship/geometry';
import { damageShip } from '../ship/shipHull';
import { shipLength, shipModel, shipPicture, shipTopSpeed } from '../ship/model';
import { perceive, stepAlert, type Quarry } from './detection';
import { sailEnemy } from './enemyAi';
import { afloatEnemies, enemyPose, metres, type EnemyVessel } from './enemyState';
import { dropCharge, fireShell, fireTorpedo, stepShots, type Hittable } from './ordnance';

type Pose = { x: number; face: 1 | -1; dive?: number; model: string };

/** A hull's box in the world: deck to keel, nearly stern to bow. */
export function hullBox(p: Pose): Hittable['box'] {
  const a = shipPoint(p, 0.06, shipPicture(p).deckY);
  const b = shipPoint(p, 0.94, 0);
  return {
    x0: Math.min(a.x, b.x),
    x1: Math.max(a.x, b.x),
    y0: a.y,
    y1: WORLD.surfaceY + (p.dive ?? 0) + shipDraft(p),
  };
}

const middle = (b: Hittable['box']): { x: number; y: number } => ({
  x: (b.x0 + b.x1) / 2,
  y: (b.y0 + b.y1) / 2,
});
const metresUnder = (y: number): number => Math.max(0, (y - WORLD.surfaceY) / WORLD.unitsPerMetre);

/** Your ship as the Compagnia perceives it. */
export function quarryOf(g: GameState): Quarry {
  const s = g.ship;
  const night = nightness(g.day);
  const box = hullBox(s);
  return {
    ...middle(box),
    depthM: metresUnder(WORLD.surfaceY + s.dive),
    speedShare: Math.min(1, s.speed / Math.max(1, shipTopSpeed(s))),
    engineOn: s.engineOn,
    silent: !!s.silent,
    // by night its deck lights and headlight shine; the light under the hull always does
    lightsOn: !s.silent && (s.lightOn || night > 0.2),
    halfM: shipModel(s).lengthM / 2,
  };
}

/** Your weapon of this kind ready, at the nearest vessel in reach; an event either way. */
function fireYours(g: GameState, kind: 'shell' | 'torpedo', events: GameEvent[]): void {
  const c = g.company;
  const s = g.ship;
  const weapon = shipModel(s).weapons.find((w) => WEAPONS[w].kind === kind);
  if (!weapon || (c.yourReload[weapon] ?? 0) > 0) return;
  const w = WEAPONS[weapon];
  const pic = shipPicture(s);
  const from =
    kind === 'shell'
      ? shipPoint(s, 0.75, pic.deckY)
      : shipPoint(s, pic.lamp.u, Math.min(pic.keel, pic.waterline + 0.08));
  const reach = (e: EnemyVessel): boolean =>
    Math.abs(e.x - s.x) <= metres(w.rangeM) &&
    (kind === 'torpedo' ? (e.x - s.x) * s.face > 0 : e.dive < metres(DETECTION.periscopeM));
  const target = afloatEnemies(c)
    .filter(reach)
    .sort((a, b) => Math.abs(a.x - s.x) - Math.abs(b.x - s.x))[0];
  if (!target) {
    events.push({ type: 'noTarget', weapon });
    return;
  }
  const aim = middle(hullBox(enemyPose(target)));
  if (kind === 'shell' && !fireShell(c, weapon, 'you', from, aim, () => 0.5)) {
    events.push({ type: 'noTarget', weapon });
    return;
  }
  if (kind === 'torpedo') fireTorpedo(c, 'you', from, aim, s.face);
  c.yourReload[weapon] = w.reload;
  events.push({ type: 'shotFired', from: 'you', weapon, ...from });
}

/** A hunting vessel's weapons at you, each when ready and in reach. */
function enemyFires(g: GameState, e: EnemyVessel, q: Quarry, events: GameEvent[]): void {
  const c = g.company;
  const pose = enemyPose(e);
  const pic = shipPicture(pose);
  const dx = q.x - e.x;
  for (const weapon of ENEMY_CLASSES[e.cls].weapons) {
    if ((e.reload[weapon] ?? 0) > 0) continue;
    const w = WEAPONS[weapon];
    if (Math.abs(dx) > metres(w.rangeM)) continue;
    let fired = false;
    const at = (u: number, v: number): { x: number; y: number } => shipPoint(pose, u, v);
    if (w.kind === 'shell' && q.depthM <= DETECTION.periscopeM && e.dive < metres(DETECTION.periscopeM))
      fired = fireShell(c, weapon, 'enemy', at(0.7, pic.deckY), q, g.rng);
    else if (w.kind === 'torpedo' && dx * e.face > 0) {
      fireTorpedo(c, 'enemy', at(pic.lamp.u, pic.waterline + 0.05), q, e.face);
      fired = true;
    } else if (
      w.kind === 'charge' &&
      q.depthM > DETECTION.periscopeM &&
      Math.abs(dx) < metres(w.blastM * 2)
    ) {
      dropCharge(c, 'enemy', at(0.1, pic.waterline), q.y);
      fired = true;
    }
    if (!fired) continue;
    e.reload[weapon] = w.reload * ENEMY_CLASSES[e.cls].reloadMult;
    events.push({ type: 'shotFired', from: 'enemy', weapon, ...at(0.7, pic.deckY) });
  }
}

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

/** One step of the Compagnia's vessels and the shots at sea; your fire buttons. */
export function stepCompany(g: GameState, input: InputState, dt: number, events: GameEvent[]): void {
  const c = g.company;
  if (!c.enemies.length && !c.shots.length) return;
  for (const k of Object.keys(c.yourReload) as WeaponId[])
    c.yourReload[k] = Math.max(0, (c.yourReload[k] ?? 0) - dt);
  if (g.ship.owned && g.ship.aboard && g.ship.hull > 0) {
    if (input.helmCmd === 'fire') fireYours(g, 'shell', events);
    if (input.helmCmd === 'torpedo') fireYours(g, 'torpedo', events);
  }
  const night = nightness(g.day);
  const q = quarryOf(g);
  const yourShipThere = g.ship.owned && g.ship.hull > 0;
  for (const e of c.enemies) {
    if (e.sinkT > 0) {
      e.sinkT += dt;
      continue;
    }
    for (const k of Object.keys(e.reload) as WeaponId[]) e.reload[k] = Math.max(0, (e.reload[k] ?? 0) - dt);
    const at = middle(hullBox(enemyPose(e)));
    const halfM = shipLength(enemyPose(e)) / 2 / WORLD.unitsPerMetre;
    const p = yourShipThere
      ? perceive(ENEMY_CLASSES[e.cls], { ...at, depthM: metresUnder(at.y), halfM }, q, night)
      : 0;
    const phase = stepAlert(e, p, q, dt);
    if (phase) events.push({ type: 'enemyAlert', phase, ...at });
    sailEnemy(e, q, dt);
    if (e.phase === 'hunting' && yourShipThere) enemyFires(g, e, q, events);
  }
  c.enemies = c.enemies.filter((e) => e.sinkT < SINKING.seconds);
  if (yourShipThere) for (const e of afloatEnemies(c)) keepApart(g.ship, e);
  const targets: Hittable[] = afloatEnemies(c).map((e) => ({
    side: 'enemy',
    box: hullBox(enemyPose(e)),
    hit: (damage) => {
      if (e.sinkT > 0) return;
      e.hull = Math.max(0, e.hull - damage);
      const at = middle(hullBox(enemyPose(e)));
      events.push({ type: 'enemyHit', ...at, left: e.hull, max: ENEMY_CLASSES[e.cls].hull });
      // struck, it knows where you are
      e.alert = 1;
      e.lastSeen = { x: q.x, y: q.y };
      if (e.hull <= 0) {
        Object.assign(e, { sinkT: 0.001, speed: 0 });
        events.push({ type: 'enemySunk', ...at, name: ENEMY_CLASSES[e.cls].name });
      }
    },
  }));
  if (yourShipThere)
    targets.push({ side: 'you', box: hullBox(g.ship), hit: (dmg) => damageShip(g.ship, dmg, events) });
  stepShots(c, targets, dt, events);
}
