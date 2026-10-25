// Sailing the ship one step (split from ship.ts in the cleanup of 19 ottobre 2026): helm, speed, fuel, ice, waves,
// the U-Boats' dive, the hull. Pure logic.
import { SHIP } from '../../data/ship';
import { settleRide, stepRide } from '../ride';
import { CALM_SEA, currentMult, type SeaWeather } from '../sea';
import { PORTO_FANGO } from '../../data/economy';
import type { GameEvent } from '../events';
import { litresFor } from '../fuelBurn';
import { stepHeading, type HelmState } from '../helm';
import { helmPoint, shipDraft, shipSpan } from './geometry';
import { breakIce, refreeze, SEA_END_X, SHIP_WEST_X } from './surface';
import { shipLength, shipModel, shipPicture, shipRates, shipTopSpeed } from './model';
import { icebergAcross } from '../world/icebergs';
import { hullAground, hullBlocked, stepDive, submerged } from './uboat';
import { chokeAboard } from '../diver';
import { bumpShip, stepShipHull } from './shipHull';
import { hatchesShut, sonarActive, type ShipWorld } from './ship';

/**
 * One step of the ship. `helm` is null when you are not at the helm (it drifts to a stop). `far` tells whether
 * a world x is far enough from you and the ship for the ice to freeze again unseen. Returns tiles that changed.
 */
export function sailShip(
  g: ShipWorld,
  helm: HelmState | null,
  dt: number,
  events: GameEvent[],
  far: (x: number) => boolean,
  sea: SeaWeather = CALM_SEA,
  t = 0,
): number[] {
  const s = g.ship;
  if (!s.owned) return [];
  s.shallowWarn = Math.max(0, s.shallowWarn - dt);
  for (const h of s.hatches)
    h.t = Math.max(0, Math.min(1, h.t + ((h.open ? 1 : -1) * dt) / SHIP.hatchSeconds));
  // the sonar pings while it is on and the ship slow enough to hear
  if (sonarActive(s) && s.aboard) {
    s.sonarT -= dt;
    if (s.sonarT <= 0) {
      s.sonarT = SHIP.sonar.pingSeconds;
      events.push({ type: 'sonarPing' });
    }
  } else s.sonarT = 0;

  const { x0, x1 } = shipSpan(s);
  const bow = s.face > 0 ? x1 : x0;
  // the ice sheet breaks under the bow without slowing it; an iceberg slows it down (owner, 8 ottobre: entering the
  // Banchisa capped the ship at 10 knots)
  const icy = icebergAcross(Math.min(bow, bow + s.face * 40), Math.max(bow, bow + s.face * 40));
  // dry, it drifts to a stop; a storm's current holds it back a little (owner, 9 ottobre)
  // dry or broken down (block 5c): no engine
  const top =
    s.fuel <= 0 || s.hull <= 0 ? 0 : shipTopSpeed(s) * (icy ? SHIP.iceMult : 1) * currentMult('ship', sea);
  // the throttle off zero starts the engine; dry, it stops (owner, 8 ottobre)
  if (helm && helm.throttle > 0 && s.fuel > 0 && s.hull > 0 && !s.engineOn) {
    s.engineOn = true;
    events.push({ type: 'engineStarted' });
  }
  if (s.fuel <= 0 && s.engineOn) {
    s.engineOn = false;
    events.push({ type: 'engineStopped' });
  }
  const shut = hatchesShut(s);
  const push = helm && s.engineOn && shut ? helm.throttle : 0;
  s.prop += (push - s.prop) * Math.min(1, dt * 2); // the propeller speeds up and slows down gently
  if (helm && s.engineOn && shut) {
    const h = stepHeading(s.face, s.speed, helm, top, shipRates(s), dt);
    s.face = h.face;
    s.speed = h.speed;
  } else s.speed = Math.max(0, s.speed - (shut ? shipRates(s).coast : shipRates(s).brake) * dt);
  if (s.speed > top) s.speed = Math.max(top, s.speed - SHIP.iceBite * dt); // into the ice: it bites

  // its waters (owner, 5 ottobre): from the trading harbour of Porto Fango east to the end of the known sea, with
  // nothing in the way (no icebergs, no islands); west of the harbour it does not go
  const half = shipLength(s) / 2;
  const from = s.x;
  const end = SEA_END_X - half;
  // coming into Porto Fango (or to the end of the sea) it slows down by itself and stops at the berth (owner,
  // 8 ottobre: at full speed you crashed into it every time, unseen), the throttle lever going down with the speed
  // (owner, 9 ottobre). The pier is at the surface: a U-Boat under water passes beneath it, on west.
  const A = SHIP.approach;
  const afloat = !submerged(s);
  // only with the berth still ahead: a U-Boat that passed beneath it and came up on its west side sails on freely
  // (owner, 9 ottobre: it braked there, "approaching Porto Fango", with the harbour behind it)
  const toBerth = Math.max(0, s.x - PORTO_FANGO.shipDock);
  const ahead = s.face < 0 ? (afloat && s.x >= SHIP_WEST_X ? toBerth : Infinity) : end - s.x;
  if (ahead < A.range && s.speed > 0) {
    const most = Math.sqrt(2 * A.decel * Math.max(0, ahead)); // the speed that stops it right there
    if (s.speed > most) {
      s.speed = most; // it follows the braking curve exactly: it stops at the berth, never all at once
      if (helm && top > 0) helm.throttle = Math.min(helm.throttle, s.speed / top);
      if (!s.approaching && s.face < 0) events.push({ type: 'harbourApproach' });
      s.approaching = true;
    }
  } else s.approaching = false;
  // afloat no ship sails west past the harbour's pier; a U-Boat that went beneath it and came up on its west side
  // sails on there at the surface (owner, 9 ottobre: it was stopped), and only under water goes back east past it
  const westSide = afloat && s.x < SHIP_WEST_X;
  const west = afloat && !westSide ? SHIP_WEST_X : -Infinity;
  const east = westSide ? SHIP_WEST_X - 1 : end;
  // a U-Boat under water stops against rock with its whole hull (ship/uboat.ts)
  const ahead2 = s.x + s.face * s.speed * dt;
  if (hullBlocked(g.map, s, ahead2, s.dive)) {
    bumpShip(s, s.speed, events); // hard into rock, the hull suffers (block 5c)
    s.speed = 0;
  } else if (afloat && ahead2 !== s.x && hullAground(g.map, s, ahead2) && !hullAground(g.map, s, s.x)) {
    // afloat its keel stops at a shore or a shallow seabed (owner, 24 ottobre: a U-Boat come up west of Porto
    // Fango sailed on into the land of Portofosco)
    s.speed = 0;
    if (s.shallowWarn <= 0) {
      events.push({ type: 'shipAground' });
      s.shallowWarn = 6;
    }
  } else s.x = Math.max(west, Math.min(east, ahead2));
  const atEdge = s.x >= end ? 'seaEnd' : s.x <= west || (westSide && s.x >= east) ? 'shipWest' : null;
  const into = atEdge === 'seaEnd' || westSide ? 1 : -1; // the way that runs into it
  if (atEdge && s.speed > 0 && s.face === into) {
    s.speed = 0;
    if (s.shallowWarn <= 0) {
      events.push({ type: atEdge });
      s.shallowWarn = 6;
    }
  }
  const engine = helm && s.engineOn && shut ? helm.throttle : 0;
  const idle = s.engineOn ? (SHIP.fuel.idlePerMinute / 60) * dt : 0; // running, it burns a little even still
  s.fuel = Math.max(0, s.fuel - idle - litresFor(Math.abs(s.x - from), engine, shipModel(s).perKm));
  if (s.fuel > 0) s.fuelWarned = false;
  else if (!s.fuelWarned) {
    s.fuelWarned = true;
    events.push({ type: 'fuelOut', vehicle: 'ship' });
  }

  s.iceT = Math.max(0, s.iceT - dt);
  const changed: number[] = [];
  if (s.speed > 0.5 && !submerged(s)) {
    // under water a U-Boat slips beneath the ice sheet
    // the ice breaks under the hull, just behind the bow where the ship covers it (owner, 8 ottobre: it broke
    // ahead of the bow, before the ship touched it)
    const nose = s.x + s.face * shipLength(s) * (shipPicture(s).bowU - 0.5); // where the bow meets the water, now
    const [near, far] = SHIP.iceBehindBow;
    const cut = breakIce(
      g.map,
      Math.min(nose - s.face * near, nose - s.face * far),
      Math.max(nose - s.face * near, nose - s.face * far),
      s.broken,
      shipDraft(s),
    );
    if (cut.length) {
      events.push({ type: 'iceCracked', x: nose, speed: s.speed });
      s.iceT = SHIP.iceCrackSeconds;
    }
    changed.push(...cut);
  }
  const depth = s.dive;
  changed.push(...stepDive(g.map, s, helm, dt, events));
  // sinking or rising into rock with the lever pushed (block 5c)
  if (helm && helm.dive !== 0 && s.dive === depth && submerged(s)) {
    const d = shipModel(s).dive;
    if (d && hullBlocked(g.map, s, s.x, s.dive + Math.sign(helm.dive) * 2))
      bumpShip(s, Math.abs(helm.dive) * (helm.dive > 0 ? d.sinkSpeed : d.riseSpeed), events);
  }
  stepShipHull(s, sea, top, dt, events);
  // on the waves: a body floating on its bow and stern (ride.ts); under water a U-Boat no longer feels them
  if (submerged(s)) settleRide(s.ride);
  else stepRide(s.ride, s.x, s.face, shipLength(s), sea, t, dt);
  changed.push(...refreeze(g.map, s.broken, dt, far));

  // no air left under water: you lose hearts aboard; dead, you are out of it and the empty U-Boat comes up
  if (s.aboard && submerged(s) && s.air <= 0 && chokeAboard(g.diver, SHIP.dive.hurtEvery, dt, events))
    s.aboard = false;
  if (s.aboard) {
    const p = helmPoint(s);
    Object.assign(g.diver, { x: p.x, y: p.y, vx: s.face * s.speed, vy: 0, face: s.face });
  }
  return changed;
}
