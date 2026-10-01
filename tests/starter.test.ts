// The first beast (chosen right after the opening, like Pokémon) and the evolutions of the three lines.
import { beforeAll, describe, expect, it } from 'vitest';
import { STARTER } from '../src/data/story';
import { emptyInput } from '../src/systems/input';
import { fishXp, raiseLevel, xpReward } from '../src/systems/beasts/growth';
import { PROGRESSION } from '../src/data/rules';
import { movesFor } from '../src/systems/beasts/team';
import type { GameEvent } from '../src/systems/events';
import { createGame, stepGame, toSave } from '../src/systems/game';
import { parseSave } from '../src/systems/save/saveData';
import { chooseStarter, needsStarter, STARTERS } from '../src/systems/starter';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';
import { battleArt } from '../src/views/battle/beastArt';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

describe('the first beast', () => {
  it('is offered right after the opening, and the sea waits for the choice', () => {
    const g = createGame(map, null, 1);
    g.story.step = 'intro';
    expect(needsStarter(g)).toBe(false); // the opening scene first
    g.story.step = 'tutorial';
    expect(needsStarter(g)).toBe(true);
    const t = g.time;
    stepGame(g, emptyInput(), 1 / 60);
    expect(g.time).toBe(t);
  });

  it('joins the team at its level; the choice is saved and never asked again', () => {
    const g = createGame(map, null, 1);
    g.story.step = 'tutorial';
    const events: GameEvent[] = [];
    const b = chooseStarter(g, 'scintilla', events)!;
    expect(b.level).toBe(STARTER.level);
    expect(b.inTeam).toBe(true);
    expect(events.some((e) => e.type === 'tamed')).toBe(true);
    expect(needsStarter(g)).toBe(false);
    const loaded = createGame(map, parseSave(JSON.stringify(toSave(g, new Date()))), 1);
    expect(needsStarter(loaded)).toBe(false);
    expect(loaded.beasts.team[0]!.form.speciesId).toBe('scintilla');
    expect(chooseStarter(g, 'squalo_bianco', [])).toBeNull(); // only the three starters
  });

  it('is offered to an older game with no beasts', () => {
    const g = createGame(map, null, 1);
    g.story.step = 'findShark';
    expect(needsStarter(g)).toBe(true);
  });

  it('offers three beasts of three different types', () => {
    expect(STARTERS.map((s) => s.id)).toEqual(['zanna', 'guscio', 'scintilla']);
  });
});

describe('evolutions', () => {
  it('a line changes stage at 16 and 36 and keeps its moves', () => {
    const g = createGame(map, null, 1);
    g.story.step = 'tutorial';
    const b = chooseStarter(g, 'zanna', [])!;
    const moves = movesFor(b).map((m) => m.move.id);
    const events: GameEvent[] = [];
    raiseLevel(b, 16 - b.level, events);
    expect(b.form.speciesId).toBe('squarcio');
    expect(events).toContainEqual({ type: 'evolved', uid: b.uid, from: 'Zanna', fromId: 'zanna' });
    expect(movesFor(b).map((m) => m.move.id)).toEqual(moves);
    raiseLevel(b, 36 - b.level, events);
    expect(b.form.speciesId).toBe('zannarossa');
  });

  it('every stage of the three lines has its own pictures', () => {
    for (const id of [
      'zanna',
      'squarcio',
      'zannarossa',
      'guscio',
      'rocciaguscio',
      'archelon',
      'scintilla',
      'saetta',
      'folgore',
    ]) {
      const art = battleArt({ speciesId: id, variant: 'comune' }, 'foe');
      expect(art.own, id).toBe(true);
      expect(art.url).toContain(`sprites/${id}_front.webp`);
    }
  });
});

describe('pace of the levels (Pokémon style)', () => {
  const fightsTo = (from: number, to: number, foeLevel: (l: number) => number): number => {
    let n = 0;
    for (let l = from; l < to; l++) {
      let need = PROGRESSION.xpCurve(l);
      while (need > 0) {
        need -= xpReward({ speciesId: 'barracuda', variant: 'comune' }, foeLevel(l));
        n++;
      }
    }
    return n;
  };

  it('the first evolution comes quickly, the second takes longer', () => {
    const toFirst = fightsTo(STARTER.level, 16, (l) => Math.max(3, l - 2));
    const toSecond = fightsTo(16, 36, (l) => l - 2);
    expect(toFirst).toBeLessThan(30);
    expect(toSecond).toBeGreaterThan(toFirst);
    expect(toSecond).toBeLessThan(60);
  });

  it('a fish is worth some experience, a fight much more', () => {
    expect(fishXp(10)).toBeGreaterThan(0);
    expect(xpReward({ speciesId: 'barracuda', variant: 'comune' }, 10)).toBeGreaterThan(fishXp(10) * 10);
  });
});

describe('pictures loaded at start', () => {
  it('include every stage of the three lines, so a called starter is drawn in the sea', async () => {
    const { neededSpriteKeys } = await import('../src/views/neededSprites');
    const keys = neededSpriteKeys();
    for (const id of [
      'zanna',
      'squarcio',
      'zannarossa',
      'guscio',
      'rocciaguscio',
      'archelon',
      'scintilla',
      'saetta',
      'folgore',
    ])
      expect(keys, id).toContain(id);
  });
});
