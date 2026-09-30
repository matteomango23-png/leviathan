// One step of the whole game (tappa 1): diver, harpoon, fish, bestiary and progress.
// Pure logic: no Phaser here, so it can be tested and reused.
import { DIVER, SARDINE } from '../data/diver';
import { FISH } from '../data/world';
import { START } from '../data/worldLayout';
import { createDiver, stepDiver, type DiverState } from './diver';
import type { GameEvent } from './events';
import { createFish, stepFish, takeFish, type FishState } from './fish';
import { createHarpoon, fireHarpoon, stepHarpoon, type HarpoonState } from './harpoon';
import type { InputState } from './input';
import { makeRng, type Rng } from './math';
import { newSave, type SaveData } from './save/saveData';
import type { TileMap } from './world/tileMap';
import { zoneAt } from './world/zones';

export interface GameState {
  map: TileMap;
  rng: Rng;
  time: number;
  playTime: number;
  zone: string;
  diver: DiverState;
  harpoon: HarpoonState;
  fish: FishState;
  fishCaught: Record<string, number>;
  seen: Set<string>;
}

export function createGame(map: TileMap, save: SaveData | null, seed = Date.now()): GameState {
  const rng = makeRng(seed);
  const s = save ?? newSave(START);
  const diver = createDiver(s.diver.x, s.diver.y);
  // A save inside rock (e.g. the world changed) falls back to the start.
  if (map.hitCircle(diver.x, diver.y, DIVER.radius)) Object.assign(diver, createDiver());
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

export function stepGame(g: GameState, input: InputState, dt: number): GameEvent[] {
  const events: GameEvent[] = [];
  g.time += dt;
  g.playTime += dt;
  const d = g.diver;

  stepDiver(d, input, g.map, dt, g.rng, events);

  if (!d.dead) {
    if (input.shotAt) {
      const a = Math.atan2(input.shotAt.y - d.y, input.shotAt.x - d.x);
      if (fireHarpoon(g.harpoon, d, a, events) && Math.abs(input.shotAt.x - d.x) > 2)
        d.face = input.shotAt.x > d.x ? 1 : -1;
    } else if (input.fireHeld) {
      const a = input.aim ?? d.aim;
      if (fireHarpoon(g.harpoon, d, a, events) && Math.abs(Math.cos(a)) > 0.2)
        d.face = Math.cos(a) > 0 ? 1 : -1;
    }
  }
  const caught = stepHarpoon(g.harpoon, d, g.fish, g.map, dt, events);
  if (caught) {
    takeFish(caught);
    catchFish(g, caught.kind, events);
  }

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
  s.diver = d.dead ? { x: START.x, y: START.y } : { x: Math.round(d.x), y: Math.round(d.y) };
  s.fishCaught = { ...g.fishCaught };
  s.seen = [...g.seen];
  return s;
}

/** Replaces progress with an imported save (keeps the current world and fish). */
export function applySave(g: GameState, save: SaveData): void {
  const fresh = createGame(g.map, save, 1);
  g.diver = fresh.diver;
  g.harpoon = createHarpoon();
  g.playTime = fresh.playTime;
  g.fishCaught = fresh.fishCaught;
  g.seen = fresh.seen;
  g.zone = '';
}
