// Your ship's weapons against the Compagnia (owner, 17 novembre 2026). In battle the gun fires where you aimed it
// (you drag from the button and let go: ui/battleControls.ts); out of battle "Fuoco" aims at the nearest vessel in
// reach. A torpedo runs ahead from the bow towards the nearest one in front. Pure logic.
import { DETECTION, WEAPONS, type WeaponId } from '../../data/company';
import type { GameEvent } from '../events';
import type { GameState } from '../newGame';
import { shipPoint } from '../ship/geometry';
import { shipModel, shipPicture } from '../ship/model';
import { afloatEnemies, enemyPose, metres, type EnemyVessel } from './enemyState';
import { hullBox, middle } from './hulls';
import { fireShell, fireShellAt, fireTorpedo } from './ordnance';

/** Your weapon of this kind, if your ship has one. */
export const yourWeapon = (g: GameState, kind: 'shell' | 'torpedo'): WeaponId | null =>
  shipModel(g.ship).weapons.find((w) => WEAPONS[w].kind === kind) ?? null;

/** Where your gun is: on the deck, towards the bow. */
export function gunPoint(g: GameState): { x: number; y: number } {
  const s = g.ship;
  return shipPoint(s, 0.75, shipPicture(s).deckY);
}

/** Ready: loaded, and not jammed by a fire on your deck. */
const ready = (g: GameState, weapon: WeaponId): boolean =>
  (g.company.yourReload[weapon] ?? 0) <= 0 && g.company.yourDmg.jam <= 0;

/** Fires your gun: at this angle (battle mode), or at the nearest vessel in reach. */
export function fireGun(g: GameState, angle: number | null, events: GameEvent[]): void {
  const c = g.company;
  const s = g.ship;
  const weapon = yourWeapon(g, 'shell');
  if (!weapon || !ready(g, weapon)) return;
  const from = gunPoint(g);
  if (angle !== null) fireShellAt(c, weapon, 'you', from, angle);
  else {
    const w = WEAPONS[weapon];
    const reach = (e: EnemyVessel): boolean =>
      Math.abs(e.x - s.x) <= metres(w.rangeM) && e.dive < metres(DETECTION.periscopeM);
    const target = afloatEnemies(c)
      .filter(reach)
      .sort((a, b) => Math.abs(a.x - s.x) - Math.abs(b.x - s.x))[0];
    if (!target || !fireShell(c, weapon, 'you', from, middle(hullBox(enemyPose(target))), () => 0.5)) {
      events.push({ type: 'noTarget', weapon });
      return;
    }
  }
  c.yourReload[weapon] = WEAPONS[weapon].reload;
  events.push({ type: 'shotFired', from: 'you', weapon, ...from });
}

/** Fires a torpedo from the bow towards the nearest vessel in front, in reach. */
export function fireYourTorpedo(g: GameState, events: GameEvent[]): void {
  const c = g.company;
  const s = g.ship;
  if (!yourWeapon(g, 'torpedo') || !ready(g, 'siluro')) return;
  const pic = shipPicture(s);
  const from = shipPoint(s, pic.lamp.u, Math.min(pic.keel, pic.waterline + 0.08));
  const target = afloatEnemies(c)
    .filter((e) => (e.x - s.x) * s.face > 0 && Math.abs(e.x - s.x) <= metres(WEAPONS.siluro.rangeM))
    .sort((a, b) => Math.abs(a.x - s.x) - Math.abs(b.x - s.x))[0];
  if (!target) {
    events.push({ type: 'noTarget', weapon: 'siluro' });
    return;
  }
  fireTorpedo(c, 'you', from, middle(hullBox(enemyPose(target))), s.face);
  c.yourReload.siluro = WEAPONS.siluro.reload;
  events.push({ type: 'shotFired', from: 'you', weapon: 'siluro', ...from });
}
