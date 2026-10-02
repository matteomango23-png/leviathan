// Aurelio's jobs (tappa 17, owner's decision of 3 ottobre 2026): after the first dive, four small jobs at the port
// (sardines, barracudas, a tamed beast, a stronger companion) pay teeth; with all done, back at the pier the story
// goes on (the pier burns). Progress is saved.
import { describe, expect, it } from 'vitest';
import { PORT } from '../src/data/economy';
import { PORT_JOBS } from '../src/data/portJobs';
import { WORLD } from '../src/data/worldLayout';
import { currentObjective } from '../src/systems/chapters';
import type { GameEvent } from '../src/systems/events';
import { createGame, toSave, type GameState } from '../src/systems/game';
import { stepPortJobs } from '../src/systems/portJobs';
import { parseSave } from '../src/systems/save/saveData';
import { askAurelio } from '../src/systems/story';
import { giveTestBeast } from '../src/systems/testTools';
import { generateWorld } from '../src/systems/world/worldGen';

const map = generateWorld();

function jobsGame(): GameState {
  const g = createGame(map, null, 6);
  g.story.step = 'portJobs';
  g.story.seen.push('starter');
  giveTestBeast(g, { speciesId: 'zanna', variant: 'comune' }, 5);
  Object.assign(g.diver, { x: PORT.x + 200, y: 200 }); // out at sea, not at the pier
  return g;
}
const fish = (n: number): GameEvent[] =>
  Array.from({ length: n }, () => ({
    type: 'fishCaught' as const,
    fishId: 'sardina',
    count: 1,
    healed: false,
  }));

describe('Aurelio’s jobs', () => {
  it('count from the game’s events and pay their teeth once', () => {
    const g = jobsGame();
    expect(currentObjective(g)).toContain('sardine per il mercato (0/5)');
    const teeth = g.gear.teeth;
    stepPortJobs(g, fish(3));
    expect(currentObjective(g)).toContain('(3/5)');
    const ev = fish(2);
    stepPortJobs(g, ev);
    expect(g.gear.teeth).toBe(teeth + PORT_JOBS[0]!.reward);
    expect(ev.some((e) => e.type === 'storyNote')).toBe(true);
    stepPortJobs(g, fish(5)); // already paid
    expect(g.gear.teeth).toBe(teeth + PORT_JOBS[0]!.reward);
    expect(currentObjective(g)).toContain('(1/4)');
    expect(currentObjective(g)).toContain('barracuda');
  });

  it('battles won against barracudas, a tamed beast and the companion’s level', () => {
    const g = jobsGame();
    stepPortJobs(g, [
      { type: 'battleWon', speciesId: 'tartaruga_marina' },
      { type: 'battleWon', speciesId: 'barracuda' },
      { type: 'battleWon', speciesId: 'barracuda' },
      { type: 'tamed', uid: 'b9', toTeam: true },
    ]);
    expect(g.story.seen).toContain('lavoro:barracuda');
    expect(g.story.seen).toContain('lavoro:doma');
    expect(g.story.seen).not.toContain('lavoro:livello');
    g.beasts.team[0]!.level = 9;
    stepPortJobs(g, []);
    expect(g.story.seen).toContain('lavoro:livello');
  });

  it('with all four done, back at the pier of Portofosco the pier burns', () => {
    const g = jobsGame();
    g.beasts.team[0]!.level = 9;
    stepPortJobs(g, [
      ...fish(5),
      { type: 'battleWon', speciesId: 'barracuda' },
      { type: 'battleWon', speciesId: 'barracuda' },
      { type: 'tamed', uid: 'b9', toTeam: true },
    ]);
    expect(currentObjective(g)).toContain('torna da Aurelio');
    expect(g.story.step).toBe('portJobs'); // out at sea
    Object.assign(g.diver, { x: PORT.x, y: WORLD.surfaceY + 4 });
    stepPortJobs(g, []);
    expect(g.story.step).toBe('pier');
  });

  it('progress is saved; Aurelio has a hint', () => {
    const g = jobsGame();
    stepPortJobs(g, fish(2));
    const back = createGame(map, parseSave(JSON.stringify(toSave(g, new Date()))), 6);
    expect(back.story.step).toBe('portJobs');
    expect(back.story.jobs.sardine).toBe(2);
    const ev: GameEvent[] = [];
    askAurelio(back, ev);
    expect(ev).toContainEqual({ type: 'dialogueOpened', id: 'hintJobs' });
  });
});
