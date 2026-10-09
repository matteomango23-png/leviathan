// The tracker dart (block 5a, owner 9 ottobre 2026): from any submarine (the Ocean's Nightmare's drone too), at a
// wild beast close in front of it, a dart that lets the compass follow that beast for about 30 minutes of play, time
// to go back to the ship, refuel and set out again. One at a time; the trace is lost when the beast is caught,
// beaten, or (not a resident of the endless sea) goes back into the dark. Pure logic, data/hunts.ts TRACKER.
import { TRACKER } from '../data/hunts';
import { WORLD } from '../data/worldLayout';
import type { BeastState } from './beastState';
import { distanceToBody } from './beasts/combat';
import { formName } from './beasts/forms';
import { isInWater, type WildBeast } from './beasts/wildState';
import type { GameEvent } from './events';
import type { GadgetsState } from './ship/gadgets';
import type { SubState } from './subState';
import { locate } from './tracking';

export interface TrackerWorld {
  sub: SubState;
  beasts: Pick<BeastState, 'wilds' | 'residents' | 'held'>;
  gadgets: GadgetsState;
}

/** The wild beast the dart would hit: the nearest close in front of the submarine you drive, or null. */
export function trackerTarget(g: TrackerWorld): WildBeast | null {
  const s = g.sub;
  if (!s.aboard) return null;
  const reach = TRACKER.reachM * WORLD.unitsPerMetre;
  let best: WildBeast | null = null;
  let bestD = Infinity;
  for (const w of g.beasts.wilds) {
    if (!isInWater(w) || (w.x - s.x) * s.face <= 0) continue;
    const d = distanceToBody(w, s.x, s.y);
    if (d <= reach && d < bestD) {
      best = w;
      bestD = d;
    }
  }
  return best;
}

/** Fired: the beast becomes the one the compass follows, for TRACKER.seconds. */
export function shootTracker(g: TrackerWorld, events: GameEvent[]): void {
  const w = trackerTarget(g);
  if (!w) return;
  g.gadgets.target = w.spawn.resident
    ? { resident: w.spawn.resident, speciesId: w.spawn.speciesId }
    : { wild: w.id, speciesId: w.spawn.speciesId };
  g.gadgets.targetName = formName(w.form);
  g.gadgets.trackLeft = TRACKER.seconds;
  events.push({ type: 'trackerHit', name: g.gadgets.targetName });
}

/** One step: the trace runs out, or is lost with its beast. */
export function stepTracker(g: TrackerWorld, dt: number, events: GameEvent[]): void {
  const gd = g.gadgets;
  if (!gd.target) {
    gd.trackLeft = null;
    return;
  }
  const name = gd.targetName;
  if (!locate(g, gd.target)) {
    Object.assign(gd, { target: null, targetName: '', trackLeft: null });
    events.push({ type: 'targetLost', name });
    return;
  }
  if (gd.trackLeft === null) return; // picked from the drone's report: no time limit
  gd.trackLeft -= dt;
  if (gd.trackLeft > 0) return;
  Object.assign(gd, { target: null, targetName: '', trackLeft: null });
  events.push({ type: 'trackerExpired', name });
}
