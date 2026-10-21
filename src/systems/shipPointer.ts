// The arrow to your ship (owner, 21 ottobre 2026: lost far from the ship while riding, "un indicatore… che ti dia la
// direzione per ritrovare la barca"): only a direction, no metres or depth. It points to where you would wake up (your
// ship, or your harbour without one), and only while that is off the screen and you are in the water. Pure logic.
import { SHIP_POINTER } from '../data/diver';
import type { ViewRect } from './beastState';
import type { GameState } from './newGame';
import { respawnPoint } from './playerActions';
import { inVehicle } from './vehicles';

export interface ShipArrow {
  /** Which way it points (radians, 0 = right, down positive like the screen). */
  angle: number;
  /** Where it sits on the screen, as shares of its width and height. */
  x: number;
  y: number;
}

/** The arrow for a target seen from this view: null while the target is on the screen. */
export function arrowTo(target: { x: number; y: number }, view: ViewRect): ShipArrow | null {
  const fx = (target.x - (view.x + view.width / 2)) / view.width;
  const fy = (target.y - (view.y + view.height / 2)) / view.height;
  if (Math.abs(fx) < 0.5 && Math.abs(fy) < 0.5) return null;
  const h = 0.5 - SHIP_POINTER.edge;
  const k = Math.min(h / Math.max(Math.abs(fx), 1e-9), h / Math.max(Math.abs(fy), 1e-9));
  return {
    angle: Math.atan2(target.y - (view.y + view.height / 2), target.x - (view.x + view.width / 2)),
    x: 0.5 + fx * k,
    y: 0.5 + fy * k,
  };
}

/** The arrow now: none aboard a vehicle, dead, or with no view yet. */
export function shipArrow(g: GameState): ShipArrow | null {
  const view = g.beasts.view;
  if (!view || g.diver.dead || inVehicle(g)) return null;
  return arrowTo(respawnPoint(g), view);
}
