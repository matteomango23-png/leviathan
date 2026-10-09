// One step of the whole game: diver, weapons, fish, beasts, backpack, wrecks, port and missions.
// Pure logic: no Phaser here, so it can be tested and reused.
import { FEEDING, TEAM_RULES } from '../data/beasts';
import {
  clearTarget,
  newGadgets,
  pickTarget,
  sendSphere,
  startRecon,
  stepGadgets,
  type GadgetsState,
} from './ship/gadgets';
import { XP_RULES } from '../data/progression';
import { DIVER, SARDINE } from '../data/diver';
import { START, TILE, WORLD } from '../data/worldLayout';
import { beastEats } from './feeding';
import { refillTanks, tankRanOut } from './breath';
import { rideTank, type RideTanks } from './rideAir';
import { bodyCircles, headOf } from './beasts/combat';
import { formName } from './beasts/forms';
import { isInWater } from './beasts/wildState';
import {
  activeBeast,
  beastAction,
  contextAction,
  createBeasts,
  mountSpeed,
  stepBeasts,
  weaponHitsBeast,
} from './beastPlay';
import { createDiver, stepDiver } from './diver';
import { catchFish, markSeen } from './catching';
import { stepSwarmCooldowns, useSlot } from './economy/backpack';
import { diverModifiers, newGear, sellBag } from './economy/gear';
import { feedBeast, fishXp, gainXp, isHungry } from './beasts/growth';
import { maxHpOf } from './beasts/team';
import { signalMissions } from './economy/missions';
import { createStory, stepStory, storyHoldsDiver, type StoryWorld } from './story';
import { stepProgress } from './progress';
import { needsStarter } from './starter';
import { BLACKOUT } from '../data/battle';
import {
  atPort,
  discoverOutposts,
  nearWreck,
  openWreck,
  placeWrecks,
  portAt,
  portStart,
  type Wreck,
} from './economy/places';
import { PORT, PORTS, type PortDef } from '../data/economy';
import type { GameEvent } from './events';
import { createFish, stepFish, takeFish, type FishState } from './fish';
import { createHarpoon, fireHarpoon, stepHarpoon, type HarpoonState } from './harpoon';
import type { InputState } from './input';
import { makeRng } from './math';
import { newSave, type SaveData } from './save/saveData';
import { restoreGear, restoreTeam } from './save/convert';
import { createWeapons, fireProjectileWeapon, stepProjectiles, type WeaponState } from './weapons';
import type { TileMap } from './world/tileMap';
import { zoneAt } from './world/zones';
import { regionAt } from './world/stretches';
import { ENDLESS } from '../data/endless';
import { zoneKey } from './seaMap';
import { stepEndlessSchools, stepVents } from './endlessLife';
import { shipModel } from './ship/model';
import { board, canBoard, leaveSub, newSub, ramSub, repairSub, subModel, type SubState } from './submarine';
import { dismount } from './beastState';
import { rescue } from './fuel';
import { addHuntSlots, hearRumours, placeDens, stepHunts, type Den, type HuntsState } from './hunts';
import { createWeather, type WeatherState } from './weather';
import { newShip, type ShipState } from './ship/ship';
import { newBoat, type BoatState } from './boat';
import type { MooredShip } from './ship/shipyard';
import { helmPoint } from './ship/geometry';
import { canDock } from './ship/hatch';
import {
  doVehicleAction,
  inVehicle,
  onRamp,
  pushOutOfVehicles,
  shipPort,
  stepVehicles,
  vehicleAction,
  wakeOnShip,
} from './vehicles';
import { createTemples, hitLever, stepTemples, type TempleState } from './temple';

export { toSave } from './save/convert';

export interface GameState extends StoryWorld {
  time: number;
  playTime: number;
  zone: string;
  harpoon: HarpoonState;
  weapons: WeaponState;
  fish: FishState;
  fishCaught: Record<string, number>;
  wrecks: Wreck[];
  /** True while the diver floats at a pier; `port` says which. */
  atPort: boolean;
  port: PortDef | null;
  /** The last harbour you came into: you wake up there without a ship (saved). */
  homePort: PortDef['id'];
  /** Your submarine (Aurelio's gift at Porto Fango; saved). */
  sub: SubState;
  /** Your expedition ship (Aurelio's gift at Porto Fango; saved). */
  ship: ShipState;
  /** Its speedboat or jet ski (block 4b; saved). */
  boat: BoatState;
  /** Your other ships, moored at Porto Fango (saved). */
  fleet: MooredShip[];
  /** The puzzles of the sunken temples in progress (not saved). */
  temples: TempleState;
  /** Seconds before your big beast can eat the next fish (not saved). */
  timers: { feed: number; vent: number };
  /** The air of the whales of your team, which you breathe while riding them (breath.ts, not saved). */
  rideTanks: RideTanks;
  /** The weather above the sea (weather.ts, not saved; the World scene steps it). */
  weather: WeatherState;
  /** The hunts in the diary (saved) and the dens in the world. */
  hunts: HuntsState;
  dens: Den[];
  /** The hunt you follow (pinned in the diary; saved). */
  huntPinned: string | null;
  /** The Ocean's Nightmare's drone and sphere, and the beast you follow (ship/gadgets.ts; the beast saved). */
  gadgets: GadgetsState;
}

function applyBrokenTiles(map: TileMap, tiles: number[]): void {
  for (const i of tiles) {
    const { tx, ty } = map.tileOf(i);
    const t = map.get(tx, ty);
    if (t === TILE.bone || t === TILE.gate) map.set(tx, ty, TILE.water); // bones broken, temple gates opened
  }
}

export function createGame(map: TileMap, save: SaveData | null, seed = Date.now()): GameState {
  const rng = makeRng(seed);
  const s = save ?? newSave(START);
  applyBrokenTiles(map, s.brokenTiles);
  const diver = createDiver(s.diver.x, s.diver.y);
  // A save inside rock (e.g. the world changed) falls back to the start.
  if (map.hitCircle(diver.x, diver.y, DIVER.radius)) Object.assign(diver, createDiver());
  const gear = s.gear ? restoreGear(s.gear) : newGear();
  diver.maxHp = diverModifiers(gear).maxHp;
  diver.hp = diver.maxHp;
  const beasts = createBeasts(restoreTeam(s), s.legendsGone);
  const dens = placeDens(map);
  addHuntSlots(beasts.wilds, dens); // the legends and giants in their dens (hunts.ts)
  const g: GameState = {
    map,
    rng,
    time: 0,
    playTime: s.playTime,
    zone: '',
    diver,
    harpoon: createHarpoon(),
    weapons: createWeapons(),
    fish: createFish(map, rng),
    fishCaught: { ...s.fishCaught },
    seen: new Set(s.seen),
    beasts,
    brokenTiles: [...s.brokenTiles],
    gear,
    swarmCooldowns: {},
    wrecks: placeWrecks(map),
    atPort: false,
    port: null,
    homePort: PORTS.find((p) => p.id === s.homePort)?.id ?? 'portofosco',
    sub: newSub(s.sub),
    ship: newShip(s.ship),
    boat: newBoat(s.boat),
    fleet: structuredClone(s.fleet ?? []),
    timers: { feed: 0, vent: 0 },
    rideTanks: {},
    weather: createWeather(undefined, s.weather),
    hunts: structuredClone(s.hunts ?? {}),
    huntPinned: s.huntPinned ?? null,
    gadgets: newGadgets(s.target ?? null),
    dens,
    temples: createTemples(),
    story: createStory(s.story, save !== null, !!s.ship),
  };
  matchSubToShip(g);
  return g;
}

/** Each ship comes with its own submarine (8 ottobre): a save whose submarine is not its ship's gets its ship's. */
function matchSubToShip(g: GameState): void {
  const bay = g.ship.owned ? shipModel(g.ship).bays.find((b) => b.kind === 'sub') : undefined;
  if (!bay || !g.sub.owned || g.sub.model === bay.model) return;
  const m = subModel(bay.model);
  Object.assign(g.sub, { model: m.id, models: [m.id], hull: m.hull, fuel: m.tank, air: m.airSeconds });
}

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

function doAction(g: GameState, events: GameEvent[]): void {
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

function fire(g: GameState, input: InputState, events: GameEvent[]): void {
  const d = g.diver;
  if (d.dead || g.beasts.riding) return; // in the saddle you do not shoot
  let angle: number | null = null;
  if (input.shotAt) angle = Math.atan2(input.shotAt.y - d.y, input.shotAt.x - d.x);
  else if (input.fireHeld) angle = input.aim ?? d.aim;
  if (angle === null) return;
  const weapon = g.gear.activeWeapon;
  const fired =
    weapon === 'arpione'
      ? fireHarpoon(g.harpoon, d, angle, events)
      : fireProjectileWeapon(g.weapons, weapon, d.x, d.y, angle, events);
  if (fired && !g.beasts.riding && Math.abs(Math.cos(angle)) > 0.2) d.face = Math.cos(angle) > 0 ? 1 : -1;
}

export function stepGame(g: GameState, input: InputState, dt: number): GameEvent[] {
  const events: GameEvent[] = g.story.pending.splice(0);
  // the sea waits while a dialogue is on screen, a battle is on or you are choosing your first beast
  if (g.story.dialogue || g.beasts.battle || needsStarter(g)) return events;
  g.time += dt;
  g.playTime += dt;
  const d = g.diver;
  const mods = diverModifiers(g.gear);
  if (d.maxHp !== mods.maxHp) {
    d.maxHp = mods.maxHp;
    d.hp = Math.min(d.hp, d.maxHp);
  }

  if (input.action) doAction(g, events);
  if (input.helmCmd === 'rescue') rescue(g, events); // the flare (fuel.ts)
  if (input.helmCmd === 'recon') startRecon(g, events);
  if (input.helmCmd === 'sphere') sendSphere(g, events);
  const picked = g.gadgets.recon.report?.[input.pickTarget];
  if (picked) pickTarget(g, picked, events);
  if (input.clearTarget) clearTarget(g);
  stepGadgets(g, dt, events);
  if (input.slot >= 0) useSlot(g, input.slot, events);
  stepSwarmCooldowns(g, dt);

  const held = storyHoldsDiver(g); // on Aurelio's boat during the opening
  const aboard = !held && stepVehicles(g, input, dt, events); // your ship or your submarine moves you
  g.beasts.aboard = aboard;
  const tank = rideTank(g, g.rideTanks, d.maxO2);
  refillTanks(g.rideTanks, tank, dt);
  if (!held && !aboard) {
    stepDiver(d, input, g.map, dt, g.rng, events, {
      respawnAt: respawnPoint(g),
      mountSpeed: mountSpeed(g),
      mountAccelMult: TEAM_RULES.accelMult,
      mountDash: TEAM_RULES.rideDash,
      mountSprint: TEAM_RULES.rideSprintMult,
      speedMult: mods.speedMult,
      o2DrainMult: mods.o2DrainMult,
      canDash: mods.canDash,
      maxDepthY: WORLD.surfaceY + mods.maxDepthM * WORLD.unitsPerMetre,
      body: g.beasts.riding && g.beasts.mount ? bodyCircles(g.beasts.mount) : undefined,
      air: tank,
    });
    const whale = activeBeast(g);
    if (tankRanOut(tank) && whale) events.push({ type: 'rideAirOut', name: formName(whale.form) });
  }
  // the submarine is solid: you (or the beast you ride) slide along its hull
  if (!inVehicle(g) && !held)
    pushOutOfVehicles(
      g,
      d,
      g.beasts.riding && g.beasts.mount ? bodyCircles(g.beasts.mount) : [{ dx: 0, dy: 0, r: DIVER.radius }],
    );
  // after losing your senses you wake up on your boat
  if (events.some((e) => e.type === 'respawned')) wakeOnShip(g, events);
  stepVents(d, dt, g.timers, events);
  // never stuck in rock (a dismount, a tail swipe or being thrown off can drop you there)
  if (!held && !aboard && !d.dead && !g.beasts.riding && g.map.hitCircle(d.x, d.y, DIVER.radius))
    Object.assign(d, g.map.nearestOpen(d.x, d.y, DIVER.radius + 1));
  if (!held && !aboard) fire(g, input, events); // aboard, the weapon button fishes
  const hitBeast = (x: number, y: number): boolean =>
    hitLever(g, x, y, events) || weaponHitsBeast(g, x, y, events);
  const fishMark = events.length; // fish caught from here on are experience (below)
  const caught = stepHarpoon(g.harpoon, d, g.fish, g.map, dt, events, hitBeast);
  if (caught) catchFish(g, caught, events);
  stepProjectiles(g.weapons, g.fish, g.map, dt, {
    catchFish: (f) => catchFish(g, f, events),
    hitBeast,
  });

  const beastEvents: GameEvent[] = [];
  stepBeasts(g, input, dt, beastEvents);
  // …and the beasts slide along the submarine too (the ship passes them by): wild ones, and yours with you
  for (const w of g.beasts.wilds) if (isInWater(w)) pushOutOfVehicles(g, w, bodyCircles(w), true);
  const follower = g.beasts.mount;
  if (follower && !g.beasts.riding) pushOutOfVehicles(g, follower, bodyCircles(follower), true);
  events.push(...beastEvents);
  for (const e of beastEvents) {
    if (e.type === 'bonesBroken') g.brokenTiles.push(...e.tiles);
    if (e.type === 'subRammedBy') ramSub(g, e.lengthM, e.x, e.y, events); // a big beast against the hull
  }
  if (beastEvents.some((e) => e.type === 'noTeam')) blackout(g, events);
  stepHunts(g, events);

  const eater = activeBeast(g);
  const eaten = beastEats(g.beasts.mount, eater, g.fish, g.timers, dt);
  // every fish caught or eaten is experience for the beast in the water (or the first of the team)
  const fed = eater ?? g.beasts.team[0];
  const fishCaught =
    events.slice(fishMark).filter((e) => e.type === 'fishCaught').length +
    Math.min(eaten.length, XP_RULES.fishPerBiteMax);
  if (fed && fishCaught > 0) gainXp(fed, fishXp(fed.level) * fishCaught, events);
  // a growing beast (levels 31–50) keeps the fish for its nourishment bar; the rest go in your bag
  for (const f of eaten) {
    if (eater && isHungry(eater)) {
      takeFish(f);
      feedBeast(eater, events);
    } else catchFish(g, f, events);
  }
  const m = g.beasts.mount;
  if (m && eaten.length >= FEEDING.gulpFrom) {
    const h = headOf(m);
    events.push({ type: 'beastGulp', x: h.x, y: h.y, count: eaten.length });
  }
  stepFish(g.fish, g.map, { x: d.x, y: d.y, alive: !d.dead }, g.time, dt, g.rng);
  stepEndlessSchools(g.fish, g.map, d, g.rng);
  for (const f of g.fish.fish) {
    if (f.alive && !d.dead && Math.hypot(f.x - d.x, f.y - d.y) < SARDINE.seenRadius) {
      markSeen(g, f.kind, events);
      break;
    }
  }

  g.port = g.ship.aboard || g.boat.aboard ? shipPort(g) : portAt(d, g.map);
  discoverOutposts(g, events);
  g.atPort = g.port !== null;
  stepProgress(g, events);
  stepStory(g, dt, events);
  stepTemples(g, events);
  for (const e of events) if (e.type === 'gateOpened') g.brokenTiles.push(...e.tiles);
  const zone = zoneAt(d.x, d.y);
  if (zone && zone !== g.zone) {
    g.zone = zone;
    g.seen.add(zoneKey(zone)); // for the sea map
    if (d.x >= ENDLESS.startX) g.seen.add(zoneKey(regionAt(d.x).name)); // the region's tab of the map
    events.push({ type: 'zoneEntered', name: zone });
  }
  return events;
}

/**
 * Like Pokémon: a beast touched you with every beast of yours KO. You black out and wake up on your ship (or at
 * your harbour) with everyone healed, a few teeth lost on the way.
 */
export function blackout(g: GameState, events: GameEvent[]): void {
  const at = respawnPoint(g);
  const d = g.diver;
  Object.assign(d, { x: at.x, y: at.y, vx: 0, vy: 0, hp: d.maxHp, o2: d.maxO2 });
  d.invulnerable = DIVER.invulnerableAfterRespawn;
  for (const b of g.beasts.team) {
    b.hp = maxHpOf(b);
    b.ko = false;
    b.ppUsed = undefined; // PP back to full, like a Pokémon Center
    b.status = undefined;
    b.sleepTurns = undefined;
  }
  if (g.beasts.riding) g.beasts.riding = false;
  const teethLost = Math.floor(g.gear.teeth * BLACKOUT.teethLoss);
  g.gear.teeth -= teethLost;
  if (g.sub.aboard) g.sub.aboard = false; // the submarine stays where it was
  const onShip = wakeOnShip(g, events);
  // "sulla tua nave" / "a Portofosco"
  const place = onShip ? 'sulla tua nave' : `a ${(PORTS.find((p) => p.id === g.homePort) ?? PORT).name}`;
  events.push({ type: 'blackout', teethLost, place });
}

/** Arriving at a harbour: everyone is healed, the market restocks, you wake up here. */
export function enterPort(g: GameState, events: GameEvent[] = []): void {
  restAtPort(g);
  repairSub(g, events);
  if (g.port) hearRumours(g.hunts, g.port, events); // the people of the harbour talk
  g.gear.shopBought = {};
}

/** Resting at the port (also the "Riposa" button): you and the team healed, you wake up here next time. */
export function restAtPort(g: GameState): void {
  const d = g.diver;
  if (g.port) g.homePort = g.port.id;
  d.hp = d.maxHp;
  d.o2 = d.maxO2;
  for (const b of g.beasts.team) {
    b.hp = maxHpOf(b);
    b.ko = false;
    b.ppUsed = undefined; // PP back to full, like a Pokémon Center
    b.status = undefined;
    b.sleepTurns = undefined;
  }
}

/** Sells the fish bag at the market; counts for "sell" missions. */
export function sellAtPort(g: GameState): { count: number; teeth: number; completed: string[] } {
  const r = sellBag(g.gear);
  const completed = r.count > 0 ? signalMissions(g.gear, { kind: 'sell', count: r.count }) : [];
  return { ...r, completed };
}

/** Replaces progress with an imported save (rebuilds the game on the same map). */
export function applySave(g: GameState, save: SaveData): void {
  const fresh = createGame(g.map, save, 1);
  Object.assign(g, fresh, { map: g.map, rng: g.rng, time: g.time });
}
