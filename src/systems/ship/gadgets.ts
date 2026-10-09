// The Ocean's Nightmare's gadgets (part 4d, owner 9 ottobre 2026). The drone, docked in its hold, scouts by itself
// every beast the sonar can reach, one after the other, and comes back with a report; you pick a beast from it: the
// compass follows that beast, and the sphere goes by itself to hold it still for a minute, then comes back and
// recharges. The drone is the ship's submarine too (you can drive it by hand): it scouts only from its hold.
import { RECON, SPHERE } from '../../data/nightmare';
import { WORLD } from '../../data/worldLayout';
import type { GameEvent } from '../events';
import type { BeastState } from '../beastState';
import { subModel, type SubState } from '../submarine';
import { beastsInRange, holdOf, locate, type Contact, type Target } from '../tracking';
import { holdPoint } from './geometry';
import { shipModel, subBay } from './model';
import { hatchT, type ShipState } from './ship';
import { SHIP } from '../../data/ship';

/** One beast in the drone's report, as it found it. */
export interface ReconEntry {
  target: Target;
  name: string;
  speciesId: string;
  lengthM: number;
  level?: number;
  depthM: number;
  /** Metres from the ship when it was found (west < 0). */
  dxM: number;
}

export interface GadgetsState {
  recon: {
    phase: 'idle' | 'out' | 'back';
    x: number;
    y: number;
    face: 1 | -1;
    queue: Contact[];
    /** Seconds after the current beast. */
    t: number;
    found: ReconEntry[];
    /** The last report (null: none yet). */
    report: ReconEntry[] | null;
  };
  sphere: { phase: 'dock' | 'go' | 'hold' | 'back'; x: number; y: number; cooldown: number };
  /** The beast you follow (saved when it is a resident of the endless sea) and its name. */
  target: Target | null;
  targetName: string;
  /** Followed by a tracker dart (block 5a): seconds before its trace runs out (null: no limit, the drone's pick). */
  trackLeft: number | null;
}

export interface GadgetsWorld {
  ship: ShipState;
  sub: SubState;
  beasts: BeastState;
  seen: Set<string>;
  gadgets: GadgetsState;
}

export function newGadgets(
  target: { target: Target; name: string } | null = null,
  trackLeft: number | null = null,
): GadgetsState {
  return {
    recon: { phase: 'idle', x: 0, y: 0, face: 1, queue: [], t: 0, found: [], report: null },
    sphere: { phase: 'dock', x: 0, y: 0, cooldown: 0 },
    target: target?.target ?? null,
    targetName: target?.name ?? '',
    trackLeft: target ? trackLeft : null,
  };
}

export const sphereBay = (s: { model: string }): number =>
  shipModel(s).bays.findIndex((b) => b.kind === 'sphere');
/** Its submarine is a drone that scouts (the Ocean's Nightmare's). */
export const hasDrone = (g: { ship: ShipState }): boolean => {
  const bay = shipModel(g.ship).bays[subBay(g.ship)];
  return !!bay && !!subModel(bay.model).recon;
};

/** The drone can scout now: in its hold behind its open hatch (owner, 9 ottobre: open it, then scout or launch),
 *  whole, the ship still, not already out. */
export const canRecon = (g: GadgetsWorld): boolean =>
  g.ship.owned &&
  hasDrone(g) &&
  g.ship.bay === 'docked' &&
  hatchT(g.ship, subBay(g.ship)) === 1 &&
  g.ship.speed < SHIP.stillBelow &&
  !g.sub.aboard &&
  g.sub.hull > 0 &&
  g.gadgets.recon.phase === 'idle';

/** The drone is away on its round (the submarine stays hidden, it cannot be launched). */
export const reconOut = (g: { gadgets: GadgetsState }): boolean => g.gadgets.recon.phase !== 'idle';

export function startRecon(g: GadgetsWorld, events: GameEvent[]): void {
  if (!canRecon(g)) return;
  const r = g.gadgets.recon;
  const home = holdPoint(g.ship);
  const queue = beastsInRange(g, g.ship).slice(0, RECON.maxBeasts);
  if (!queue.length) {
    events.push({ type: 'reconEmpty' });
    return;
  }
  Object.assign(r, { phase: 'out', x: home.x, y: home.y, queue, t: 0, found: [] });
  events.push({ type: 'reconStart' });
}

/** Moves a point toward another at `speed`; true when it got there (within `reach`). */
function glide(
  p: { x: number; y: number },
  to: { x: number; y: number },
  speed: number,
  reach: number,
  dt: number,
): boolean {
  const dx = to.x - p.x;
  const dy = to.y - p.y;
  const d = Math.hypot(dx, dy);
  if (d <= reach) return true;
  const step = Math.min(d, speed * dt);
  p.x += (dx / d) * step;
  p.y += (dy / d) * step;
  return d - step <= reach;
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
      if (glide(r, at, RECON.speed, RECON.reach, dt)) {
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
    r.report = r.found;
    events.push({ type: 'reconDone', count: r.found.length });
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

/** "Invia sfera" shows: its bay open (owner, 9 ottobre: open it, send it, close it when it is back), a beast
 *  picked, the sphere home. */
export const canSendSphere = (g: GadgetsWorld): boolean => {
  const bay = sphereBay(g.ship);
  return bay >= 0 && hatchT(g.ship, bay) === 1 && !!g.gadgets.target && g.gadgets.sphere.phase === 'dock';
};

/** The sphere is away (its bay cannot be closed meanwhile). */
export const sphereOut = (g: { gadgets: GadgetsState }): boolean => g.gadgets.sphere.phase !== 'dock';

export function sendSphere(g: GadgetsWorld, events: GameEvent[]): void {
  const sp = g.gadgets.sphere;
  const bay = sphereBay(g.ship);
  if (!canSendSphere(g)) return;
  if (sp.phase !== 'dock') return void events.push({ type: 'sphereBusy' });
  if (sp.cooldown > 0) return void events.push({ type: 'sphereCharging', seconds: sp.cooldown });
  Object.assign(sp, { phase: 'go', ...holdPoint(g.ship, bay) });
  events.push({ type: 'sphereGo', name: g.gadgets.targetName });
}

function stepSphere(g: GadgetsWorld, dt: number, events: GameEvent[]): void {
  const sp = g.gadgets.sphere;
  const bay = sphereBay(g.ship);
  if (bay < 0) return;
  const home = holdPoint(g.ship, bay);
  const t = g.gadgets.target;
  if (sp.phase === 'dock') {
    sp.cooldown = Math.max(0, sp.cooldown - dt);
    Object.assign(sp, home);
  } else if (sp.phase === 'go') {
    const at = t && locate(g, t);
    if (!t || !at) sp.phase = 'back';
    else if (glide(sp, at, SPHERE.speed, SPHERE.reach, dt)) {
      sp.phase = 'hold';
      g.beasts.held = holdOf(t, at, SPHERE.holdSeconds);
      events.push({ type: 'sphereHold', name: g.gadgets.targetName, seconds: SPHERE.holdSeconds });
    }
  } else if (sp.phase === 'hold') {
    const h = g.beasts.held;
    const at = t && locate(g, t);
    if (h) h.left -= dt;
    if (!h || h.left <= 0 || !at) {
      // its minute is over (a battle that started on it lets it go quietly)
      if (h && at) events.push({ type: 'sphereFree', name: g.gadgets.targetName });
      g.beasts.held = null;
      sp.phase = 'back';
    } else {
      // it floats just above the beast it holds
      sp.x = at.x;
      sp.y = at.y - 18;
    }
  } else if (glide(sp, home, SPHERE.speed, 6, dt)) {
    sp.phase = 'dock';
    sp.cooldown = SPHERE.cooldownSeconds;
  }
}

/** Every step: the drone's round, the sphere, and the beast you follow (lost when caught, beaten or gone). */
export function stepGadgets(g: GadgetsWorld, dt: number, events: GameEvent[]): void {
  if (!g.ship.owned) return;
  stepRecon(g, dt, events);
  stepSphere(g, dt, events);
  const t = g.gadgets.target;
  if (t && !locate(g, t)) {
    events.push({ type: 'targetLost', name: g.gadgets.targetName });
    clearTarget(g);
  }
}
