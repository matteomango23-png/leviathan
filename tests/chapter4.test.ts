// Chapter 4 (tappa 18): the Foresta Sommersa, the bell that sounds the Corno delle Catene, the tentacles that grab
// you while the spell holds, the Piovra (level 25) by the sunken galleon, the Vedova fleeing to the north.
import { describe, expect, it } from 'vitest';
import { BELL, PIOVRA, TENTACLES, WRECK } from '../src/data/chapter4';
import { GUARDIAN_TEETH_REWARD } from '../src/data/world';
import { finishBattle } from '../src/systems/battleResult';
import { hitBell, spellBroken } from '../src/systems/chapter4';
import { currentObjective, finishDialogue } from '../src/systems/chapters';
import type { GameEvent } from '../src/systems/events';
import { createGame, stepGame, toSave, type GameState } from '../src/systems/game';
import { emptyInput, type InputState } from '../src/systems/input';
import { parseSave } from '../src/systems/save/saveData';
import { askAurelio } from '../src/systems/story';
import { giveTestBeast } from '../src/systems/testTools';
import { generateWorld } from '../src/systems/world/worldGen';

const map = generateWorld();

function chapter4Game(): GameState {
  const g = createGame(map, null, 7);
  g.story.step = 'chapter3Done';
  g.story.seen.push('starter');
  giveTestBeast(g, { speciesId: 'zanna', variant: 'comune' }, 30);
  return g;
}
function run(g: GameState, seconds: number, input: InputState = emptyInput()): GameEvent[] {
  const all: GameEvent[] = [];
  for (let t = 0; t < seconds; t += 1 / 30) {
    g.diver.invulnerable = 5;
    all.push(...stepGame(g, input, 1 / 30));
    if (g.story.dialogue) finishDialogue(g, all);
  }
  return all;
}
const piovra = (g: GameState) => g.beasts.wilds.find((w) => w.storyBoss && w.spawn.speciesId === 'piovra')!;
const breakBell = (g: GameState): void => {
  for (let i = 0; i < BELL.hp; i++) hitBell(g, BELL.x, BELL.y, []);
};

describe('chapter 4: the Piovra', () => {
  it('the Vedova speaks above the forest; the bell breaks in three hits and the spell with it', () => {
    const g = chapter4Game();
    expect(currentObjective(g)).toContain('Foresta Sommersa');
    Object.assign(g.diver, { x: PIOVRA.shipX, y: 120 });
    const ev = run(g, 0.2);
    expect(ev).toContainEqual({ type: 'dialogueOpened', id: 'piovra' });
    expect(g.story.step).toBe('freePiovra');
    expect(currentObjective(g)).toContain('campana');
    expect(hitBell(g, BELL.x + 40, BELL.y, [])).toBe(false); // missed
    hitBell(g, BELL.x, BELL.y, []);
    hitBell(g, BELL.x, BELL.y, []);
    expect(spellBroken(g)).toBe(false);
    hitBell(g, BELL.x, BELL.y, []);
    expect(spellBroken(g)).toBe(true);
    expect(currentObjective(g)).toContain('Piovra');
  });

  it('while the spell holds, a raised tentacle grabs you; you lose air; tapping the dash frees you', () => {
    const g = chapter4Game();
    g.story.step = 'freePiovra';
    const t = g.chapter4.tentacles[0]!;
    Object.assign(g.diver, { x: t.x, y: WRECK.floorY - 30, o2: g.diver.maxO2 });
    Object.assign(t, { stage: 'up', t: 5 });
    const ev = run(g, 0.1);
    expect(g.chapter4.grab).not.toBeNull();
    expect(ev.some((e) => e.type === 'storyNote')).toBe(true);
    const o2 = g.diver.o2;
    run(g, 1);
    expect(g.diver.o2).toBeLessThan(o2);
    for (let i = 0; i < TENTACLES.grab.taps; i++) run(g, 1 / 30, { ...emptyInput(), dash: true });
    expect(g.chapter4.grab).toBeNull();
    // once the bell is broken the tentacles sleep
    breakBell(g);
    Object.assign(t, { stage: 'up', t: 5 });
    g.chapter4.grabCooldown = 0;
    run(g, 0.2);
    expect(g.chapter4.grab).toBeNull();
  });

  it('by the wreck she rises (level 25) and fights; beaten, the collar snaps and she joins you', () => {
    const g = chapter4Game();
    g.story.step = 'freePiovra';
    breakBell(g);
    Object.assign(g.diver, { x: WRECK.x - 60, y: WRECK.floorY - 40 });
    run(g, 0.1);
    const p = piovra(g);
    expect(p.motion).toBe('roam');
    expect(p.level).toBe(PIOVRA.level);
    expect(p.boss).toBe(PIOVRA.title);
    g.beasts.battle = { wildId: p.id, first: 'normal' };
    const a = g.beasts.team[0]!;
    finishBattle(g, {
      wildId: p.id,
      over: 'won',
      team: [{ uid: a.uid, hp: 5 }],
      lastActive: a.uid,
      foe: { form: p.form, level: p.level, hp: 0 },
    });
    const teeth = g.gear.teeth;
    const ev = run(g, 0.2);
    expect(ev).toContainEqual({ type: 'guardianBeaten', teeth: GUARDIAN_TEETH_REWARD });
    expect(g.gear.teeth).toBe(teeth + GUARDIAN_TEETH_REWARD);
    expect(ev).toContainEqual({ type: 'dialogueOpened', id: 'piovraFree' });
    expect(g.beasts.team.filter((b) => b.form.speciesId === 'piovra')).toHaveLength(1);
    expect(g.story.step).toBe('chapter4Done');
    expect(g.story.ship).not.toBeNull();
    expect(currentObjective(g)).toContain('Mare di Ghiaccio');
  });

  it('the broken bell stays broken in the save; Aurelio has a hint', () => {
    const g = chapter4Game();
    g.story.step = 'freePiovra';
    breakBell(g);
    const back = createGame(map, parseSave(JSON.stringify(toSave(g, new Date()))), 7);
    expect(spellBroken(back)).toBe(true);
    expect(back.chapter4.bellHp).toBe(0);
    const ev: GameEvent[] = [];
    askAurelio(back, ev);
    expect(ev).toContainEqual({ type: 'dialogueOpened', id: 'hintPiovra' });
  });
});
