// The naval test arena (owner, 17 novembre 2026: "simulerei la dinamica di combattimento su un'interfaccia separata"):
// a throwaway game, never saved, in the open sea of the Mare blu with nothing in the way, calm. You are at the helm of
// the ship you pick and the Compagnia's vessels you pick wait ahead on patrol, by day or by night. Part of the test
// tools (testTools.ts): to be removed with them once the Compagnia sails in the real sea.
import { ARENA, type EnemyClassId } from '../../data/company';
import { SHIP_MODELS } from '../../data/fleet';
import { kmToX } from '../../data/regions';
import { phaseStart } from '../dayNight';
import type { GameState } from '../newGame';
import { helmPoint } from '../ship/geometry';
import { shipModel } from '../ship/model';
import { bringIn } from '../ship/shipyard';
import { metres, newCompany, spawnEnemy } from './enemyState';

export interface ArenaSetup {
  ship: string;
  /** One kind of vessel, or all three. */
  enemies: EnemyClassId | 'tutti';
  night: boolean;
}

export const ARENA_DEFAULT: ArenaSetup = { ship: 'aurelia', enemies: 'baleniera', night: false };

/** The ships you can take into the arena: every one with a painting and a weapon. */
export const arenaShips = (): { id: string; name: string }[] =>
  SHIP_MODELS.filter((m) => m.art && m.weapons.length).map((m) => ({ id: m.id, name: m.name }));

/** Starts (or starts again) the arena with this setup. */
export function setUpArena(g: GameState, set: ArenaSetup): void {
  const m = SHIP_MODELS.find((x) => x.id === set.ship) ?? SHIP_MODELS[0]!;
  g.ship.owned = true;
  g.sub.aboard = false;
  g.boat.aboard = false;
  bringIn(g, m, null);
  const x = kmToX(ARENA.km);
  Object.assign(g.ship, {
    x,
    face: 1,
    speed: 0,
    aboard: true,
    engineOn: false,
    silent: false,
    lightOn: false,
    hull: shipModel(g.ship).hull,
  });
  if (g.sub.owned) g.sub.x = x;
  Object.assign(g.diver, helmPoint(g.ship), { vx: 0, vy: 0, face: 1 });
  g.port = null;
  // calm and clear, by day or by night
  Object.assign(g.weather, { from: 'sereno', to: 'sereno', blend: 1, left: 1e9, flash: 0 });
  g.day.t = set.night ? phaseStart('notte') + 0.05 : phaseStart('giorno') + 0.05;
  g.day.sleeping = null;
  // the Compagnia ahead, on patrol, facing you
  g.company = newCompany();
  const kinds: EnemyClassId[] = set.enemies === 'tutti' ? ['baleniera', 'caccia', 'uboot'] : [set.enemies];
  kinds.forEach((k, i) =>
    spawnEnemy(g.company, k, x + metres(ARENA.aheadM + i * ARENA.spreadM), i % 2 ? 1 : -1),
  );
}
