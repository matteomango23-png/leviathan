// One step of the whole game: diver, weapons, fish, beasts, backpack, wrecks, port and missions.
// Pure logic: no Phaser here, so it can be tested and reused.
import { TEAM_RULES } from '../data/beasts';
import { DIVER, SARDINE } from '../data/diver';
import { START, TILE, WORLD } from '../data/worldLayout';
import { beastEats } from './feeding';
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
import { feedBeast, isHungry } from './beasts/growth';
import { maxHpOf } from './beasts/team';
import { signalMissions } from './economy/missions';
import { createGuardian, guardianReturns, stepGuardian, teamHasGuardian } from './guardian';
import { createStory, stepStory, storyHoldsDiver } from './story';
import { createChapter2, hitAnchor, stepChapter2, type Chapter2World } from './chapter2';
import { stepProgress } from './progress';
import { needsStarter } from './starter';
import { BLACKOUT } from '../data/battle';
import { atPort, nearWreck, openWreck, placeWrecks, portAt, portStart, type Wreck } from './economy/places';
import { PORT, PORTS, type PortDef } from '../data/economy';
import type { GameEvent } from './events';
import { createFish, stepFish, takeFish, type FishState } from './fish';
import { BASE_HARPOON, createHarpoon, fireHarpoon, stepHarpoon, type HarpoonState } from './harpoon';
import type { InputState } from './input';
import { makeRng } from './math';
import { placeSanctuaries } from './sanctuary';
import { newSave, type SaveData } from './save/saveData';
import { restoreGear, restoreTeam } from './save/convert';
import { createWeapons, fireProjectileWeapon, stepProjectiles, type WeaponState } from './weapons';
import type { TileMap } from './world/tileMap';
import { zoneAt } from './world/zones';
import { rideO2Mult } from './abilities';

export { toSave } from './save/convert';

export interface GameState extends Chapter2World {
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
  /** The last harbour you came into: you wake up there when there is no sanctuary to return to (saved). */
  homePort: PortDef['id'];
  /** Seconds before your big beast can eat the next fish (not saved). */
  timers: { feed: number };
}

function applyBrokenTiles(map: TileMap, tiles: number[]): void {
  for (const i of tiles) {
    const tx = i % map.cols;
    const ty = Math.floor(i / map.cols);
    if (map.get(tx, ty) === TILE.bone) map.set(tx, ty, TILE.water);
  }
}

export function createGame(map: TileMap, save: SaveData | null, seed = Date.now()): GameState {
  const rng = makeRng(seed);
  const s = save ?? newSave(START);
  applyBrokenTiles(map, s.brokenTiles);
  const diver = createDiver(s.diver.x, s.diver.y);
  // A save inside rock (e.g. the world changed) falls back to the start.
  if (map.hitCircle(diver.x, diver.y, DIVER.radius)) Object.assign(diver, createDiver());
  const list = placeSanctuaries(map);
  const gear = s.gear ? restoreGear(s.gear) : newGear();
  diver.maxHp = diverModifiers(gear).maxHp;
  diver.hp = diver.maxHp;
  const beasts = createBeasts(restoreTeam(s));
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
    guardian: createGuardian(beasts),
    sanctuaries: {
      list,
      current: s.sanctuary !== null && s.sanctuary < list.length ? s.sanctuary : null,
      inside: null,
      heartProgress: 0,
      healing: false,
    },
    brokenTiles: [...s.brokenTiles],
    gear,
    swarmCooldowns: {},
    wrecks: placeWrecks(map),
    atPort: false,
    port: null,
    homePort: PORTS.find((p) => p.id === s.homePort)?.id ?? 'portofosco',
    timers: { feed: 0 },
    chapter2: createChapter2(map),
    story: createStory(map, s.story, save !== null, teamHasGuardian(beasts.team)),
  };
  return g;
}

export function respawnPoint(g: GameState): { x: number; y: number } {
  const i = g.sanctuaries.current;
  const s = i === null ? undefined : g.sanctuaries.list[i];
  return s ? { x: s.x, y: s.y - 6 } : portStart(PORTS.find((p) => p.id === g.homePort) ?? PORT);
}

/** What the context button does right now. */
export type Action = ReturnType<typeof contextAction> | 'porto' | 'apri';
export function currentAction(g: GameState): Action {
  if (storyHoldsDiver(g) || g.story.dialogue || g.beasts.battle || needsStarter(g)) return null;
  const d = g.diver;
  // a chest first, even while riding
  if (!d.dead && nearWreck(g.wrecks, g.gear, d.x, d.y)) return 'apri';
  const beast = contextAction(g);
  if (beast === 'sfonda') return beast;
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
  else beastAction(g, events);
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
  if (input.slot >= 0) useSlot(g, input.slot, events);
  stepSwarmCooldowns(g, dt);

  const held = storyHoldsDiver(g); // on Aurelio's boat during the opening
  if (!held) {
    stepDiver(d, input, g.map, dt, g.rng, events, {
      respawnAt: respawnPoint(g),
      mountSpeed: mountSpeed(g),
      mountAccelMult: TEAM_RULES.accelMult,
      mountDash: TEAM_RULES.rideDash,
      speedMult: mods.speedMult,
      o2DrainMult: mods.o2DrainMult * rideO2Mult(g),
      canDash: mods.canDash,
      maxDepthY: WORLD.surfaceY + mods.maxDepthM * WORLD.unitsPerMetre,
    });
  }
  // never stuck in rock (a dismount, a tail swipe or being thrown off can drop you there)
  if (!held && !d.dead && !g.beasts.riding && g.map.hitCircle(d.x, d.y, DIVER.radius))
    Object.assign(d, g.map.nearestOpen(d.x, d.y, DIVER.radius + 1));
  if (!held) fire(g, input, events);
  const hitBeast = (x: number, y: number, dmg: number): boolean =>
    hitAnchor(g, x, y, dmg, events) || weaponHitsBeast(g, x, y, events);
  const caught = stepHarpoon(g.harpoon, d, g.fish, g.map, dt, events, (x, y) =>
    hitBeast(x, y, BASE_HARPOON.damage),
  );
  if (caught) catchFish(g, caught, events);
  stepProjectiles(g.weapons, g.fish, g.map, dt, {
    catchFish: (f) => catchFish(g, f, events),
    hitBeast,
  });

  const beastEvents: GameEvent[] = [];
  stepBeasts(g, input, dt, beastEvents);
  events.push(...beastEvents);
  for (const e of beastEvents) if (e.type === 'bonesBroken') g.brokenTiles.push(...e.tiles);
  if (beastEvents.some((e) => e.type === 'noTeam')) blackout(g, events);
  stepGuardian(g, dt, events);

  const eater = activeBeast(g);
  const eaten = beastEats(g.beasts.mount, eater, g.fish, g.timers, dt);
  // a growing beast (levels 31–50) keeps the fish for its nourishment bar
  if (eaten && eater && isHungry(eater)) {
    takeFish(eaten);
    feedBeast(eater, events);
  } else if (eaten) catchFish(g, eaten, events);
  stepFish(g.fish, g.map, { x: d.x, y: d.y, alive: !d.dead }, g.time, dt, g.rng);
  for (const f of g.fish.fish) {
    if (f.alive && !d.dead && Math.hypot(f.x - d.x, f.y - d.y) < SARDINE.seenRadius) {
      markSeen(g, f.kind, events);
      break;
    }
  }

  g.port = portAt(d, g.map);
  g.atPort = g.port !== null;
  stepProgress(g, events);
  stepStory(g, dt, events);
  stepChapter2(g, events);
  const zone = zoneAt(d.x, d.y);
  if (zone && zone !== g.zone) {
    g.zone = zone;
    events.push({ type: 'zoneEntered', name: zone });
  }
  return events;
}

/**
 * Like Pokémon: a beast touched you with every beast of yours KO. You black out and wake up at your sanctuary
 * (or your harbour) with everyone healed, a few teeth lost on the way.
 */
export function blackout(g: GameState, events: GameEvent[]): void {
  const at = respawnPoint(g);
  const d = g.diver;
  Object.assign(d, { x: at.x, y: at.y, vx: 0, vy: 0, hp: d.maxHp, o2: d.maxO2 });
  d.invulnerable = DIVER.invulnerableAfterRespawn;
  for (const b of g.beasts.team) {
    b.hp = maxHpOf(b);
    b.ko = false;
  }
  if (g.beasts.riding) g.beasts.riding = false;
  const teethLost = Math.floor(g.gear.teeth * BLACKOUT.teethLoss);
  g.gear.teeth -= teethLost;
  const i = g.sanctuaries.current;
  // "al santuario della Baia" / "a Portofosco"
  const place =
    i !== null
      ? g.sanctuaries.list[i]!.name.replace(/^il /, 'al ')
      : `a ${(PORTS.find((p) => p.id === g.homePort) ?? PORT).name}`;
  events.push({ type: 'blackout', teethLost, place });
}

/** Arriving at a harbour: its sanctuary heals everyone, the market restocks, you wake up here. */
export function enterPort(g: GameState): void {
  const d = g.diver;
  if (g.port) g.homePort = g.port.id;
  d.hp = d.maxHp;
  d.o2 = d.maxO2;
  for (const b of g.beasts.team) {
    b.hp = maxHpOf(b);
    b.ko = false;
  }
  g.gear.shopBought = {};
  guardianReturns(g);
  g.sanctuaries.current = null;
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
