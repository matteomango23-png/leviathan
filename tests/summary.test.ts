// The beast's summary like Pokémon: the order of the moves, its experience, where you met it, an evolution waiting.
import { describe, expect, it } from 'vitest';
import { GROWTH_CURVES } from '../src/data/progression';
import { swapMoves } from '../src/systems/beasts/battleMoves';
import { growthOf, totalXp } from '../src/systems/beasts/growth';
import { makeTeamBeast } from '../src/systems/beasts/team';
import { restoreTeam } from '../src/systems/save/convert';
import { newSave, parseSave } from '../src/systems/save/saveData';

describe('the summary', () => {
  it('two moves change place, and their PP go with them', () => {
    const b = makeTeamBeast('b1', { speciesId: 'zanna', variant: 'comune' }, 13, true);
    b.ppUsed = [1, 2, 3, 4];
    const [a, c] = [b.known[0], b.known[2]];
    expect(swapMoves(b, 0, 2)).toBe(true);
    expect(b.known[0]).toBe(c);
    expect(b.known[2]).toBe(a);
    expect(b.ppUsed).toEqual([3, 2, 1, 4]);
    expect(swapMoves(b, 0, 9)).toBe(false);
  });

  it('total experience is the curve of its group at its level plus the rest', () => {
    const b = makeTeamBeast('b1', { speciesId: 'zanna', variant: 'comune' }, 10, true);
    b.xp = 42;
    expect(totalXp(b)).toBe(GROWTH_CURVES[growthOf(b.form)](10) + 42);
  });

  it('an evolution waiting and where you met it stay in the save', () => {
    const save = newSave({ x: 0, y: 0 });
    save.team = [
      {
        uid: 'b1',
        form: { speciesId: 'zanna', variant: 'comune' },
        level: 16,
        hp: 20,
        ko: false,
        inTeam: true,
        xp: 0,
        food: 0,
        evolveReady: true,
        met: { level: 5, place: 'Baia di Portofosco' },
      },
    ];
    const b = restoreTeam(parseSave(JSON.stringify(save)))[0]!;
    expect(b.evolveReady).toBe(true);
    expect(b.met).toEqual({ level: 5, place: 'Baia di Portofosco' });
  });
});
