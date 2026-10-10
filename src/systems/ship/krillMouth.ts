// The Krill Hunter's mouth (owner, 10 ottobre 2026): in place of the light under the hull, the whale opens its mouth
// and the light comes out of it. It draws the sardine schools near it and swallows them (into your bag), and like the
// light it calls the curious beasts, then the hunters. It can stay open as long as the ship is still, hatches open or
// not: you leave it fishing while you hunt with the drone or the speedboat (owner: "farmare"), and shut it before
// sailing off. Never an endless feast: its appetite is SHIP.mouth.maxSardines, refilled over rechargeSeconds; full,
// it waits until it is hungry again. And the light burns fuel and calls the hunters too. Pure logic.
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

/** It can open now: still, with fuel. */
export const mouthCan = (g: { ship: ShipState }): boolean => lightCan(g);

function shut(s: ShipState, events: GameEvent[]): void {
  const ate = s.mouthEaten;
  Object.assign(s, { mouthOpen: false, lightOn: false, lightT: 0 });
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
    events.push({ type: 'mouthNo' });
    return;
  }
  Object.assign(s, { mouthOpen: true, mouthEaten: 0, mouthFullSaid: false, lightOn: true, lightT: 0 });
  events.push({ type: 'mouthOpen' });
}

/** One step: its appetite comes back, it opens and shuts gently, draws and swallows the sardines while hungry. */
export function stepMouth(g: MouthWorld, dt: number, events: GameEvent[]): void {
  const s = g.ship;
  s.mouthFood = Math.min(M.maxSardines, s.mouthFood + (M.maxSardines / M.rechargeSeconds) * dt);
  const want = s.mouthOpen ? 1 : 0;
  s.mouthT = Math.max(0, Math.min(1, s.mouthT + Math.sign(want - s.mouthT) * (dt / M.openSeconds)));
  if (!s.mouthOpen) return;
  if (!s.lightOn) {
    shut(s, events); // the ship moved off, or ran dry (underLight.ts put its light out)
    return;
  }
  const at = mouthPoint(s);
  for (const sc of g.fish.schools)
    if (Math.hypot(sc.x - at.x, sc.y - at.y) < M.reach) Object.assign(sc, { tx: at.x, ty: at.y, t: 1 });
  for (const f of g.fish.fish) {
    if (s.mouthFood < 1) break;
    if (!f.alive || f.hooked || Math.hypot(f.x - at.x, f.y - at.y) > M.bite) continue;
    takeFish(f);
    g.gear.bag[f.kind] = (g.gear.bag[f.kind] ?? 0) + 1;
    g.fishCaught[f.kind] = (g.fishCaught[f.kind] ?? 0) + 1;
    s.mouthEaten++;
    s.mouthFood -= 1;
  }
  // full for now: once, a word; it eats again as its appetite comes back
  if (s.mouthFood < 1 && !s.mouthFullSaid) {
    s.mouthFullSaid = true;
    events.push({ type: 'mouthFull', eaten: s.mouthEaten });
  } else if (s.mouthFood >= M.maxSardines / 2) s.mouthFullSaid = false;
}
