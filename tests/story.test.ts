import { describe, expect, it } from 'vitest';
import { PORT } from '../src/data/economy';
import { LAIR } from '../src/data/guardians';
import { jobMarkIds } from '../src/data/portJobs';
import { CLUES, SCENES, TUTORIAL } from '../src/data/story';
import { WORLD } from '../src/data/worldLayout';
import type { GameEvent } from '../src/systems/events';
import { createGame, currentAction, stepGame, toSave, type GameState } from '../src/systems/game';
import { emptyInput } from '../src/systems/input';
import { parseSave, serializeSave } from '../src/systems/save/saveData';
import { askAurelio, closeDialogue, objectiveText, startNewGame, stepStory } from '../src/systems/story';
import { stepPortJobs } from '../src/systems/portJobs';
import { giveTestBeast } from '../src/systems/testTools';
import { generateWorld } from '../src/systems/world/worldGen';

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

/** Plays the opening and the guided dive up to the burning pier. */
function toFindShark(g: GameState): void {
  run(g, SCENES.introShipSeconds + 0.1);
  closeDialogue(g, []);
  g.story.step = 'findShark';
}

const atPier = (g: GameState) => Object.assign(g.diver, { x: PORT.x, y: WORLD.surfaceY + 4, vx: 0, vy: 0 });

describe('the opening on Aurelio’s boat', () => {
  it('holds you on the boat while the Company ship goes by, then Aurelio speaks', () => {
    const g = newGame();
    expect(currentAction(g)).toBeNull();
    const ev = run(g, SCENES.introShipSeconds - 0.5);
    expect(g.diver.x).toBe(SCENES.boat.x);
    expect(g.story.ship).not.toBeNull();
    expect(ev.some((e) => e.type === 'dialogueOpened')).toBe(false);
    expect(run(g, 1)).toContainEqual({ type: 'dialogueOpened', id: 'intro' });
  });

  it('saved during the opening: it starts again with the ship (bug: the ship was missing)', () => {
    const g = newGame();
    run(g, 2);
    const back = createGame(map, parseSave(serializeSave(toSave(g, new Date()))), 1);
    expect(back.story.step).toBe('intro');
    expect(back.story.ship).not.toBeNull();
  });

  it('the game waits while a dialogue is on screen', () => {
    const g = newGame();
    run(g, SCENES.introShipSeconds + 0.1);
    const t = g.time;
    run(g, 2);
    expect(g.time).toBe(t);
  });

  it('after the intro you are in the water and the guided dive begins', () => {
    const g = newGame();
    run(g, SCENES.introShipSeconds + 0.1);
    closeDialogue(g, []);
    expect(g.story.step).toBe('tutorial');
    expect(g.diver.y).toBeGreaterThan(WORLD.surfaceY);
    expect(objectiveText(g.story)).toBe(TUTORIAL[0].text);
  });
});

describe('the guided dive and the burning pier', () => {
  it('swim, catch a sardine, dash, come back: then the broken collar', () => {
    const g = newGame();
    run(g, SCENES.introShipSeconds + 0.1);
    closeDialogue(g, []);
    g.diver.x += 80;
    g.diver.y += 30;
    stepStory(g, 0.1, []);
    expect(g.story.tutorial).toBe(1);
    stepStory(g, 0.1, [{ type: 'fishCaught', fishId: 'sardina', count: 1, healed: false }]);
    expect(g.story.tutorial).toBe(2);
    stepStory(g, 0.1, [{ type: 'dash', x: 0, y: 0 }]);
    expect(g.story.tutorial).toBe(3);
    atPier(g);
    const jobs: GameEvent[] = [];
    stepStory(g, 0.1, jobs);
    // first Aurelio's jobs (tappa 17): done here at once, then back at the pier the story goes on
    expect(g.story.step).toBe('portJobs');
    expect(jobs).toContainEqual({ type: 'dialogueOpened', id: 'jobs' });
    closeDialogue(g, []);
    g.story.seen.push(...jobMarkIds());
    stepPortJobs(g, []);
    expect(g.story.step).toBe('pier');
    const ev: GameEvent[] = [];
    stepStory(g, SCENES.collarDelay + 0.1, ev);
    expect(ev).toContainEqual({ type: 'dialogueOpened', id: 'collar' });
    closeDialogue(g, []);
    expect(g.story.step).toBe('findShark');
    expect(objectiveText(g.story)).toContain('0/3');
  });
});

describe('finding Aurelio’s shark', () => {
  it('clues on the sea floor lead to the lair, each found once', () => {
    const g = newGame();
    toFindShark(g);
    const spot = g.story.spots[0]!;
    Object.assign(g.diver, { x: spot.x, y: spot.y });
    const ev: GameEvent[] = [];
    stepStory(g, 0.1, ev);
    expect(ev).toContainEqual({ type: 'storyNote', text: CLUES[0]!.text });
    stepStory(g, 0.1, ev);
    expect(g.story.clues).toEqual([CLUES[0]!.id]);
    expect(objectiveText(g.story)).toContain('1/3');
    for (const s of g.story.spots) if (!g.story.clues.includes(s.id)) g.story.clues.push(s.id);
    expect(objectiveText(g.story)).toContain('ossa');
  });

  it('the bones over the lair: a hint about the Charge, once', () => {
    const g = newGame();
    toFindShark(g);
    Object.assign(g.diver, {
      x: (LAIR.shaft.x0 + LAIR.shaft.x1) / 2,
      y: LAIR.gateRows[0]! * WORLD.tileSize - 20,
    });
    const ev: GameEvent[] = [];
    stepStory(g, 0.1, ev);
    stepStory(g, 0.1, ev);
    expect(ev.filter((e) => e.type === 'storyNote')).toHaveLength(1);
  });

  it('the Guardian appears: "it’s him", only the first time', () => {
    const g = newGame();
    toFindShark(g);
    const ev: GameEvent[] = [{ type: 'guardianAppeared', id: 900 }];
    stepStory(g, 0.1, ev);
    expect(g.story.dialogue).toBe('sharkFound');
    closeDialogue(g, []);
    const again: GameEvent[] = [{ type: 'guardianAppeared', id: 900 }];
    stepStory(g, 0.1, again);
    expect(g.story.dialogue).toBeNull();
  });

  it('tamed: back to Aurelio, the ending, the ship sails east', () => {
    const g = newGame();
    toFindShark(g);
    giveTestBeast(g, { speciesId: 'squalo_bianco', variant: 'comune', unique: 'sfregiato' }, 8);
    Object.assign(g.diver, { x: 600, y: 200 });
    stepStory(g, 0.1, []);
    expect(g.story.step).toBe('returnToAurelio');
    atPier(g);
    const ev: GameEvent[] = [];
    stepStory(g, 0.1, ev);
    expect(ev).toContainEqual({ type: 'dialogueOpened', id: 'end' });
    closeDialogue(g, ev);
    expect(g.story.step).toBe('chapter1Done');
    expect(g.story.ship).not.toBeNull();
    const x = g.story.ship!.x;
    stepStory(g, 1, []);
    expect(g.story.ship!.x).toBeGreaterThan(x);
  });
});

describe('Aurelio at the port and saves', () => {
  it('Aurelio gives a hint for where you are', () => {
    const g = newGame();
    toFindShark(g);
    askAurelio(g, []);
    expect(g.story.dialogue).toBe('hintFindShark');
  });

  it('the story is saved', () => {
    const g = newGame();
    toFindShark(g);
    g.story.clues.push('catena');
    const back = createGame(map, parseSave(serializeSave(toSave(g, new Date()))), 1);
    expect(back.story.step).toBe('findShark');
    expect(back.story.clues).toEqual(['catena']);
  });

  it('an older save picks up from where you are', () => {
    const g = createGame(map, null, 1);
    const s = JSON.parse(serializeSave(toSave(g, new Date()))) as Record<string, unknown>;
    s.version = 4;
    delete s.story;
    expect(createGame(map, parseSave(JSON.stringify(s)), 1).story.step).toBe('findShark');
    giveTestBeast(g, { speciesId: 'squalo_bianco', variant: 'comune', unique: 'sfregiato' }, 8);
    const done = JSON.parse(serializeSave(toSave(g, new Date()))) as Record<string, unknown>;
    done.version = 4;
    delete done.story;
    expect(createGame(map, parseSave(JSON.stringify(done)), 1).story.step).toBe('chapter1Done');
  });
});
