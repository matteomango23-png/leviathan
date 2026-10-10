// What the levers drive now and what the instruments show, read from the game (ui/helmControls.ts draws them).
import { shipModel, sonarMaxKnots } from '../systems/ship/model';
import { canDiveFromBoat } from '../systems/boatCrew';
import { WORLD } from '../data/worldLayout';
import { autonomyKm } from '../systems/fuelBurn';
import type { GameState } from '../systems/game';
import { knotsOf } from '../systems/helm';
import { launchShown } from '../systems/ship/hatch';
import { hatchCanMove, hatchOpening } from '../systems/ship/ship';
import { boatBay, subBay } from '../systems/ship/model';
import { boatLaunchShown, boatName, boatOnRamp } from '../systems/ship/boatBay';
import { boatModel } from '../systems/boat';
import { SHIP_MODELS } from '../data/fleet';
import { SHIP } from '../data/ship';
import { keelDepthM } from '../systems/ship/uboat';
import { canRecon, canSendSphere, hasDrone, reconOut, sphereBay, sphereOut } from '../systems/ship/gadgets';
import { subModel } from '../systems/submarine';
import { onRamp } from '../systems/vehicles';
import { huntNextStep, huntOpen, sonarReadout } from '../systems/hunts';
import { HUNTS } from '../data/hunts';
import type { HelmInfo } from './helmTypes';
import { CLASS_PLURAL } from '../systems/echoClass';
import { trackerTarget } from '../systems/trackerDart';
import { drawnCount } from '../systems/ship/underLight';
import { hullMax } from '../systems/ship/shipHull';

/** The sonar line at the helm: off, too fast, or the floor under the ship and the nearest echoes. */
function sonarLine(g: GameState): string {
  const r = sonarReadout(g, 2);
  if (r.status === 'off') return 'Sonar'; // owner, 9 ottobre: just its name; lit up and talking when on
  if (r.status === 'fast') return `Sonar: troppo veloce (sotto ${sonarMaxKnots(g.ship)} nodi)`;
  // the den's echo first, then how many beasts it hears (owner, 5 ottobre: the sea is full now)
  const odd = r.echoes
    .filter((e) => e.label === 'eco anomala')
    .slice(0, 1)
    .map((e) => `eco anomala ${e.dx < 0 ? '◀' : '▶'} ${Math.abs(e.dx)} m, a ${e.depthM} m`);
  // how many of each big size, as far as this ship's sonar tells (block 5a)
  const beasts = r.echoes.filter((e) => e.cls);
  const sizes = (['grande', 'enorme', 'leggendaria'] as const)
    .map((c) => [c, beasts.filter((e) => e.cls === c).length] as const)
    .filter(([, n]) => n > 0)
    .map(([c, n]) => `${n} ${n === 1 ? c : CLASS_PLURAL[c]}`);
  const life = beasts.length
    ? [`${beasts.length} animali${sizes.length ? ` (${sizes.join(', ')})` : ''}`]
    : [];
  // the light under the ship: how many it has called (block 5b)
  const called = g.ship.lightOn ? [`luce accesa: ${drawnCount(g)} in arrivo`] : [];
  return [`Sonar: fondale ${r.floorM} m`, ...life, ...called, ...odd].join(' · ');
}

/** The hunt you follow, in one line. */
function objectiveLine(g: GameState): string | undefined {
  const h = HUNTS.find((x) => x.id === g.huntPinned);
  if (!h || !huntOpen(h, g.beasts.gone, g.beasts.team)) return undefined;
  return `🎯 ${h.name}: ${huntNextStep(h, g.hunts[h.id])}`;
}

/** What its submarine is called: the Ocean's Nightmare's is a drone. */
/** "Invia sfera", or the time left to recharge it. */
function sphereButton(g: GameState): { text: string; ready: boolean } {
  const c = Math.ceil(g.gadgets.sphere.cooldown);
  return c > 0
    ? { text: `Sfera ${Math.floor(c / 60)}:${String(c % 60).padStart(2, '0')}`, ready: false }
    : { text: 'Invia sfera', ready: true };
}

const subName = (g: GameState): string => (hasDrone(g) ? 'drone' : 'sottomarino');

/** The hatch buttons: "Apri portellone", or with two bays which one, short ("Apri motoscafo", "Apri sfera"). */
function hatchButtons(g: GameState): ({ text: string; open: boolean } | null)[] {
  const s = g.ship;
  const bays = (SHIP_MODELS.find((m) => m.id === s.model) ?? SHIP_MODELS[0]!).bays;
  return s.hatches.map((_, i) => {
    // the drone's and the sphere's hatches stay open while they are out (you close them once they are back)
    if ((i === subBay(s) && reconOut(g)) || (i === sphereBay(s) && sphereOut(g))) return null;
    const open = hatchOpening(s, i);
    const what =
      bays.length < 2
        ? 'portellone'
        : i === boatBay(s)
          ? boatName(s).replace(/^(Il|La) /, '')
          : i === sphereBay(s)
            ? 'sfera'
            : subName(g);
    return { text: `${open ? 'Chiudi' : 'Apri'} ${what}`, open };
  });
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
      tank: shipModel(s).tank,
      still: s.speed < SHIP.stillBelow,
      rangeKm: autonomyKm(s.fuel, shipModel(s).perKm, throttle),
      sonar: sonarLine(g),
      sonarOn: s.sonarOn,
      lightOn: s.lightOn,
      // its hull (block 5c): the bar, and broken down
      hull: [s.hull, hullMax(s)],
      broken: s.hull <= 0,
      objective: objectiveLine(g),
      hatchCanMove: hatchCanMove(s) && !boatOnRamp(g),
      hatches: hatchButtons(g),
      canLaunch: launchShown(g) && !reconOut(g),
      subName: subName(g),
      canRecon: canRecon(g),
      canDiveOff: !reconOut(g),
      ...(canSendSphere(g) ? { sphere: sphereButton(g) } : {}),
      canLaunchBoat: boatLaunchShown(g),
      boatName: boatName(s)
        .replace(/^(Il|La) /, '')
        .toLowerCase(),
      engineOn: s.engineOn,
      ...(shipModel(s).dive
        ? {
            canDive: true,
            depthM: keelDepthM(s), // its keel: what the model's limit counts
            maxDepthM: shipModel(s).dive!.maxDepthM,
            air: s.air,
            airMax: shipModel(s).dive!.airSeconds,
          }
        : {}),
    };
  const b = g.boat;
  if (b.aboard && !boatOnRamp(g))
    return {
      mode: 'boat',
      face: b.face,
      knots: knotsOf(b.speed),
      fuel: b.fuel,
      tank: boatModel(b.model).tank,
      rangeKm: autonomyKm(b.fuel, boatModel(b.model).perKm, throttle),
      drums: [b.drums, boatModel(b.model).drums],
      engineOn: b.engineOn,
      canDiveOff: canDiveFromBoat(g),
      hull: [b.hull, boatModel(b.model).hull],
    };
  if (g.sub.aboard && !onRamp(g))
    return {
      mode: 'sub',
      face: g.sub.face,
      knots: knotsOf(Math.hypot(g.sub.vx, g.sub.vy)),
      fuel: g.sub.fuel,
      tank: subModel(g.sub.model).tank,
      rangeKm: autonomyKm(g.sub.fuel, subModel(g.sub.model).perKm, throttle),
      depthM: Math.max(0, (g.sub.y - WORLD.surfaceY) / WORLD.unitsPerMetre),
      maxDepthM: subModel(g.sub.model).maxDepthM,
      hull: [g.sub.hull, subModel(g.sub.model).hull],
      air: g.sub.air,
      airMax: subModel(g.sub.model).airSeconds,
      canTrack: !!trackerTarget(g),
    };
  return null;
}
