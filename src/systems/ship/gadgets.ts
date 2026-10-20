// The Ocean's Nightmare's gadgets (part 4d, owner 9 ottobre 2026). The drone, docked in its hold, scouts by itself
// every beast the sonar can reach, one after the other, and comes back with a report; you pick a beast from it: the
// compass follows that beast, and the sphere goes by itself to hold it still for a minute, then comes back and
// recharges. The drone is the ship's submarine too (you can drive it by hand): it scouts only from its hold.
import { RECON } from '../../data/nightmare';
import { WORLD } from '../../data/worldLayout';
import type { GameEvent } from '../events';
import { subModel } from '../submarine';
import { beastsInRange, locate, type Target } from '../tracking';
import { holdPoint } from './geometry';
import { shipModel, subBay } from './model';
import { hatchT, type ShipState } from './ship';
import { SHIP } from '../../data/ship';
import { TRACKER } from '../../data/hunts';
import { glide, type GadgetsState, type GadgetsWorld, type ReconEntry } from './gadgetsState';
import { stepSphere } from './sphere';

export { newGadgets, sphereBay, type GadgetsState } from './gadgetsState';
export { canSendSphere, sendSphere, sphereOut } from './sphere';

/** Its submarine is a drone (the Ocean's Nightmare's scouts, the Krill Hunter's plants trackers from afar). */
export const droneKind = (g: { ship: ShipState }): 'scout' | 'tracker' | null => {
  const bay = shipModel(g.ship).bays[subBay(g.ship)];
  const m = bay && subModel(bay.model);
  return m?.recon ? 'scout' : m?.remoteTracker ? 'tracker' : null;
};
export const hasDrone = (g: { ship: ShipState }): boolean => droneKind(g) !== null;

/** The drone is in its hold behind its open hatch, whole, the ship still, not already out. */
const droneReady = (g: GadgetsWorld): boolean =>
  g.ship.owned &&
  g.ship.bay === 'docked' &&
  hatchT(g.ship, subBay(g.ship)) === 1 &&
  g.ship.speed < SHIP.stillBelow &&
  !g.sub.aboard &&
  g.sub.hull > 0 &&
  g.gadgets.recon.phase === 'idle';

/** The Krill Hunter's drone can be sent to plant a tracker now (block 5, 10 ottobre). */
export const canSendTracker = (g: GadgetsWorld): boolean => droneKind(g) === 'tracker' && droneReady(g);

/** Sends it to one beast the sonar hears (picked on the cockpit's screen): it plants a tracker and comes back. */
export function sendTrackerDrone(g: GadgetsWorld, target: Target, events: GameEvent[]): boolean {
  if (!canSendTracker(g)) return false;
  const c = beastsInRange(g, g.ship).find((x) => JSON.stringify(x.target) === JSON.stringify(target));
  if (!c) return false;
  const home = holdPoint(g.ship);
  Object.assign(g.gadgets.recon, {
    phase: 'out',
    mode: 'tracker',
    x: home.x,
    y: home.y,
    queue: [c],
    t: 0,
    found: [],
  });
  events.push({ type: 'droneTrackerOut', name: c.name });
  return true;
}

/** The drone can scout now: in its hold behind its open hatch (owner, 9 ottobre: open it, then scout or launch),
 *  whole, the ship still, not already out. */
export const canRecon = (g: GadgetsWorld): boolean =>
  g.ship.owned &&
  droneKind(g) === 'scout' &&
  g.ship.bay === 'docked' &&
  hatchT(g.ship, subBay(g.ship)) === 1 &&
  g.ship.speed < SHIP.stillBelow &&
  !g.sub.aboard &&
  g.sub.hull > 0 &&
  g.gadgets.recon.phase === 'idle';

/** The drone is away on its round (the submarine stays hidden, it cannot be launched). */
export const reconOut = (g: { gadgets: GadgetsState }): boolean => g.gadgets.recon.phase !== 'idle';

/** @param known whether the sonar already knows what a beast is (sonarScan.ts echoKnown): those come last */
export function startRecon(
  g: GadgetsWorld,
  events: GameEvent[],
  known: (t: Target) => boolean = () => false,
): void {
  if (!canRecon(g)) return;
  const r = g.gadgets.recon;
  const home = holdPoint(g.ship);
  // first what the sonar does not know yet, then the biggest, then the nearest (owner, 20 ottobre: the sonar's unknown
  // 9 m echo was never in the drone's round of the 8 nearest, all small fish)
  const fresh = (c: { target: Target }): number => (known(c.target) ? 1 : 0);
  const queue = beastsInRange(g, g.ship)
    .map((c, near) => ({ c, near }))
    .sort((a, b) => fresh(a.c) - fresh(b.c) || b.c.lengthM - a.c.lengthM || a.near - b.near)
    .map((x) => x.c)
    .slice(0, RECON.maxBeasts);
  if (!queue.length) {
    events.push({ type: 'reconEmpty' });
    return;
  }
  Object.assign(r, { phase: 'out', mode: 'scout', x: home.x, y: home.y, queue, t: 0, found: [] });
  events.push({ type: 'reconStart' });
}

function stepRecon(g: GadgetsWorld, dt: number, events: GameEvent[]): void {
  const r = g.gadgets.recon;
  if (r.phase === 'idle') return;
  const home = holdPoint(g.ship);
  const was = r.x;
  if (r.phase === 'out') {
    const c = r.queue[0];
    const at = c && locate(g, c.target);
    if (!c) r.phase = 'back';
    else if (!at || r.t > RECON.giveUpSeconds) {
      r.queue.shift();
      r.t = 0;
    } else {
      r.t += dt;
      if (glide(r, at, RECON.speed, RECON.reach, dt) && r.mode === 'tracker') {
        // the Krill Hunter's: the dart planted, home again
        Object.assign(g.gadgets, { target: c.target, targetName: c.name, trackLeft: TRACKER.seconds });
        events.push({ type: 'trackerHit', name: c.name });
        g.seen.add(c.speciesId);
        r.queue = [];
        r.phase = 'back';
      } else if (r.mode === 'scout' && Math.hypot(at.x - r.x, at.y - r.y) <= RECON.reach) {
        r.found.push({
          target: c.target,
          name: c.name,
          speciesId: c.speciesId,
          lengthM: c.lengthM,
          ...(at.level !== undefined ? { level: at.level } : c.level !== undefined ? { level: c.level } : {}),
          depthM: Math.max(0, Math.round((at.y - WORLD.surfaceY) / WORLD.unitsPerMetre)),
          dxM: Math.round((at.x - g.ship.x) / WORLD.unitsPerMetre),
        });
        g.seen.add(c.speciesId); // the drone saw it: in the bestiary
        r.queue.shift();
        r.t = 0;
      }
    }
  } else if (glide(r, home, RECON.speed, 6, dt)) {
    r.phase = 'idle';
    if (r.mode === 'scout') {
      r.report = r.found;
      r.reportAge = 0;
      events.push({ type: 'reconDone', count: r.found.length });
    }
    r.mode = 'scout';
  }
  if (r.x !== was) r.face = r.x > was ? 1 : -1;
}

/** You pick a beast from the report (the cockpit's Drone tab): the compass follows it. */
export function pickTarget(g: GadgetsWorld, e: ReconEntry, events: GameEvent[]): void {
  g.gadgets.target = e.target;
  g.gadgets.targetName = e.name;
  g.gadgets.trackLeft = null;
  events.push({ type: 'targetSet', name: e.name });
}

export function clearTarget(g: GadgetsWorld): void {
  g.gadgets.target = null;
  g.gadgets.targetName = '';
  g.gadgets.trackLeft = null;
}

/** Every step: the drone's round, the sphere, and the beast you follow (lost when caught, beaten or gone). */
export function stepGadgets(g: GadgetsWorld, dt: number, events: GameEvent[]): void {
  if (!g.ship.owned) return;
  stepRecon(g, dt, events);
  // the report gets old and runs out: where the beasts were minutes ago is no use
  const r = g.gadgets.recon;
  if (r.report) {
    r.reportAge += dt;
    if (r.reportAge > RECON.reportSeconds) r.report = null;
  }
  stepSphere(g, dt, events);
  const t = g.gadgets.target;
  if (t && !locate(g, t)) {
    events.push({ type: 'targetLost', name: g.gadgets.targetName });
    clearTarget(g);
  }
}
