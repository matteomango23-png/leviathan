// Lotto K (owner, 16 ottobre 2026): Aurelio's tips, each once, the first time its moment comes; never during the
// opening and the guided dive; switched off from the Guida.
import { describe, expect, it } from 'vitest';
import { DIALOGUES, TIPS } from '../src/data/story';
import type { GameEvent } from '../src/systems/events';
import { createStory, startNewGame } from '../src/systems/story';
import { createGame } from '../src/systems/game';
import { generateWorld } from '../src/systems/world/worldGen';
import { setTipsOn, stepTips, tipsOn } from '../src/systems/tips';

const story = () => {
  const s = createStory(null, true, true); // a save with the ship: the sea is open
  expect(s.step).toBe('free');
  return s;
};

describe('i consigli di Aurelio', () => {
  it('la prima volta al timone apre il consiglio della nave, la seconda no', () => {
    const s = story();
    const ev: GameEvent[] = [{ type: 'shipBoarded' }];
    stepTips(s, ev);
    expect(s.dialogue).toBe('tipShip');
    s.dialogue = null;
    s.seen.push('tipShip'); // closeDialogue marks it read
    stepTips(s, [{ type: 'shipBoarded' }]);
    expect(s.dialogue).toBeNull();
  });

  it('una leggenda in vista e una bestia domata fuori squadra hanno i loro consigli', () => {
    const s = story();
    stepTips(s, [{ type: 'wildAppeared', id: 1, rare: true, legend: true }]);
    expect(s.dialogue).toBe('tipLegend');
    const t = story();
    stepTips(t, [{ type: 'tamed', uid: 'b9', toTeam: false }]);
    expect(t.dialogue).toBe('tipTeamFull');
    const u = story();
    stepTips(u, [{ type: 'tamed', uid: 'b9', toTeam: true }]);
    expect(u.dialogue).toBeNull();
  });

  it('niente consigli nella prima immersione guidata, con un dialogo aperto, o se spenti', () => {
    const s = story();
    s.step = 'tutorial';
    stepTips(s, [{ type: 'mounted' }]);
    expect(s.dialogue).toBeNull();
    const t = story();
    t.dialogue = 'hintFree';
    stepTips(t, [{ type: 'mounted' }]);
    expect(t.dialogue).toBe('hintFree');
    const u = story();
    setTipsOn(u, false);
    stepTips(u, [{ type: 'mounted' }]);
    expect(u.dialogue).toBeNull();
    setTipsOn(u, true);
    stepTips(u, [{ type: 'mounted' }]);
    expect(u.dialogue).toBe('tipRide');
  });

  it('ogni consiglio della Guida ha il suo dialogo', () => {
    for (const t of TIPS) expect(DIALOGUES[t.id].length, t.id).toBeGreaterThan(0);
    expect(new Set(TIPS.map((t) => t.on)).size).toBe(TIPS.length);
  });

  it('una partita nuova ha i consigli; una di prova no', () => {
    const g = createGame(generateWorld(), null, 4);
    expect(tipsOn(g.story)).toBe(false); // made without a save (tests, tools)
    startNewGame(g);
    expect(tipsOn(g.story)).toBe(true);
  });
});
