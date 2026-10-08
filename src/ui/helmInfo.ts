// What the levers drive now and what the instruments show, read from the game (ui/helmControls.ts draws them).
import { shipModel, sonarMaxKnots } from '../systems/ship/model';
import { WORLD } from '../data/worldLayout';
import { autonomyKm } from '../systems/fuelBurn';
import type { GameState } from '../systems/game';
import { knotsOf } from '../systems/helm';
import { launchShown } from '../systems/ship/hatch';
import { hatchCanMove } from '../systems/ship/ship';
import { subModel } from '../systems/submarine';
import { onRamp } from '../systems/vehicles';
import { huntNextStep, huntOpen, sonarReadout } from '../systems/hunts';
import { HUNTS } from '../data/hunts';
import type { HelmInfo } from './helmControls';

/** The sonar line at the helm: off, too fast, or the floor under the ship and the nearest echoes. */
function sonarLine(g: GameState): string {
  const r = sonarReadout(g, 2);
  if (r.status === 'off') return 'Sonar spento · tocca per accenderlo';
  if (r.status === 'fast') return `Sonar: troppo veloce (sotto ${sonarMaxKnots(g.ship)} nodi)`;
  // the den's echo first, then how many beasts it hears (owner, 5 ottobre: the sea is full now)
  const odd = r.echoes
    .filter((e) => e.label === 'eco anomala')
    .slice(0, 1)
    .map((e) => `eco anomala ${e.dx < 0 ? '◀' : '▶'} ${Math.abs(e.dx)} m, a ${e.depthM} m`);
  const big = r.echoes.filter((e) => e.label === 'eco grande').length;
  const all = r.echoes.filter((e) => e.label !== 'eco anomala').length;
  const life = all ? [`${all} animali${big ? ` (${big} grandi)` : ''}`] : [];
  return [`Sonar: fondale ${r.floorM} m`, ...life, ...odd].join(' · ');
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
      rangeKm: autonomyKm(s.fuel, shipModel(s).perKm, throttle),
      sonar: sonarLine(g),
      sonarOn: s.sonarOn,
      objective: objectiveLine(g),
      hatchCanMove: hatchCanMove(s),
      hatchOpen: s.hatchOpen,
      canLaunch: launchShown(g),
      engineOn: s.engineOn,
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
