// The opening (owner, 2 ottobre): the Company ship with the whale sails on while Aurelio talks, then hurries off
// into the dark; it is never seen vanishing next to you.
import { beforeAll, describe, expect, it } from 'vitest';
import { SCENES } from '../src/data/story';
import { createGame, stepGame } from '../src/systems/game';
import { emptyInput } from '../src/systems/input';
import { startNewGame } from '../src/systems/story';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

describe('the opening ship', () => {
  it('sails on while Aurelio talks, then leaves faster than you swim and is gone only far from you', () => {
    const g = createGame(map, null, 2);
    startNewGame(g);
    for (let t = 0; t < SCENES.introShipSeconds + 0.5; t += 1 / 30) stepGame(g, emptyInput(), 1 / 30);
    expect(g.story.dialogue).not.toBeNull();
    const x0 = g.story.ship!.x;
    for (let t = 0; t < 2; t += 1 / 30) stepGame(g, emptyInput(), 1 / 30);
    expect(g.story.ship!.x).toBeGreaterThan(x0); // moving during the words
    // the opening is over: you swim after it as fast as you can
    g.story.dialogue = null;
    g.story.step = 'tutorial';
    for (let t = 0; t < 40 && g.story.ship; t += 1 / 30) {
      const ship = g.story.ship;
      stepGame(g, { ...emptyInput(), moveX: 1 }, 1 / 30);
      if (!g.story.ship) expect(Math.abs(ship.x - g.diver.x)).toBeGreaterThan(SCENES.ship.goneDistance - 10);
    }
    expect(g.story.ship).toBeNull();
  });
});
