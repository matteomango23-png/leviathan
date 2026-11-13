// Owner, 13 novembre 2026: "sto tutorial riparte ogni volta che chiudo l'app e la riapro". The marks of the
// step-by-step tutorial's rounds (and the tips' switch) were saved but dropped when the save was read back.
import { beforeAll, describe, expect, it } from 'vitest';
import { COACH, coachSeen, type CoachRound } from '../src/data/coach';
import { TIPS_OFF } from '../src/data/story';
import { createGame, toSave } from '../src/systems/game';
import { parseSave } from '../src/systems/save/saveData';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';
import { coachDue } from '../src/ui/coach';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

/** Closing and reopening the app: saved to text, read back, a new game made from it. */
const reopen = (g: ReturnType<typeof createGame>): ReturnType<typeof createGame> =>
  createGame(map, parseSave(JSON.stringify(toSave(g, new Date()))), 4);

describe('il tutorial non riparte alla riapertura', () => {
  it('ogni giro visto resta visto', () => {
    const g = createGame(map, null, 4);
    g.story.step = 'free';
    g.story.seen = g.story.seen.filter((x) => x !== TIPS_OFF);
    const rounds = Object.keys(COACH) as CoachRound[];
    for (const r of rounds) g.story.seen.push(coachSeen(r));
    const back = reopen(g);
    for (const r of rounds) expect(coachDue(back.story, r), r).toBe(false);
  });

  it('i consigli spenti restano spenti', () => {
    const g = createGame(map, null, 4);
    g.story.step = 'free';
    if (!g.story.seen.includes(TIPS_OFF)) g.story.seen.push(TIPS_OFF);
    expect(reopen(g).story.seen).toContain(TIPS_OFF);
  });
});
