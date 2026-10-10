// The light under the still ship (block 5b, owner 9 ottobre 2026): switched on at the helm, only with the ship still,
// it burns a little fuel and calls the beasts within its sonar's range to swim under the hull: the curious ones (calm
// and shy) at once, the hunters (aggressive) after a while, following them. So the beasts come to you instead of
// appearing, and staying long under the light is a risk. It goes off when the ship moves or runs dry. Pure logic,
// data/ship.ts SHIP.underLight.
import { HUNT_RULES } from '../../data/hunts';
import { SHIP } from '../../data/ship';
import { WORLD } from '../../data/worldLayout';
import type { BeastState } from '../beastState';
import { temperOf } from '../beasts/roam';
import { isInWater } from '../beasts/wildState';
import type { GameEvent } from '../events';
import { range, type Rng } from '../math';
import type { TileMap } from '../world/tileMap';
import { shipDraft } from './geometry';
import { sonarRange } from './model';
import type { ShipState } from './ship';

const L = SHIP.underLight;

export interface LightWorld {
  ship: ShipState;
  beasts: BeastState;
  map: TileMap;
  rng: Rng;
}

/** It can be switched on: your ship, at its helm, still, with fuel. */
export const lightCan = (g: { ship: ShipState }): boolean =>
  g.ship.owned && g.ship.aboard && g.ship.speed < SHIP.stillBelow && g.ship.fuel > 0;

/** How far it calls the beasts (units each side): its sonar's range. */
export const lightReach = (s: { model: string }): number => HUNT_RULES.bigEchoRange * sonarRange(s);

export function toggleLight(g: LightWorld, events: GameEvent[]): void {
  if (g.ship.lightOn) {
    lightOff(g);
    events.push({ type: 'lightOff' });
    return;
  }
  if (!lightCan(g)) {
    events.push({ type: 'lightNo' });
    return;
  }
  Object.assign(g.ship, { lightOn: true, lightT: 0 });
  events.push({ type: 'lightOn' });
}

function lightOff(g: LightWorld): void {
  Object.assign(g.ship, { lightOn: false, lightT: 0 });
  g.beasts.light = null;
  for (const w of g.beasts.wilds) w.drawn = null; // they go back to their wandering
}

/** A place under the hull for a beast to swim to (round its middle, in open water). */
function placeUnder(g: LightWorld): { x: number; y: number } {
  const s = g.ship;
  const keel = WORLD.surfaceY + s.dive + shipDraft(s);
  const x = s.x + range(g.rng, -L.spread, L.spread);
  const y = keel + range(g.rng, L.below[0], L.below[1]);
  const floor = g.map.floorBelow(x, keel + 4);
  return g.map.nearestOpen(x, Math.min(y, floor - 20), 8);
}

/** One step: it burns, goes off when the ship moves or runs dry, and calls the beasts every pulse. */
export function stepLight(g: LightWorld, dt: number, events: GameEvent[]): void {
  const s = g.ship;
  if (!s.lightOn) {
    if (g.beasts.light) lightOff(g);
    return;
  }
  // it stays on when you dive off or launch the submarine: that is what it is for
  if (s.speed >= SHIP.stillBelow || s.fuel <= 0) {
    lightOff(g);
    events.push({ type: 'lightOff' });
    return;
  }
  s.fuel = Math.max(0, s.fuel - (L.litresPerMinute / 60) * dt);
  const before = s.lightT;
  s.lightT += dt;
  const reach = lightReach(s);
  g.beasts.light = { x: s.x, reach };
  if (Math.floor(before / L.pulseSeconds) === Math.floor(s.lightT / L.pulseSeconds) && before > 0) return;
  const hunters = s.lightT >= L.predatorsAfter;
  if (hunters && before < L.predatorsAfter) events.push({ type: 'lightHunters' });
  for (const w of g.beasts.wilds) {
    if (!isInWater(w) || w.drawn || w.boss || Math.abs(w.x - s.x) > reach || w.y <= WORLD.surfaceY) continue;
    if (temperOf(w) === 'aggressive' && !hunters) continue;
    w.drawn = placeUnder(g);
  }
}

/** For the helm: how many beasts the light has called, still on their way or already under the hull. */
export const drawnCount = (g: { beasts: BeastState }): number =>
  g.beasts.wilds.filter((w) => isInWater(w) && w.drawn).length;
