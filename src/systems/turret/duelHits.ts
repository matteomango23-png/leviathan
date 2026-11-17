// What a hit does in the turret's duel (split from duel.ts, 17 novembre 2026): a round, a torpedo or a depth charge
// strikes a part of the hull as in the side battle (company/hullDamage.ts) — the machine gun only scars the deck and
// sometimes sets it alight, a torpedo opens a great breach — and a hull with nothing left, full of water or with its
// store blown up ends the duel. Pure logic.
import { ENEMY_CLASSES, HIT_ZONES, WEAPONS } from '../../data/company';
import { MACHINE_GUN, TORPEDO_GUIDE } from '../../data/turret';
import { applyHit, swamped, zoneOf } from '../company/hullDamage';
import type { EnemyVessel } from '../company/enemyState';
import type { GameState } from '../newGame';
import { damageShip } from '../ship/shipHull';
import { shipModel, shipPicture } from '../ship/model';
import type { Round } from './duelState';
import { toUnits, type DuelState } from './duelState';

export type HitZone = 'deck' | 'waterline' | 'magazine';
export type EndEvent =
  { type: 'zone'; target: 'foe' | 'you'; zone: HitZone } | { type: 'end'; result: 'victory' | 'lost' };

/** The vessel sinks: the duel is won. */
export function sinkFoe(d: DuelState, e: EnemyVessel, out: EndEvent[]): void {
  if (d.end) return;
  Object.assign(e, { sinkT: 0.001, speed: 0, hull: 0 });
  d.end = { result: 'victory', t: 0 };
  out.push({ type: 'end', result: 'victory' });
}

/** The vessel struck at this point of its picture by a round of this kind, or a torpedo. */
export function hitFoe(
  g: GameState,
  d: DuelState,
  e: EnemyVessel,
  kind: Round['kind'] | 'torpedo',
  at: { u: number; v: number },
  out: EndEvent[],
): void {
  const pose = { model: ENEMY_CLASSES[e.cls].look };
  const m = shipModel(pose);
  const pic = shipPicture(pose);
  const L = toUnits(m.lengthM);
  const H = toUnits(m.lengthM * pic.aspect);
  const mag = ENEMY_CLASSES[e.cls].magazine;
  let zone = zoneOf({ x: at.u * L, y: at.v * H }, pic.waterline * H, { x: mag.u * L, y: mag.v * H });
  let taken: number;
  if (kind === 'mg') {
    // the machine gun scars and sometimes sets the deck alight, but never breaches the hull nor blows the store
    zone = 'deck';
    taken = MACHINE_GUN.damage;
    if (g.rng() < MACHINE_GUN.fireChance) e.dmg.fire = Math.max(e.dmg.fire, HIT_ZONES.deck.fireSeconds);
  } else if (kind === 'torpedo') {
    // a great breach under the water
    zone = zone === 'magazine' ? 'magazine' : 'waterline';
    e.dmg.flood = Math.min(1, e.dmg.flood + TORPEDO_GUIDE.flood);
    taken = zone === 'magazine' ? Infinity : TORPEDO_GUIDE.damage;
  } else taken = applyHit(e.dmg, zone, WEAPONS[kind].damage);
  e.hull = Math.max(0, e.hull - taken);
  e.alert = 1;
  if (kind !== 'mg') out.push({ type: 'zone', target: 'foe', zone });
  if (e.hull <= 0 || swamped(e.dmg)) sinkFoe(d, e, out);
}

/** Your ship struck: `under` a breach (torpedo, charge, a shell at the waterline), else the deck. */
export function hitYou(
  g: GameState,
  d: DuelState,
  damage: number,
  under: boolean,
  flood: number,
  out: EndEvent[],
): void {
  const zone: HitZone = under ? 'waterline' : 'deck';
  const taken = flood > 0 ? damage : applyHit(g.company.yourDmg, zone, damage);
  if (flood > 0) g.company.yourDmg.flood = Math.min(1, g.company.yourDmg.flood + flood);
  damageShip(g.ship, taken, [], false);
  g.ship.flood = g.company.yourDmg.flood;
  out.push({ type: 'zone', target: 'you', zone });
  if ((g.ship.hull <= 0 || swamped(g.company.yourDmg)) && !d.end) {
    g.ship.hull = 0;
    d.end = { result: 'lost', t: 0 };
    out.push({ type: 'end', result: 'lost' });
  }
}

/** A round of the enemy's struck your ship at this point of its picture. */
export function roundHitsYou(
  g: GameState,
  d: DuelState,
  kind: Round['kind'],
  v: number,
  out: EndEvent[],
): void {
  const pic = shipPicture(g.ship);
  const band = HIT_ZONES.waterline.bandM / (shipModel(g.ship).lengthM * pic.aspect);
  hitYou(g, d, kind === 'mg' ? MACHINE_GUN.damage : WEAPONS[kind].damage, v >= pic.waterline - band, 0, out);
}
