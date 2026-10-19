// What you do with the buttons (split from game.ts in the cleanup of 19 ottobre 2026): the context button (open a
// wreck, the port, into the submarine, on board, the beast's action), the shot, whether you can dash, where you wake
// up.
import { beastAction, contextAction } from './beastPlay';
import { diverModifiers } from './economy/gear';
import { storyHoldsDiver } from './story';
import { needsStarter } from './starter';
import { atPort, nearWreck, openWreck, portStart } from './economy/places';
import { PORT, PORTS } from '../data/economy';
import { DIVER } from '../data/diver';
import type { GameEvent } from './events';
import { fireHarpoon } from './harpoon';
import type { InputState } from './input';
import { fireProjectileWeapon } from './weapons';
import { board, canBoard, leaveSub } from './submarine';
import { dismount } from './beastState';
import { helmPoint } from './ship/geometry';
import { canDock } from './ship/hatch';
import { doVehicleAction, inVehicle, onRamp, shipPort, vehicleAction } from './vehicles';
import type { GameState } from './newGame';

/** Where you wake up (owner, 4 ottobre: you heal only on the ship and at the port): your ship, or your harbour. */
export function respawnPoint(g: GameState): { x: number; y: number } {
  if (g.ship.owned) return helmPoint(g.ship);
  return portStart(PORTS.find((p) => p.id === g.homePort) ?? PORT);
}

/** Is there a dash now? Not in the submarine, nor in a suit without one (the palombaro), unless you ride a beast. */
export function canDashNow(g: GameState): boolean {
  if (inVehicle(g)) return false;
  return g.beasts.riding || diverModifiers(g.gear).canDash;
}

/** What the context button does right now. */
export type Action =
  ReturnType<typeof contextAction> | 'porto' | 'apri' | 'sali' | 'esci' | 'aggancia' | 'abordo';
export function currentAction(g: GameState): Action {
  if (storyHoldsDiver(g) || g.story.dialogue || g.beasts.battle || needsStarter(g)) return null;
  const d = g.diver;
  if (g.ship.aboard) return shipPort(g) ? 'porto' : null; // the rest is on the helm's own buttons
  if (onRamp(g)) return null;
  if (g.sub.aboard) return canDock(g) ? 'aggancia' : atPort(d, g.map) ? 'porto' : 'esci';
  if (g.boat.aboard) return vehicleAction(g) ?? (shipPort(g) ? 'porto' : null);
  // a chest first, even while riding
  if (!d.dead && nearWreck(g.wrecks, g.gear, d.x, d.y)) return 'apri';
  const beast = contextAction(g);
  if (beast === 'sfonda') return beast;
  // next to your submarine you climb in, even at the pier (it was moored there and the port button hid it)
  if (g.ship.bay !== 'docked' && canBoard(g)) return 'sali'; // in the hold it is reached from the helm
  const vehicle = vehicleAction(g); // by the ship's hull: A bordo
  if (vehicle) return vehicle;
  if (!g.beasts.riding && atPort(d, g.map)) return 'porto';
  return beast;
}

/** The context button pressed (stepGame). */
export function doAction(g: GameState, events: GameEvent[]): void {
  const act = currentAction(g);
  const d = g.diver;
  if (act === 'apri') {
    const w = nearWreck(g.wrecks, g.gear, d.x, d.y);
    const loot = w && openWreck(w, g.gear);
    if (w && loot) events.push({ type: 'wreckOpened', id: w.def.id, ...loot });
  } else if (act === 'porto') events.push({ type: 'portArrived' });
  else if (act === 'sali') {
    dismount(g, events); // your beast swims off, you climb in
    board(g, events);
  } else if (act === 'esci') leaveSub(g, events);
  else if (act === 'aggancia' || act === 'abordo') {
    if (act === 'abordo') dismount(g, events);
    doVehicleAction(g, act, events);
  } else beastAction(g, events);
}

/** The shot, aimed or tapped (stepGame). */
export function fire(g: GameState, input: InputState, events: GameEvent[]): void {
  const d = g.diver;
  if (d.dead || g.beasts.riding) return; // in the saddle you do not shoot
  let angle: number | null = null;
  if (input.shotAt) angle = Math.atan2(input.shotAt.y - d.y, input.shotAt.x - d.x);
  else if (input.fireHeld) angle = input.aim ?? d.aim;
  if (angle === null) return;
  const weapon = g.gear.activeWeapon;
  const fired =
    weapon === 'arpione'
      ? fireHarpoon(g.harpoon, d, angle, events, [
          ...g.fish.fish.filter((f) => f.alive && !f.hooked),
          ...g.beasts.wilds.filter((w) => w.motion === 'roam'),
        ])
      : fireProjectileWeapon(g.weapons, weapon, d.x, d.y, angle, events);
  // he turns to the shot (and while the aim is held, to where it points) and keeps facing it a moment, swimming
  // backwards meanwhile: no flip back the next frame, nor between two shots (owner, 19 ottobre)
  const aiming = input.fireHeld && input.aim !== null;
  if ((fired || aiming) && Math.abs(Math.cos(angle)) > 0.2) {
    d.face = Math.cos(angle) > 0 ? 1 : -1;
    d.faceHold = DIVER.aimHoldSeconds;
  }
}
