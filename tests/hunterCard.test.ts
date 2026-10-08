// The hunter's card, like Pokémon's trainer card: the numbers of the journey (the Guardians' badges are gone with
// the paused story, 8 ottobre 2026).
import { describe, expect, it } from 'vitest';
import { GAME_SPECIES, SPECIES } from '../src/data/species';
import { createGame } from '../src/systems/game';
import { hunterCard } from '../src/systems/hunterCard';
import { giveTestBeast } from '../src/systems/testTools';
import { generateWorld } from '../src/systems/world/worldGen';

describe('hunter card', () => {
  it('counts the bestiary and the teeth, without the beasts of the paused story', () => {
    const g = createGame(generateWorld(), null, 4);
    giveTestBeast(g, { speciesId: 'zanna', variant: 'comune' }, 5);
    g.gear.teeth = 120;
    const c = hunterCard(g);
    expect(c.tamed).toBe(1);
    expect(c.seen).toBeGreaterThanOrEqual(1);
    expect(c.species).toBe(GAME_SPECIES.length);
    expect(c.species).toBe(SPECIES.length - 2); // the Re Corallo and the Piovra wait for the new story
    expect(c.teeth).toBe(120);
  });
});
