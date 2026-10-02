// Game state ⇄ save file.
import { START, WORLD } from '../../data/worldLayout';
import { PORTS, type PortDef } from '../../data/economy';
import { portStart } from '../economy/places';
import { makeTeamBeast, maxHpOf, type TeamBeast } from '../beasts/team';
import { newGear, type GearState } from '../economy/gear';
import type { BackpackWorld } from '../economy/backpack';
import { newSave, type SaveData, type SavedGear } from './saveData';
import { saveStory, type StoryState } from '../story';

/** The parts of the game that are saved. */
export interface SaveSource extends Pick<
  BackpackWorld,
  'diver' | 'sanctuaries' | 'seen' | 'beasts' | 'brokenTiles' | 'gear'
> {
  boat: { owned: boolean; x: number; aboard: boolean };
  playTime: number;
  fishCaught: Record<string, number>;
  story: StoryState;
  homePort: PortDef['id'];
}

export function restoreTeam(save: SaveData): TeamBeast[] {
  return save.team.map((s) => {
    const b = makeTeamBeast(s.uid, { ...s.form }, s.level, s.inTeam);
    b.hp = Math.min(s.hp, maxHpOf(b));
    b.ko = s.ko || b.hp <= 0;
    b.xp = s.xp;
    b.food = s.food;
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
    guardians: [...g.guardians],
  };
}

/** Snapshot of the game for saving. */
export function toSave(g: SaveSource, now: Date): SaveData {
  const s = newSave(START);
  const d = g.diver;
  s.savedAt = now.toISOString();
  s.playTime = Math.round(g.playTime);
  const i = g.sanctuaries.current;
  const sanct = i === null ? undefined : g.sanctuaries.list[i];
  const home = PORTS.find((p) => p.id === g.homePort) ?? PORTS[0]!;
  s.diver = d.dead
    ? sanct
      ? { x: sanct.x, y: sanct.y - 6 }
      : portStart(home)
    : { x: Math.round(d.x), y: Math.round(d.y) };
  s.homePort = g.homePort;
  s.boat = g.boat.owned ? { x: Math.round(g.boat.x) } : null;
  s.legendsGone = [...g.beasts.gone];
  // saved aboard: you start next to it, in the water (one tap climbs back aboard)
  if (g.boat.aboard && !d.dead) s.diver = { x: Math.round(g.boat.x), y: WORLD.surfaceY + 8 };
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
  }));
  s.sanctuary = g.sanctuaries.current;
  s.brokenTiles = [...new Set(g.brokenTiles)];
  s.gear = saveGear(g.gear);
  s.story = saveStory(g.story);
  return s;
}
