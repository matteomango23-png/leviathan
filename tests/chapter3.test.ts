// Chapter 3 (tappa 15): the amphitheatre of the Barriera Rossa, the Re Corallo (level 20) in chains, the battle,
// the chains broken once he is exhausted, the Vedova fleeing towards the Foresta Sommersa.
import { describe, expect, it } from 'vitest';
import { ARENA, CORAL_KING } from '../src/data/chapter3';
import { GUARDIAN_TEETH_REWARD } from '../src/data/world';
import { TILE } from '../src/data/worldLayout';
import { finishBattle } from '../src/systems/battleResult';
import { chainPoints, chainsBroken, hitChain, kingDown, kingRestY } from '../src/systems/chapter3';
import { currentObjective, finishDialogue } from '../src/systems/chapters';
import type { GameEvent } from '../src/systems/events';
import { createGame, stepGame, toSave, type GameState } from '../src/systems/game';
import { emptyInput } from '../src/systems/input';
import { parseSave } from '../src/systems/save/saveData';
import { askAurelio } from '../src/systems/story';
import { giveTestBeast } from '../src/systems/testTools';
import { arenaFloor } from '../src/systems/world/arena';
import { generateWorld } from '../src/systems/world/worldGen';

const map = generateWorld();
const T = map.tileSize;
const tile = (x: number, y: number): number => map.get(Math.floor(x / T), Math.floor(y / T));

function chapter3Game(): GameState {
  const g = createGame(map, null, 5);
  g.story.step = 'chapter2Done';
  g.story.seen.push('starter');
  giveTestBeast(g, { speciesId: 'zanna', variant: 'comune' }, 25);
  return g;
}
function run(g: GameState, seconds: number): GameEvent[] {
  const all: GameEvent[] = [];
  for (let t = 0; t < seconds; t += 1 / 30) {
    g.diver.invulnerable = 5;
    g.diver.o2 = g.diver.maxO2;
    all.push(...stepGame(g, emptyInput(), 1 / 30));
    if (g.story.dialogue) finishDialogue(g, all);
  }
  return all;
}
const king = (g: GameState) => g.beasts.wilds.find((w) => w.storyBoss)!;
/** Into the bowl, on the far side from where he waits. */
const goDown = (g: GameState): void => {
  Object.assign(g.diver, { x: ARENA.x - ARENA.rx * 0.6, y: ARENA.y0 + ARENA.depth * 0.5, vx: 0, vy: 0 });
};
function beat(g: GameState, over: 'won' | 'caught'): GameEvent[] {
  const k = king(g);
  const a = g.beasts.team[0]!;
  return finishBattle(g, {
    wildId: k.id,
    over,
    team: [{ uid: a.uid, hp: 5 }],
    lastActive: a.uid,
    foe: { form: k.form, level: k.level, hp: 1 },
  });
}
const hitAll = (g: GameState, times: number): GameEvent[] => {
  const ev: GameEvent[] = [];
  for (let i = 0; i < times; i++) for (const p of chainPoints()) hitChain(g, p.x, p.y, 1, ev);
  return ev;
};

describe('chapter 3: the Re Corallo', () => {
  it('the amphitheatre is a stepped bowl carved into the reef floor', () => {
    const mid = arenaFloor(ARENA.x)!;
    const edge = arenaFloor(ARENA.x + ARENA.rx * 0.9)!;
    expect(mid).toBeGreaterThan(edge); // deeper in the middle: terraces
    expect(tile(ARENA.x, mid - 6)).toBe(TILE.water);
    expect(tile(ARENA.x, mid + 10)).toBe(TILE.rock);
    expect(tile(ARENA.x + ARENA.rx * 0.9, edge - 4)).toBe(TILE.water);
    for (const p of chainPoints()) expect(map.hitCircle(p.x, p.y - 8, 2)).toBe(false); // the winches stand in water
  });

  it('the Vedova speaks above the amphitheatre; then the Re Corallo rises and comes at you', () => {
    const g = chapter3Game();
    expect(currentObjective(g)).toContain('Barriera Rossa');
    Object.assign(g.diver, { x: CORAL_KING.shipX, y: ARENA.y0 - 60 });
    const ev = run(g, 0.2);
    expect(ev).toContainEqual({ type: 'dialogueOpened', id: 'reCorallo' });
    expect(g.story.step).toBe('freeKing');
    goDown(g);
    run(g, 0.1);
    const k = king(g);
    expect(k.motion).toBe('roam');
    expect(k.level).toBe(CORAL_KING.level);
    expect(k.boss).toBe(CORAL_KING.title);
    expect(g.beasts.arena).toBe(true);
    // he scuttles towards you along the bottom, and touching you is a battle
    const from = k.x;
    run(g, 0.5);
    expect(Math.abs(k.x - g.diver.x)).toBeLessThan(Math.abs(from - g.diver.x));
    expect(Math.abs(k.y - kingRestY(k.x))).toBeLessThan(0.01);
    Object.assign(g.diver, { x: k.x, y: k.y - 4 });
    run(g, 0.1);
    expect(g.beasts.battle?.wildId).toBe(k.id);
  });

  it('the chains do not break while he fights; beaten, he lies exhausted and they do', () => {
    const g = chapter3Game();
    g.story.step = 'freeKing';
    goDown(g);
    run(g, 0.1);
    hitAll(g, 20);
    expect(chainsBroken(g.chapter3)).toBe(0);
    g.beasts.battle = { wildId: king(g).id, first: 'normal' };
    beat(g, 'won');
    const teeth = g.gear.teeth;
    const ev = run(g, 0.1);
    expect(kingDown(g)).toBe(true);
    expect(king(g).motion).toBe('gone');
    expect(g.beasts.arena).toBe(false);
    expect(ev).toContainEqual({ type: 'guardianBeaten', teeth: GUARDIAN_TEETH_REWARD });
    expect(g.gear.teeth).toBe(teeth + GUARDIAN_TEETH_REWARD);
    expect(currentObjective(g)).toContain('catene');
    // he does not rise again while he lies there
    run(g, 0.5);
    expect(king(g).motion).toBe('gone');
    hitAll(g, CORAL_KING.chainHp);
    expect(chainsBroken(g.chapter3)).toBe(3);
    const end = run(g, 0.1);
    expect(end).toContainEqual({ type: 'dialogueOpened', id: 'kingFree' });
    const rc = g.beasts.team.filter((b) => b.form.speciesId === 're_corallo');
    expect(rc).toHaveLength(1);
    expect(rc[0]!.level).toBe(20);
    expect(g.story.step).toBe('chapter3Done');
    expect(g.story.ship).not.toBeNull(); // the Vedova sails off
    expect(currentObjective(g)).toContain('Foresta Sommersa');
  });

  it('tamed in battle, the chains give way by themselves and he joins only once', () => {
    const g = chapter3Game();
    g.story.step = 'freeKing';
    goDown(g);
    run(g, 0.1);
    g.beasts.battle = { wildId: king(g).id, first: 'normal' };
    beat(g, 'caught');
    run(g, 0.2);
    expect(chainsBroken(g.chapter3)).toBe(3);
    expect(g.story.step).toBe('chapter3Done');
    expect(g.beasts.team.filter((b) => b.form.speciesId === 're_corallo')).toHaveLength(1);
  });

  it('exhausted and the chains already broken stay so in the save; Aurelio has a hint', () => {
    const g = chapter3Game();
    g.story.step = 'freeKing';
    goDown(g);
    run(g, 0.1);
    g.beasts.battle = { wildId: king(g).id, first: 'normal' };
    beat(g, 'won');
    run(g, 0.1);
    const p = chainPoints()[0]!;
    for (let i = 0; i < CORAL_KING.chainHp; i++) hitChain(g, p.x, p.y, 1, []);
    const back = createGame(map, parseSave(JSON.stringify(toSave(g, new Date()))), 5);
    expect(kingDown(back)).toBe(true);
    expect(chainsBroken(back.chapter3)).toBe(1);
    const ev: GameEvent[] = [];
    askAurelio(back, ev);
    expect(ev).toContainEqual({ type: 'dialogueOpened', id: 'hintFreeKing' });
  });
});
