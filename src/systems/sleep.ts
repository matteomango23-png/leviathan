// Sleeping (lot N1, owner 13 novembre 2026): "un dormi, che è una velocizzazione del tempo, dove stai fermo lì e
// basta". Aboard the still ship (at the helm) or at a port; never swimming, in the submarine, on the speedboat or in
// a battle. The clock runs fast (dayNight.ts) until evening or morning, or until you wake; at sea something may wake
// you. Separate from "Riposa", which heals and leaves the hour as it is.
import { SHIP } from '../data/ship';
import { SLEEP } from '../data/daynight';
import type { GameEvent } from './events';
import type { InputState } from './input';
import type { GameState } from './newGame';
import { phaseAt, startSleep, stepDay, stopSleep } from './dayNight';

/** Can you lie down here? */
export function canSleep(g: GameState): boolean {
  if (g.beasts.battle || g.sub.aboard || g.boat.aboard || g.diver.dead) return false;
  if (g.ship.aboard) return g.ship.speed < SHIP.stillBelow;
  return !!g.port;
}

/** Lies down until the evening or the morning (nothing if you cannot sleep here). */
export function goToSleep(g: GameState, until: keyof typeof SLEEP.targets, events: GameEvent[]): boolean {
  if (!canSleep(g)) {
    events.push({ type: 'cannotSleep' });
    return false;
  }
  startSleep(g.day, until);
  events.push({ type: 'sleepStarted' });
  return true;
}

export function wakeUp(g: GameState, events: GameEvent[]): void {
  if (!g.day.sleeping) return;
  stopSleep(g.day);
  events.push({ type: 'wokeUp', why: 'self', phase: phaseAt(g.day.t).name });
}

/** Asleep you do nothing: the input with every press and stick let go (the ship's levers stay where they are). */
export const lyingStill = (input: InputState): InputState => ({
  ...input,
  moveX: 0,
  moveY: 0,
  fireHeld: false,
  aim: null,
  shotAt: null,
  dash: false,
  dashHeld: false,
  action: false,
  slot: -1,
  helmCmd: null,
});

/** One step of the clock: asleep it runs fast; you wake when the hour comes, when something happens, or when you
 *  can no longer sleep where you are. Also tells when the night falls. */
export function stepClock(g: GameState, dt: number, events: GameEvent[]): void {
  if (g.day.sleeping && !canSleep(g)) wakeUp(g, events);
  const before = phaseAt(g.day.t).id;
  const why = stepDay(g.day, dt, g.rng, !!g.port);
  const now = phaseAt(g.day.t).id;
  if (why)
    events.push({ type: 'wokeUp', why: why === 'reached' ? 'reached' : why, phase: phaseAt(g.day.t).name });
  if (before !== now && now === 'tramonto') events.push({ type: 'nightFalls' });
}
