// One step of the whole game: diver, harpoon, fish, beasts, bestiary and progress.
// Pure logic: no Phaser here, so it can be tested and reused.
import { DIVER, SARDINE } from '../data/diver';
import { FISH } from '../data/world';
import { START, TILE } from '../data/worldLayout';
import { createBeasts, harpoonHitsBeast, mountSpeed, stepBeasts, type BeastWorld } from './beastPlay';
import { makeTeamBeast, maxHpOf, type TeamBeast } from './beasts/team';
import type { Rect } from './beasts/wild';
import { createDiver, stepDiver, type DiverState } from './diver';
import type { GameEvent } from './events';
import { createFish, stepFish, takeFish, type FishState } from './fish';
import { BASE_HARPOON, createHarpoon, fireHarpoon, stepHarpoon, type HarpoonState } from './harpoon';
import type { InputState } from './input';
import { makeRng } from './math';
import { placeSanctuaries } from './sanctuary';
import { newSave, type SaveData } from './save/saveData';
import { TEAM_RULES } from '../data/beasts';
import type { TileMap } from './world/tileMap';
import { zoneAt } from './world/zones';

export interface GameState extends BeastWorld {
  time: number;
  playTime: number;
  zone: string;
  harpoon: HarpoonState;
  fish: FishState;
  fishCaught: Record<string, number>;
  /** True while the taming minigame holds the diver. */
  tamingLock: boolean;
}

function restoreTeam(save: SaveData): TeamBeast[] {
  return save.team.map((s) => {
    const b = makeTeamBeast(s.uid, { ...s.form }, s.level, s.inTeam);
    b.hp = Math.min(s.hp, maxHpOf(b));
    b.ko = s.ko || b.hp <= 0;
    return b;
  });
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
  return {
    map,
    rng,
    time: 0,
    playTime: s.playTime,
    zone: '',
    diver,
    harpoon: createHarpoon(),
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
    tamingLock: false,
  };
}

function catchFish(g: GameState, kind: string, events: GameEvent[]): void {
  const def = FISH.find((f) => f.id === kind);
  const count = (g.fishCaught[kind] ?? 0) + 1;
  g.fishCaught[kind] = count;
  let healed = false;
  if (def?.effect === 'cuore' && g.diver.hp < g.diver.maxHp) {
    g.diver.hp++;
    healed = true;
  } else if (def?.effect === 'ossigeno') {
    g.diver.o2 = g.diver.maxO2;
  }
  markSeen(g, kind, events);
  events.push({ type: 'fishCaught', fishId: kind, count, healed });
}

function markSeen(g: GameState, id: string, events: GameEvent[]): void {
  if (g.seen.has(id)) return;
  g.seen.add(id);
  events.push({ type: 'creatureSeen', id });
}

export function respawnPoint(g: GameState): { x: number; y: number } {
  const i = g.sanctuaries.current;
  const s = i === null ? undefined : g.sanctuaries.list[i];
  return s ? { x: s.x, y: s.y - 6 } : START;
}

function fire(g: GameState, input: InputState, d: DiverState, events: GameEvent[]): void {
  if (d.dead || g.tamingLock) return;
  if (input.shotAt) {
    const a = Math.atan2(input.shotAt.y - d.y, input.shotAt.x - d.x);
    if (fireHarpoon(g.harpoon, d, a, events) && Math.abs(input.shotAt.x - d.x) > 2 && !g.beasts.riding)
      d.face = input.shotAt.x > d.x ? 1 : -1;
  } else if (input.fireHeld) {
    const a = input.aim ?? d.aim;
    if (fireHarpoon(g.harpoon, d, a, events) && Math.abs(Math.cos(a)) > 0.2 && !g.beasts.riding)
      d.face = Math.cos(a) > 0 ? 1 : -1;
  }
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

  if (!g.tamingLock) {
    const speed = mountSpeed(g);
    stepDiver(d, input, g.map, dt, g.rng, events, {
      respawnAt: respawnPoint(g),
      mountSpeed: speed,
      mountAccelMult: TEAM_RULES.accelMult,
    });
  }
  fire(g, input, d, events);
  const caught = stepHarpoon(g.harpoon, d, g.fish, g.map, dt, events, (x, y) =>
    harpoonHitsBeast(g, x, y, BASE_HARPOON.damage, events),
  );
  if (caught) {
    takeFish(caught);
    catchFish(g, caught.kind, events);
  }

  g.tamingLock = stepBeasts(g, input, screen, dt, events);
  for (const e of events) if (e.type === 'bonesBroken') g.brokenTiles.push(...e.tiles);

  stepFish(g.fish, g.map, { x: d.x, y: d.y, alive: !d.dead }, g.time, dt, g.rng);
  for (const f of g.fish.fish) {
    if (f.alive && !d.dead && Math.hypot(f.x - d.x, f.y - d.y) < SARDINE.seenRadius) {
      markSeen(g, f.kind, events);
      break;
    }
  }

  const zone = zoneAt(d.x, d.y);
  if (zone && zone !== g.zone) {
    g.zone = zone;
    events.push({ type: 'zoneEntered', name: zone });
  }
  return events;
}

/** Snapshot of the game for saving. */
export function toSave(g: GameState, now: Date): SaveData {
  const s = newSave(START);
  const d = g.diver;
  s.savedAt = now.toISOString();
  s.playTime = Math.round(g.playTime);
  s.diver = d.dead ? respawnPoint(g) : { x: Math.round(d.x), y: Math.round(d.y) };
  s.fishCaught = { ...g.fishCaught };
  s.seen = [...g.seen];
  s.team = g.beasts.team.map((b) => ({
    uid: b.uid,
    form: { ...b.form },
    level: b.level,
    hp: Math.round(b.hp * 10) / 10,
    ko: b.ko,
    inTeam: b.inTeam,
  }));
  s.sanctuary = g.sanctuaries.current;
  s.brokenTiles = [...new Set(g.brokenTiles)];
  return s;
}

/** Replaces progress with an imported save (rebuilds the game on the same map). */
export function applySave(g: GameState, save: SaveData): void {
  const fresh = createGame(g.map, save, 1);
  Object.assign(g, fresh, { map: g.map, rng: g.rng, time: g.time });
}
