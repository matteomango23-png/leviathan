// The hunter's card, like Pokémon's trainer card: the numbers of the journey and the Guardians as badges.
import { describe, expect, it } from 'vitest';
import { SPECIES } from '../src/data/species';
import { createGame } from '../src/systems/game';
import { hunterCard } from '../src/systems/hunterCard';
import { giveTestBeast } from '../src/systems/testTools';
import { generateWorld } from '../src/systems/world/worldGen';

describe('hunter card', () => {
  it('counts the bestiary, the teeth and the Guardians beaten', () => {
    const g = createGame(generateWorld(), null, 4);
    giveTestBeast(g, { speciesId: 'zanna', variant: 'comune' }, 5);
    g.gear.teeth = 120;
    let c = hunterCard(g);
    expect(c.tamed).toBe(1);
    expect(c.seen).toBeGreaterThanOrEqual(1);
    expect(c.species).toBe(SPECIES.length);
    expect(c.teeth).toBe(120);
    expect(c.badges.every((b) => !b.beaten)).toBe(true);
    g.gear.guardians.push('sfregiato');
    c = hunterCard(g);
    expect(c.badges[0]!.beaten).toBe(true);
  });
});
