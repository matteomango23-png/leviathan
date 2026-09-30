import { describe, expect, it } from 'vitest';
import { RARE_UNIQUES, VEDOVA } from '../src/data/chapter2';
import { WRECKS } from '../src/data/economy';
import { DELTA, TILE, WORLD } from '../src/data/worldLayout';
import { rollWildForm } from '../src/systems/beasts/forms';
import { spawnWild, stepWild } from '../src/systems/beasts/wild';
import { anchorsBroken, hitAnchor } from '../src/systems/chapter2';
import { currentObjective, finishDialogue } from '../src/systems/chapters';
import type { GameEvent } from '../src/systems/events';
import { createGame, stepGame, type GameState } from '../src/systems/game';
import { emptyInput } from '../src/systems/input';
import { generateWorld } from '../src/systems/world/worldGen';
import { murkAt, zoneAt } from '../src/systems/world/zones';

const map = generateWorld();
const mid = (DELTA.x0 + DELTA.x1) / 2;

function chapter2Game(): GameState {
  const g = createGame(map, null, 9);
  g.story.step = 'chapter1Done';
  return g;
}

function run(g: GameState, seconds: number): GameEvent[] {
  const all: GameEvent[] = [];
  for (let t = 0; t < seconds; t += 1 / 30) {
    g.diver.invulnerable = 5;
    g.diver.o2 = g.diver.maxO2;
    all.push(...stepGame(g, emptyInput(), 1 / 30));
  }
  return all;
}

describe('the Delta delle Mangrovie', () => {
  it('lies between the bay and the reef, shallow and murky', () => {
    expect(zoneAt(mid, 100)).toBe('Delta delle Mangrovie');
    expect(zoneAt(DELTA.x1 + 200, 100)).toBe('Barriera Rossa');
    const floor = map.floorBelow(mid, WORLD.surfaceY + 10);
    expect((floor - WORLD.surfaceY) / WORLD.unitsPerMetre).toBeLessThan(34);
    expect(murkAt(mid, 100)).toBe(1);
    expect(murkAt(500, 100)).toBe(0);
    expect(murkAt(mid, WORLD.surfaceY - 5)).toBe(0);
  });

  it('has mangrove islands above the water', () => {
    const [x0, x1] = DELTA.islands[1]!;
    expect(map.tileAtPoint((x0 + x1) / 2, WORLD.surfaceY - 3)).toBe(TILE.rock);
    expect(map.tileAtPoint((x0 + x1) / 2, WORLD.surfaceY + 6)).toBe(TILE.water);
  });

  it('moved the reef east: its wreck is still on open water', () => {
    const w = WRECKS.find((x) => x.id === 'relitto_barriera')!;
    expect(w.x).toBeGreaterThan(DELTA.x1);
    expect(map.tileAtPoint(w.x, w.y)).toBe(TILE.water);
  });
});

describe('crocodiles', () => {
  it('cruise just under the surface', () => {
    const g = createGame(map, null, 3);
    Object.assign(g.diver, { x: mid, y: 150 });
    const w = g.beasts.wilds.find((x) => x.spawn.speciesId === 'coccodrillo_marino')!;
    spawnWild(w, { speciesId: 'coccodrillo_marino', variant: 'comune' }, 10, g.rng, 0.01);
    const view = { x: mid - 170, y: 70, w: 340, h: 160 };
    let maxDepth = 0;
    for (let i = 0; i < 90; i++) {
      stepWild(w, { diver: g.diver, view, map, rng: g.rng, dt: 1 / 30 }, []);
      if (w.motion === 'cruise' || w.motion === 'enter') maxDepth = Math.max(maxDepth, w.y - WORLD.surfaceY);
    }
    expect(maxDepth).toBeLessThan(w.length * 0.3);
  });

  it('are sometimes the legendary albino', () => {
    const rare = RARE_UNIQUES.coccodrillo_marino!;
    expect(rollWildForm('coccodrillo_marino', () => rare.chance / 2).unique).toBe(rare.unique);
    expect(rollWildForm('coccodrillo_marino', () => 0.99).unique).toBeUndefined();
  });
});

describe('chapter 2: freeing the whale', () => {
  it('in the Delta the Vedova speaks and lets her crocodile loose', () => {
    const g = chapter2Game();
    expect(currentObjective(g)).toContain('Delta');
    Object.assign(g.diver, { x: mid, y: 120 });
    expect(run(g, 0.1)).toContainEqual({ type: 'dialogueOpened', id: 'vedova' });
    finishDialogue(g, g.story.pending);
    run(g, 0.1);
    expect(g.story.step).toBe('freeWhale');
    const croc = g.beasts.wilds.find((w) => w.boss === VEDOVA.croc.title);
    expect(croc?.form.variant).toBe('alfa');
    expect(croc?.level).toBe(VEDOVA.croc.level);
    expect(currentObjective(g)).toContain('0/3');
  });

  it('three anchors break under the harpoon; the whale joins you, the ship sails east', () => {
    const g = chapter2Game();
    g.story.step = 'freeWhale';
    const events: GameEvent[] = [];
    for (const a of g.chapter2.anchors)
      for (let i = 0; i < VEDOVA.anchorHp; i++) expect(hitAnchor(g, a.x, a.y, 1, events)).toBe(true);
    expect(anchorsBroken(g.chapter2)).toBe(3);
    expect(events.filter((e) => e.type === 'storyNote')).toHaveLength(3);
    expect(hitAnchor(g, g.chapter2.anchors[0]!.x, g.chapter2.anchors[0]!.y, 1, [])).toBe(false);
    Object.assign(g.diver, { x: mid, y: 120 });
    run(g, 0.1);
    expect(g.story.dialogue).toBe('whaleFree');
    finishDialogue(g, g.story.pending);
    expect(g.story.step).toBe('chapter2Done');
    const whale = g.beasts.team.find((b) => b.form.speciesId === 'megattera');
    expect(whale?.level).toBe(VEDOVA.whale.level);
    expect(g.story.ship?.whale).toBe(false);
    expect(currentObjective(g)).toContain('Capitolo 2 completato');
  });

  it('anchors ignore weapons outside the fight', () => {
    const g = chapter2Game();
    const a = g.chapter2.anchors[0]!;
    expect(hitAnchor(g, a.x, a.y, 1, [])).toBe(false);
  });
});
