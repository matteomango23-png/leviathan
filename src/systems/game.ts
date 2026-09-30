// One step of the whole game: diver, weapons, fish, beasts, backpack, wrecks, port and missions.
// Pure logic: no Phaser here, so it can be tested and reused.
import { TEAM_RULES } from '../data/beasts';
import { DIVER, SARDINE } from '../data/diver';
import { FISH } from '../data/world';
import { START, TILE, WORLD } from '../data/worldLayout';
import { speciesOf } from './beasts/forms';
import type { Rect } from './beasts/wild';
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
import { checkSwarmBinding, stepSwarmCooldowns, useSlot, type BackpackWorld } from './economy/backpack';
import { diverModifiers, newGear, sellBag } from './economy/gear';
import { maxHpOf } from './beasts/team';
import { signalMissions } from './economy/missions';
import { atPort, nearWreck, openWreck, placeWrecks, type Wreck } from './economy/places';
import type { GameEvent } from './events';
import { createFish, stepFish, takeFish, type Fish, type FishState } from './fish';
import { BASE_HARPOON, createHarpoon, fireHarpoon, stepHarpoon, type HarpoonState } from './harpoon';
import type { InputState } from './input';
import { makeRng } from './math';
import { placeSanctuaries } from './sanctuary';
import { newSave, type SaveData } from './save/saveData';
import { restoreGear, restoreTeam } from './save/convert';
import { createWeapons, fireProjectileWeapon, stepProjectiles, type WeaponState } from './weapons';
import type { TileMap } from './world/tileMap';
import { depthMetres, zoneAt } from './world/zones';
import { stunWild, isInWater } from './beasts/wild';
import { WEAPON_RULES } from '../data/economy';

export { toSave } from './save/convert';

export interface GameState extends BackpackWorld {
  time: number;
  playTime: number;
  zone: string;
  harpoon: HarpoonState;
  weapons: WeaponState;
  fish: FishState;
  fishCaught: Record<string, number>;
  wrecks: Wreck[];
  /** True while the taming minigame holds the diver. */
  tamingLock: boolean;
  /** True while the diver floats at the pier of Portofosco. */
  atPort: boolean;
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
  return {
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
    beasts: createBeasts(restoreTeam(s)),
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
    tamingLock: false,
    atPort: false,
    timers: { feed: 0 },
  };
}

function markSeen(g: GameState, id: string, events: GameEvent[]): void {
  if (g.seen.has(id)) return;
  g.seen.add(id);
  events.push({ type: 'creatureSeen', id });
}

/** A fish reaches the diver: eaten if it heals a missing heart, otherwise into the bag to sell. */
function catchFish(g: GameState, f: Fish, events: GameEvent[]): void {
  takeFish(f);
  const kind = f.kind;
  const def = FISH.find((x) => x.id === kind);
  const count = (g.fishCaught[kind] ?? 0) + 1;
  g.fishCaught[kind] = count;
  let healed = false;
  if (def?.effect === 'cuore' && g.diver.hp < g.diver.maxHp) {
    g.diver.hp++;
    healed = true;
  } else if (def?.effect === 'ossigeno' && g.diver.o2 < g.diver.maxO2) {
    g.diver.o2 = g.diver.maxO2;
    healed = true;
  } else g.gear.bag[kind] = (g.gear.bag[kind] ?? 0) + 1;
  markSeen(g, kind, events);
  events.push({ type: 'fishCaught', fishId: kind, count, healed });
  checkSwarmBinding(g, g.fishCaught, events);
}

export function respawnPoint(g: GameState): { x: number; y: number } {
  const i = g.sanctuaries.current;
  const s = i === null ? undefined : g.sanctuaries.list[i];
  return s ? { x: s.x, y: s.y - 6 } : START;
}

/** What the context button does right now. */
export type Action = ReturnType<typeof contextAction> | 'porto' | 'apri';
export function currentAction(g: GameState): Action {
  const beast = contextAction(g);
  if (beast === 'doma' || beast === 'scendi') return beast;
  const d = g.diver;
  if (!d.dead && !g.tamingLock && nearWreck(g.wrecks, g.gear, d.x, d.y)) return 'apri';
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
  if (d.dead || g.tamingLock) return;
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

function stepMissionsAndDepth(g: GameState, events: GameEvent[]): void {
  const d = g.diver;
  const depth = depthMetres(d.y);
  const done: string[] = [];
  if (!d.dead && depth > g.gear.deepestM) {
    g.gear.deepestM = depth;
    done.push(...signalMissions(g.gear, { kind: 'depth', metres: depth }));
  }
  for (const e of events) {
    if (e.type === 'fishCaught') done.push(...signalMissions(g.gear, { kind: 'catch', fish: e.fishId }));
    else if (e.type === 'wreckOpened')
      done.push(...signalMissions(g.gear, { kind: 'openWreck', wreck: e.id }));
    else if (e.type === 'wildExhausted') {
      const w = g.beasts.wilds.find((x) => x.id === e.id);
      if (w) done.push(...signalMissions(g.gear, { kind: 'exhaust', species: w.form.speciesId }));
    } else if (e.type === 'tamed') {
      const b = g.beasts.team.find((x) => x.uid === e.uid);
      if (b) done.push(...signalMissions(g.gear, { kind: 'tame', region: speciesOf(b.form).region }));
    }
  }
  for (const id of done) events.push({ type: 'missionComplete', id });
}

/**
 * @param view the world rectangle on screen (beasts use it to stay out of sight when turning)
 */
export function stepGame(g: GameState, input: InputState, dt: number, view?: Rect): GameEvent[] {
  const events: GameEvent[] = [];
  g.time += dt;
  g.playTime += dt;
  const d = g.diver;
  const screen: Rect = view ?? { x: d.x - 173, y: d.y - 80, w: 346, h: 160 };
  const mods = diverModifiers(g.gear);
  if (d.maxHp !== mods.maxHp) {
    d.maxHp = mods.maxHp;
    d.hp = Math.min(d.hp, d.maxHp);
  }

  const wasTaming = !!g.beasts.taming;
  if (input.action && !wasTaming) doAction(g, events);
  if (input.slot >= 0 && !g.tamingLock) useSlot(g, input.slot, events);
  stepSwarmCooldowns(g, dt);

  if (!g.tamingLock) {
    stepDiver(d, input, g.map, dt, g.rng, events, {
      respawnAt: respawnPoint(g),
      mountSpeed: mountSpeed(g),
      mountAccelMult: TEAM_RULES.accelMult,
      mountDash: TEAM_RULES.rideDash,
      speedMult: mods.speedMult,
      o2DrainMult: mods.o2DrainMult,
      canDash: mods.canDash,
      maxDepthY: WORLD.surfaceY + mods.maxDepthM * WORLD.unitsPerMetre,
    });
  }
  fire(g, input, events);
  const hitBeast = (x: number, y: number, dmg: number): boolean => weaponHitsBeast(g, x, y, dmg, events);
  const caught = stepHarpoon(g.harpoon, d, g.fish, g.map, dt, events, (x, y) =>
    hitBeast(x, y, BASE_HARPOON.damage),
  );
  if (caught) catchFish(g, caught, events);
  stepProjectiles(g.weapons, g.fish, g.map, dt, {
    catchFish: (f) => catchFish(g, f, events),
    hitBeast,
    netBurst: (x, y, r) => {
      for (const w of g.beasts.wilds)
        if (isInWater(w) && Math.hypot(w.x - x, w.y - y) < r + w.length * 0.3) {
          w.slow = WEAPON_RULES.rete.slowSeconds;
          if (w.length < 20) stunWild(w, WEAPON_RULES.rete.slowSeconds); // small beasts get trapped
        }
    },
  });

  const beastEvents: GameEvent[] = [];
  g.tamingLock = stepBeasts(g, { ...input, action: input.action && wasTaming }, screen, dt, beastEvents);
  events.push(...beastEvents);
  for (const e of beastEvents) if (e.type === 'bonesBroken') g.brokenTiles.push(...e.tiles);

  const eaten = beastEats(g.beasts.companion, activeBeast(g), g.fish, g.timers, dt);
  if (eaten) catchFish(g, eaten, events);
  stepFish(g.fish, g.map, { x: d.x, y: d.y, alive: !d.dead }, g.time, dt, g.rng);
  for (const f of g.fish.fish) {
    if (f.alive && !d.dead && Math.hypot(f.x - d.x, f.y - d.y) < SARDINE.seenRadius) {
      markSeen(g, f.kind, events);
      break;
    }
  }

  g.atPort = atPort(d, g.map);
  stepMissionsAndDepth(g, events);
  const zone = zoneAt(d.x, d.y);
  if (zone && zone !== g.zone) {
    g.zone = zone;
    events.push({ type: 'zoneEntered', name: zone });
  }
  return events;
}

/** Arriving at Portofosco: its sanctuary heals everyone, the market restocks, you wake up here. */
export function enterPort(g: GameState): void {
  const d = g.diver;
  d.hp = d.maxHp;
  d.o2 = d.maxO2;
  for (const b of g.beasts.team) {
    b.hp = maxHpOf(b);
    b.ko = false;
  }
  g.gear.shopBought = {};
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
