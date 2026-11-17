// What a hit does in the inside view (owner, 17 novembre 2026): a round, a dart, a torpedo or a depth charge strikes
// a part of the hull as in the side battle (company/hullDamage.ts) — the machine gun only scars the deck and
// sometimes sets it alight, a dart opens a small breach, a torpedo a great one — and a hull with nothing left, full
// of water or with its store blown up breaks in two and sinks; the others fight on. Struck, a vessel knows where you
// are and hunts you. Your ship gone down, the view closes a moment later. Pure logic.
import { ENEMY_CLASSES, HIT_ZONES, WEAPONS } from '../../data/company';
import { HARPOON_GUN, MACHINE_GUN, TORPEDO_GUIDE } from '../../data/turret';
import { applyHit, swamped, zoneOf } from '../company/hullDamage';
import type { EnemyVessel } from '../company/enemyState';
import type { GameState } from '../newGame';
import { damageShip } from '../ship/shipHull';
import { shipModel, shipPicture } from '../ship/model';
import type { InsideState, Round } from './insideState';
import { toUnits } from './insideState';

export type HitZone = 'deck' | 'waterline' | 'magazine';
export type HitEvent =
  | { type: 'zone'; target: 'foe' | 'you'; zone: HitZone }
  | { type: 'sunk'; foe: number; name: string }
  | { type: 'lost' };

/** The vessel breaks in two and goes down (the world counts its sinking: company.ts). */
export function sinkFoe(e: EnemyVessel, out: HitEvent[]): void {
  if (e.sinkT > 0) return;
  Object.assign(e, { sinkT: 0.001, speed: 0, hull: 0 });
  out.push({ type: 'sunk', foe: e.id, name: ENEMY_CLASSES[e.cls].name });
}

/** The vessel struck at this point of its picture by a round of this kind, a dart or a torpedo. */
export function hitFoe(
  g: GameState,
  e: EnemyVessel,
  kind: Round['kind'] | 'torpedo' | 'dart',
  at: { u: number; v: number },
  out: HitEvent[],
): void {
  if (e.sinkT > 0) return;
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
  } else if (kind === 'dart') {
    // a small breach under the water
    zone = 'waterline';
    e.dmg.flood = Math.min(1, e.dmg.flood + HARPOON_GUN.flood);
    taken = HARPOON_GUN.damage;
  } else if (kind === 'torpedo') {
    zone = zone === 'magazine' ? 'magazine' : 'waterline';
    e.dmg.flood = Math.min(1, e.dmg.flood + TORPEDO_GUIDE.flood);
    taken = zone === 'magazine' ? Infinity : TORPEDO_GUIDE.damage;
  } else taken = applyHit(e.dmg, zone, WEAPONS[kind].damage);
  e.hull = Math.max(0, e.hull - taken);
  // struck, it knows where you are: it hunts you
  e.alert = 1;
  e.phase = 'hunting';
  e.unseen = 0;
  if (kind !== 'mg' && kind !== 'dart') out.push({ type: 'zone', target: 'foe', zone });
  if (e.hull <= 0 || swamped(e.dmg)) sinkFoe(e, out);
}

/** Your ship struck: `under` a breach (torpedo, charge, a shell at the waterline), else the deck. */
export function hitYou(
  g: GameState,
  d: InsideState,
  damage: number,
  under: boolean,
  flood: number,
  out: HitEvent[],
): void {
  if (d.lost !== null) return;
  const zone: HitZone = under ? 'waterline' : 'deck';
  const taken = flood > 0 ? damage : applyHit(g.company.yourDmg, zone, damage);
  if (flood > 0) g.company.yourDmg.flood = Math.min(1, g.company.yourDmg.flood + flood);
  damageShip(g.ship, taken, [], false);
  g.ship.flood = g.company.yourDmg.flood;
  out.push({ type: 'zone', target: 'you', zone });
  if (g.ship.hull <= 0 || swamped(g.company.yourDmg)) {
    g.ship.hull = 0;
    d.lost = 0;
    out.push({ type: 'lost' });
  }
}

/** A round of a vessel's struck your ship at this point of its picture. */
export function roundHitsYou(
  g: GameState,
  d: InsideState,
  kind: Round['kind'],
  v: number,
  out: HitEvent[],
): void {
  const pic = shipPicture(g.ship);
  const band = HIT_ZONES.waterline.bandM / (shipModel(g.ship).lengthM * pic.aspect);
  hitYou(g, d, kind === 'mg' ? MACHINE_GUN.damage : WEAPONS[kind].damage, v >= pic.waterline - band, 0, out);
}
