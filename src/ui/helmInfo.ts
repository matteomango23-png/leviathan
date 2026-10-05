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
import { huntNextStep, huntOpen, sonarReadout } from '../systems/hunts';
import { HUNTS } from '../data/hunts';
import type { HelmInfo } from './helmControls';

/** The sonar line at the helm: off, too fast, or the floor under the ship and the nearest echoes. */
function sonarLine(g: GameState): string {
  const r = sonarReadout(g, 2);
  if (r.status === 'off') return 'Sonar spento';
  if (r.status === 'fast') return `Sonar: troppo veloce (sotto ${SHIP.sonar.maxKnots} nodi)`;
  const echoes = r.echoes
    .slice(0, 2)
    .map((e) => `${e.label} ${e.dx < 0 ? '◀' : '▶'} ${Math.abs(e.dx)} m, a ${e.depthM} m`);
  return [`Sonar: fondale ${r.floorM} m`, ...echoes].join(' · ');
}

/** The hunt you follow, in one line. */
function objectiveLine(g: GameState): string | undefined {
  const h = HUNTS.find((x) => x.id === g.huntPinned);
  if (!h || !huntOpen(h, g.beasts.gone, g.beasts.team)) return undefined;
  return `🎯 ${h.name}: ${huntNextStep(h, g.hunts[h.id])}`;
}

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
      sonar: sonarLine(g),
      sonarOn: s.sonarOn,
      objective: objectiveLine(g),
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
      hull: [g.sub.hull, subModel(g.sub.model).hull],
    };
  return null;
}
