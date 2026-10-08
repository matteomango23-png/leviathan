// The new start (owner, 8 ottobre 2026: the old chapters are paused): Aurelio's boat, the guided dive at
// Portofosco, then the ship and the submarine at Porto Fango.
import { describe, expect, it } from 'vitest';
import { SPECIES_DANGER, WILD_SPAWNS } from '../src/data/beasts';
import { PORT, PORTO_FANGO } from '../src/data/economy';
import { GAME_SPECIES } from '../src/data/species';
import { SCENES, TUTORIAL } from '../src/data/story';
import { LAYOUT, WORLD } from '../src/data/worldLayout';
import type { GameEvent } from '../src/systems/events';
import { portStart } from '../src/systems/economy/places';
import { createGame, currentAction, stepGame, toSave, type GameState } from '../src/systems/game';
import { emptyInput } from '../src/systems/input';
import { migrate, parseSave, serializeSave } from '../src/systems/save/saveData';
import {
  askAurelio,
  closeDialogue,
  createStory,
  currentObjective,
  startNewGame,
  stepStory,
} from '../src/systems/story';
import { generateWorld } from '../src/systems/world/worldGen';
import { giveSub } from './helpers/vessels';

const map = generateWorld();

function newGame(): GameState {
  const g = createGame(map, null, 5);
  startNewGame(g);
  return g;
}

function run(g: GameState, seconds: number): GameEvent[] {
  const all: GameEvent[] = [];
  for (let t = 0; t < seconds; t += 1 / 30) all.push(...stepGame(g, emptyInput(), 1 / 30));
  return all;
}

/** The opening is over and the guided dive has begun. */
function inTutorial(): GameState {
  const g = newGame();
  run(g, SCENES.introSeconds + 0.1);
  closeDialogue(g, []);
  return g;
}

const sardine: GameEvent = { type: 'fishCaught', fishId: 'sardina', count: 1, healed: false };
const atPier = (g: GameState) => Object.assign(g.diver, { x: PORT.x, y: WORLD.surfaceY + 4, vx: 0, vy: 0 });
const atPortoFango = (g: GameState) => Object.assign(g.diver, { ...portStart(PORTO_FANGO), vx: 0, vy: 0 });

describe('the opening on Aurelio’s boat', () => {
  it('holds you on the boat, then Aurelio speaks', () => {
    const g = newGame();
    expect(currentAction(g)).toBeNull();
    const ev = run(g, SCENES.introSeconds - 0.5);
    expect(g.diver.x).toBe(SCENES.boat.x);
    expect(ev.some((e) => e.type === 'dialogueOpened')).toBe(false);
    expect(run(g, 1)).toContainEqual({ type: 'dialogueOpened', id: 'intro' });
  });

  it('saved during the opening: it starts again', () => {
    const g = newGame();
    run(g, 1);
    const back = createGame(map, parseSave(serializeSave(toSave(g, new Date()))), 1);
    expect(back.story.step).toBe('intro');
  });

  it('after the intro you are in the water and the guided dive begins', () => {
    const g = inTutorial();
    expect(g.story.step).toBe('tutorial');
    expect(g.story.tutorial).toBe(0);
    expect(g.diver.y).toBeGreaterThan(WORLD.surfaceY);
  });
});

describe('the guided dive', () => {
  it('swim, five sardines, dash, tame a beast, back to the pier: Aurelio sends you to Porto Fango', () => {
    const g = inTutorial();
    const step = (events: GameEvent[]) => stepStory(g, 1 / 30, events);
    // swim
    Object.assign(g.diver, { x: g.diver.x + 100, y: WORLD.surfaceY + 40 });
    step([]);
    expect(TUTORIAL[g.story.tutorial]!.id).toBe('fish');
    // a tamed beast before its task does not count
    step([{ type: 'tamed', uid: 'b9', toTeam: true }]);
    for (let i = 0; i < 4; i++) step([sardine]);
    expect(g.story.count).toBe(4);
    expect(currentObjective(g)).toContain('(4/5)');
    step([{ type: 'fishCaught', fishId: 'sgombro', count: 1, healed: false }]); // not a sardine
    expect(g.story.count).toBe(4);
    step([sardine]);
    expect(TUTORIAL[g.story.tutorial]!.id).toBe('dash');
    step([{ type: 'dash', x: 0, y: 0 }]);
    expect(TUTORIAL[g.story.tutorial]!.id).toBe('tame');
    step([{ type: 'tamed', uid: 'b9', toTeam: true }]);
    expect(TUTORIAL[g.story.tutorial]!.id).toBe('surface');
    atPier(g);
    const ev: GameEvent[] = [];
    stepStory(g, 1 / 30, ev);
    expect(ev).toContainEqual({ type: 'dialogueOpened', id: 'farewell' });
    closeDialogue(g, []);
    expect(g.story.step).toBe('toPortoFango');
    expect(currentObjective(g)).toContain('Porto Fango');
  });
});

describe('Porto Fango', () => {
  it('Aurelio gives you the ship with the submarine in its hold', () => {
    const g = inTutorial();
    g.story.step = 'toPortoFango';
    expect(g.ship.owned).toBe(false);
    expect(g.sub.owned).toBe(false);
    atPortoFango(g);
    const ev: GameEvent[] = [];
    stepStory(g, 1 / 30, ev);
    expect(ev).toContainEqual({ type: 'dialogueOpened', id: 'portoFango' });
    const after: GameEvent[] = [];
    closeDialogue(g, after);
    expect(g.story.step).toBe('free');
    expect(g.ship.owned).toBe(true);
    expect(g.ship.x).toBe(PORTO_FANGO.shipDock);
    expect(g.sub.owned).toBe(true);
    expect(g.ship.bay).toBe('docked');
    expect(after.some((e) => e.type === 'shipGiven')).toBe(true);
    expect(currentObjective(g)).toBeNull();
  });

  it('nothing happens at Porto Fango before the guided dive is over', () => {
    const g = inTutorial();
    atPortoFango(g);
    const ev: GameEvent[] = [];
    stepStory(g, 1 / 30, ev);
    expect(ev.some((e) => e.type === 'dialogueOpened')).toBe(false);
    expect(g.ship.owned).toBe(false);
  });
});

describe('Aurelio at the port and saves', () => {
  it('Aurelio gives a hint for where you are', () => {
    const g = inTutorial();
    askAurelio(g, []);
    expect(g.story.dialogue).toBe('hintTutorial');
    g.story.dialogue = null;
    g.story.step = 'toPortoFango';
    askAurelio(g, []);
    expect(g.story.dialogue).toBe('hintToPortoFango');
    g.story.dialogue = null;
    g.story.step = 'free';
    askAurelio(g, []);
    expect(g.story.dialogue).toBe('hintFree');
  });

  it('the story is saved, the progress of the task too', () => {
    const g = inTutorial();
    g.story.tutorial = 1;
    g.story.count = 3;
    const back = createGame(map, parseSave(serializeSave(toSave(g, new Date()))), 1);
    expect(back.story).toMatchObject({ step: 'tutorial', tutorial: 1, count: 3 });
  });

  it('an older save without a story: the sea is open if the ship is yours', () => {
    expect(createStory(null, true, true).step).toBe('free');
    expect(createStory(null, true, false).step).toBe('toPortoFango');
    expect(createStory(null, false, false).step).toBe('off');
  });
});

describe('saves of the old story (v16 → v17)', () => {
  const beast = (speciesId: string, inTeam: boolean, unique?: string) => ({
    uid: `${speciesId}${unique ?? ''}`,
    form: { speciesId, variant: 'comune', ...(unique ? { unique } : {}) },
    level: 20,
    inTeam,
  });
  const old = (ship: unknown, step: string, tutorial = 0) => ({
    version: 16,
    team: [
      beast('piovra', true),
      beast('re_corallo', false),
      beast('squalo_bianco', true, 'sfregiato'),
      beast('barracuda', true),
      beast('cernia', false),
      beast('tonno', false),
    ],
    story: { step, tutorial, clues: ['catena'], seen: ['starter', 'collar'], jobs: { sardine: 5 } },
    ship,
    gear: { teeth: 10, guardians: ['sfregiato'] },
  });

  it('the beasts of the story leave the team; the reserve takes their places', () => {
    const o = migrate(old({ x: 9000 }, 'chapter4Done'), undefined, 17);
    const team = o.team as { form: { speciesId: string }; inTeam: boolean }[];
    expect(team.map((b) => b.form.speciesId)).toEqual(['barracuda', 'cernia', 'tonno']);
    expect(team.every((b) => b.inTeam)).toBe(true); // two left the team: two from the reserve
    expect((o.gear as Record<string, unknown>).guardians).toBeUndefined();
  });

  it('with the ship the sea is open; without it Aurelio waits at Porto Fango', () => {
    expect(migrate(old({ x: 9000 }, 'chapter4Done'), undefined, 17).story).toEqual({
      step: 'free',
      tutorial: 0,
      count: 0,
      seen: ['starter'],
    });
    expect(migrate(old(null, 'findShark'), undefined, 17).story).toMatchObject({ step: 'toPortoFango' });
  });

  it('in the middle of the old guided dive: the same task (surface is now after tame)', () => {
    expect(migrate(old(null, 'tutorial', 2), undefined, 17).story).toMatchObject({
      step: 'tutorial',
      tutorial: 2,
    });
    expect(migrate(old(null, 'tutorial', 3), undefined, 17).story).toMatchObject({
      step: 'tutorial',
      tutorial: 4,
    });
  });
});

describe('the coast up to Porto Fango is a protected first zone', () => {
  it('no superpredators or giants live there (owner, 8 ottobre)', () => {
    const coast = WILD_SPAWNS.filter((s) => s.area[0] < LAYOUT.island.x0);
    expect(coast.length).toBeGreaterThan(10);
    for (const s of coast) expect(SPECIES_DANGER[s.speciesId] ?? 1, s.speciesId).toBeLessThan(4);
  });

  it('the beasts of the paused story are out of the bestiary', () => {
    const ids = GAME_SPECIES.map((s) => s.id);
    expect(ids).not.toContain('piovra');
    expect(ids).not.toContain('re_corallo');
    expect(ids).toContain('calamaro_colossale'); // now an ordinary beast
  });
});

describe('an older save with the submarine but not the ship', () => {
  it('at Porto Fango the submarine is brought into the hold of the new ship, with its own hull', () => {
    const g = inTutorial();
    g.story.step = 'toPortoFango';
    giveSub(g);
    g.sub.hull = 7;
    atPortoFango(g);
    stepStory(g, 1 / 30, []);
    closeDialogue(g, []);
    expect(g.ship.bay).toBe('docked');
    expect(g.sub.x).toBe(PORTO_FANGO.shipDock);
    expect(g.sub.hull).toBe(7);
  });
});
