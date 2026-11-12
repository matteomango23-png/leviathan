// The arrow to your ship (owner, 21 ottobre 2026: lost far from the ship while riding, "un indicatore… che ti dia la
// direzione per ritrovare la barca"): only a direction, no metres or depth. It points to where you would wake up (your
// ship, or your harbour without one), and only while that is off the screen and you are in the water. Until the ship is
// yours it points to the goal of the guided first dive instead (owner, 12 novembre 2026: "la freccia gialla dovrebbe
// indicare da che parte devi andare… fino a che non ti dà la nave"). Pure logic.
import { SHIP_POINTER } from '../data/diver';
import { PORT, PORTO_FANGO } from '../data/economy';
import { TUTORIAL } from '../data/story';
import { strongestLevel } from './beasts/team';
import { portStart } from './economy/places';
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

const nearest = <T extends { x: number; y: number }>(all: T[], from: { x: number; y: number }): T | null => {
  let best: T | null = null;
  let bd = Infinity;
  for (const a of all) {
    const d = Math.hypot(a.x - from.x, a.y - from.y);
    if (d < bd) [best, bd] = [a, d];
  }
  return best;
};

/** Where the guided first dive wants you now (null: nowhere in particular, e.g. "swim" or "dash"). */
export function storyGoal(g: GameState): { x: number; y: number } | null {
  const s = g.story;
  const d = g.diver;
  if (s.step === 'toPortoFango') return portStart(PORTO_FANGO);
  if (s.step !== 'tutorial') return null;
  switch (TUTORIAL[s.tutorial]?.id) {
    case 'fish':
      return nearest(
        g.fish.fish.filter((f) => f.alive && f.kind === 'sardina'),
        d,
      );
    case 'tame': {
      const top = strongestLevel(g.beasts.team) + SHIP_POINTER.tameAbove;
      return nearest(
        g.beasts.wilds.filter((w) => w.motion === 'roam' && !w.form.unique && w.level <= top),
        d,
      );
    }
    case 'surface':
      return portStart(PORT);
    default:
      return null;
  }
}

/** The arrow now: none aboard a vehicle, dead, or with no view yet. */
export function shipArrow(g: GameState): ShipArrow | null {
  const view = g.beasts.view;
  if (!view || g.diver.dead || inVehicle(g)) return null;
  const goal = g.ship.owned ? null : storyGoal(g);
  return arrowTo(goal ?? respawnPoint(g), view);
}
