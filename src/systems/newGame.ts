// The whole state of a game, and how one starts: new, or from a save (game.ts steps it).
import { newGadgets, type GadgetsState } from './ship/gadgets';
import { DIVER } from '../data/diver';
import { START, TILE } from '../data/worldLayout';
import { type RideTanks } from './rideAir';
import { createBeasts } from './beastPlay';
import { createDiver } from './diver';
import { diverModifiers, newGear } from './economy/gear';
import { createStory, type StoryWorld } from './story';
import { placeWrecks, type Wreck } from './economy/places';
import { PORTS, type PortDef } from '../data/economy';
import { createFish, type FishState } from './fish';
import { createHarpoon, type HarpoonState } from './harpoon';
import { makeRng } from './math';
import { newSave, type SaveData } from './save/saveData';
import { restoreGear, restoreTeam } from './save/convert';
import { createWeapons, type WeaponState } from './weapons';
import type { TileMap } from './world/tileMap';
import { shipModel } from './ship/model';
import { newSub, subModel, type SubState } from './submarine';
import { addHuntSlots, placeDens, type Den, type HuntsState } from './hunts';
import { createWeather, type WeatherState } from './weather';
import { newShip, type ShipState } from './ship/ship';
import { newBoat, type BoatState } from './boat';
import type { MooredShip } from './ship/shipyard';
import { createTemples, type TempleState } from './temple';

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

/** Replaces progress with an imported save (rebuilds the game on the same map). */
export function applySave(g: GameState, save: SaveData): void {
  const fresh = createGame(g.map, save, 1);
  Object.assign(g, fresh, { map: g.map, rng: g.rng, time: g.time });
}
