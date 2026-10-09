// Game state ⇄ save file.
import { START } from '../../data/worldLayout';
import { saveSub, subWakePoint, type SubState } from '../submarine';
import { saveShip, type ShipState } from '../ship/ship';
import { saveBoat, type BoatState } from '../boat';
import type { MooredShip } from '../ship/shipyard';
import { PORTS, type PortDef } from '../../data/economy';
import { portStart } from '../economy/places';
import { seedFrom } from '../../data/stats';
import { BATTLE_MOVE_BY_ID } from '../../data/battleMoves';
import { MOVE_SLOTS, type StatusId } from '../../data/moveBattle';
import { hasAlbinoArt } from '../beasts/forms';
import { xpToNext } from '../beasts/growth';
import { makeTeamBeast, maxHpOf, type TeamBeast } from '../beasts/team';
import { newGear, type GearState } from '../economy/gear';
import type { BackpackWorld } from '../economy/backpack';
import { newSave, type SaveData, type SavedGear } from './saveData';
import { saveStory, type StoryState } from '../story';
import { saveWeather, type WeatherState } from '../weather';
import type { GadgetsState } from '../ship/gadgets';

/** The parts of the game that are saved. */
export interface SaveSource extends Pick<
  BackpackWorld,
  'diver' | 'seen' | 'beasts' | 'brokenTiles' | 'gear'
> {
  sub: SubState;
  ship: ShipState;
  boat: BoatState;
  fleet: MooredShip[];
  hunts: SaveData['hunts'];
  huntPinned: string | null;
  weather: WeatherState;
  gadgets: GadgetsState;
  playTime: number;
  fishCaught: Record<string, number>;
  story: StoryState;
  homePort: PortDef['id'];
}

export function restoreTeam(save: SaveData): TeamBeast[] {
  return save.team.map((s) => {
    const form = { ...s.form };
    // an albino without pictures of its own was the species drawn pale: it goes back to the common one
    if (form.variant === 'albino' && !form.unique && !hasAlbinoArt(form.speciesId)) form.variant = 'comune';
    form.seed ??= seedFrom(s.uid); // its individual values (data/stats.ts), kept from now on
    const b = makeTeamBeast(s.uid, form, s.level, s.inTeam);
    b.hp = Math.min(s.hp, maxHpOf(b));
    b.ko = s.ko || b.hp <= 0;
    b.xp = Math.min(s.xp, xpToNext(b)); // v0.23: the experience needed changed (Pokémon groups)
    b.food = s.food;
    // its battle moves (0.24: Pokémon moves); an older save had the sea moves' PP, which no longer match
    const known = (s.known ?? []).filter((id) => BATTLE_MOVE_BY_ID[id]).slice(0, MOVE_SLOTS);
    if (known.length) {
      b.known = known;
      if (s.ppUsed) b.ppUsed = s.ppUsed.slice(0, known.length);
    }
    const pending = (s.pendingMoves ?? []).filter((id) => BATTLE_MOVE_BY_ID[id] && !b.known.includes(id));
    if (pending.length) b.pendingMoves = pending;
    if (s.evolveReady) b.evolveReady = true;
    if (s.status) {
      b.status = s.status as StatusId;
      if (s.sleepTurns) b.sleepTurns = s.sleepTurns;
    }
    if (s.met) b.met = { ...s.met };
    return b;
  });
}

export function restoreGear(s: SavedGear): GearState {
  return { ...newGear(), ...structuredClone(s), shopBought: {} };
}

function saveGear(g: GearState): SavedGear {
  return {
    teeth: g.teeth,
    bag: { ...g.bag },
    suit: g.suit,
    suits: [...g.suits],
    upgrades: [...g.upgrades],
    weapons: [...g.weapons],
    activeWeapon: g.activeWeapon,
    inventory: { ...g.inventory },
    backpack: [...g.backpack],
    swarms: [...g.swarms],
    wrecks: [...g.wrecks],
    missions: structuredClone(g.missions),
    mythicStock: g.mythicStock,
    deepestM: Math.floor(g.deepestM),
    relics: [...g.relics],
  };
}

/** Snapshot of the game for saving. */
export function toSave(g: SaveSource, now: Date): SaveData {
  const s = newSave(START);
  const d = g.diver;
  s.savedAt = now.toISOString();
  s.playTime = Math.round(g.playTime);
  const home = PORTS.find((p) => p.id === g.homePort) ?? PORTS[0]!;
  s.diver = d.dead ? portStart(home) : { x: Math.round(d.x), y: Math.round(d.y) };
  s.homePort = g.homePort;
  s.sub = saveSub(g.sub);
  s.ship = saveShip(g.ship);
  s.boat = saveBoat(g.boat);
  s.fleet = g.fleet.map((m) => structuredClone(m));
  s.hunts = structuredClone(g.hunts);
  s.huntPinned = g.huntPinned;
  s.weather = saveWeather(g.weather);
  const t = g.gadgets.target;
  if (t && 'resident' in t) s.target = { target: { ...t }, name: g.gadgets.targetName };
  s.legendsGone = [...g.beasts.gone];
  // saved aboard: you start next to it, in the water (one tap climbs back aboard)
  if (g.sub.aboard && !d.dead) s.diver = subWakePoint(g.sub); // saved inside: you start next to it
  s.fishCaught = { ...g.fishCaught };
  s.seen = [...g.seen];
  s.team = g.beasts.team.map((b) => ({
    uid: b.uid,
    form: { ...b.form },
    level: b.level,
    xp: Math.round(b.xp),
    food: b.food,
    hp: Math.round(b.hp * 10) / 10,
    ko: b.ko,
    inTeam: b.inTeam,
    ...(b.ppUsed ? { ppUsed: [...b.ppUsed] } : {}),
    known: [...b.known],
    ...(b.pendingMoves?.length ? { pendingMoves: [...b.pendingMoves] } : {}),
    ...(b.evolveReady ? { evolveReady: true } : {}),
    ...(b.status ? { status: b.status, ...(b.sleepTurns ? { sleepTurns: b.sleepTurns } : {}) } : {}),
    ...(b.met ? { met: { ...b.met } } : {}),
  }));
  s.brokenTiles = [...new Set(g.brokenTiles)];
  s.gear = saveGear(g.gear);
  s.story = saveStory(g.story);
  return s;
}
