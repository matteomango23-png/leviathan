// What the levers drive now and what the instruments show, read from the game (ui/helmControls.ts draws them).
import { SHIP } from '../data/ship';
import { WORLD } from '../data/worldLayout';
import { autonomyKm } from '../systems/fuelBurn';
import type { GameState } from '../systems/game';
import { knotsOf } from '../systems/helm';
import { canLaunch } from '../systems/ship/hatch';
import { hatchCanMove } from '../systems/ship/ship';
import { subModel } from '../systems/submarine';
import { onRamp } from '../systems/vehicles';
import type { HelmInfo } from './helmControls';

/** @param throttle where the throttle lever is now (the autonomy is at that pace) */
export function helmInfo(g: GameState, throttle = 1): HelmInfo | null {
  const s = g.ship;
  if (s.aboard)
    return {
      mode: 'ship',
      face: s.face,
      knots: knotsOf(s.speed),
      fuel: s.fuel,
      rangeKm: autonomyKm(s.fuel, SHIP.fuel.perKm, throttle),
      hatchCanMove: hatchCanMove(s),
      hatchOpen: s.hatchOpen,
      canLaunch: canLaunch(g),
    };
  if (g.sub.aboard && !onRamp(g))
    return {
      mode: 'sub',
      face: g.sub.face,
      knots: knotsOf(Math.hypot(g.sub.vx, g.sub.vy)),
      fuel: g.sub.fuel,
      rangeKm: autonomyKm(g.sub.fuel, subModel(g.sub.model).perKm, throttle),
      depthM: Math.max(0, (g.sub.y - WORLD.surfaceY) / WORLD.unitsPerMetre),
      maxDepthM: subModel(g.sub.model).maxDepthM,
    };
  return null;
}
