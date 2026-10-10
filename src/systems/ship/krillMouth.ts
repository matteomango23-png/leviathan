// The Krill Hunter's mouth (owner, 10 ottobre 2026): in place of the light under the hull, the whale opens its mouth
// and the light comes out of it. It draws the sardine schools near it and swallows them (into your bag), and like the
// light it calls the curious beasts, then the hunters. Never an endless feast: it stays open a minute at most and
// swallows at most so many, then it shuts and needs a while to open again. Only with the ship still and its hatches
// shut (mouth or hatches, one at a time). Pure logic, data/ship.ts SHIP.mouth.
import { SHIP } from '../../data/ship';
import type { GameEvent } from '../events';
import { takeFish, type FishState } from '../fish';
import { shipPoint } from './geometry';
import { shipModel } from './model';
import type { ShipState } from './ship';
import { lightCan, type LightWorld } from './underLight';

const M = SHIP.mouth;

export interface MouthWorld extends LightWorld {
  fish: FishState;
  gear: { bag: Record<string, number> };
  fishCaught: Record<string, number>;
}

/** This ship has a mouth instead of the light under the hull. */
export const hasMouth = (s: { model: string }): boolean => !!shipModel(s).art?.mouth;

/** Where its light comes out, in the world. */
export function mouthPoint(s: ShipState): { x: number; y: number } {
  const p = shipModel(s).art?.picture;
  return shipPoint(s, p?.mouthU ?? 0.9, p?.mouthV ?? 0.55);
}

/** It can open now: still, with fuel, its hatches shut, recharged. */
export const mouthCan = (g: { ship: ShipState }): boolean =>
  lightCan(g) && g.ship.mouthWait <= 0 && g.ship.hatches.every((h) => !h.open && h.t === 0);

function shut(s: ShipState, events: GameEvent[]): void {
  const ate = s.mouthEaten;
  Object.assign(s, {
    mouthOpen: false,
    lightOn: false,
    lightT: 0,
    mouthWait: ate > 0 ? M.rechargeSeconds : 0,
  });
  events.push({ type: 'mouthShut', eaten: ate });
}

/** The button: opens it (if it can) or shuts it. */
export function toggleMouth(g: MouthWorld, events: GameEvent[]): void {
  const s = g.ship;
  if (s.mouthOpen) {
    shut(s, events);
    return;
  }
  if (!mouthCan(g)) {
    events.push({ type: 'mouthNo', wait: Math.ceil(s.mouthWait) });
    return;
  }
  Object.assign(s, { mouthOpen: true, mouthLeft: M.seconds, mouthEaten: 0, lightOn: true, lightT: 0 });
  events.push({ type: 'mouthOpen' });
}

/** One step: it opens and shuts gently, draws and swallows the sardines, and shuts itself when it has had enough. */
export function stepMouth(g: MouthWorld, dt: number, events: GameEvent[]): void {
  const s = g.ship;
  s.mouthWait = Math.max(0, s.mouthWait - dt);
  const want = s.mouthOpen ? 1 : 0;
  s.mouthT = Math.max(0, Math.min(1, s.mouthT + Math.sign(want - s.mouthT) * (dt / M.openSeconds)));
  if (!s.mouthOpen) return;
  if (!s.lightOn) {
    shut(s, events); // the ship moved off, or ran dry (underLight.ts put its light out)
    return;
  }
  s.mouthLeft -= dt;
  const at = mouthPoint(s);
  for (const sc of g.fish.schools)
    if (Math.hypot(sc.x - at.x, sc.y - at.y) < M.reach) Object.assign(sc, { tx: at.x, ty: at.y, t: 1 });
  for (const f of g.fish.fish) {
    if (s.mouthEaten >= M.maxSardines) break;
    if (!f.alive || f.hooked || Math.hypot(f.x - at.x, f.y - at.y) > M.bite) continue;
    takeFish(f);
    g.gear.bag[f.kind] = (g.gear.bag[f.kind] ?? 0) + 1;
    g.fishCaught[f.kind] = (g.fishCaught[f.kind] ?? 0) + 1;
    s.mouthEaten++;
  }
  if (s.mouthEaten >= M.maxSardines || s.mouthLeft <= 0) shut(s, events);
}
