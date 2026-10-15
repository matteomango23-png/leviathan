// Is a wild beast stronger than yours at the same level? (owner, 15 ottobre 2026: "i nemici a parità di livello sono
// sempre più forti"). The same species, the same level, both sides choosing their moves the same way, many times:
// yours should win about half of them.
import { describe, expect, it } from 'vitest';
import { seedFrom } from '../src/data/stats';
import { chooseFoeMove, createBattle, endRound, firstSide, useMove, you } from '../src/systems/battle/battle';
import { fighterFromTeam, makeFighter } from '../src/systems/battle/fighter';
import { makeTeamBeast } from '../src/systems/beasts/team';
import { makeRng } from '../src/systems/math';

function duel(speciesId: string, level: number, i: number): boolean {
  const rng = makeRng(1000 + i);
  // yours as a tamed one (seeded like a wild one) and a wild one of another seed
  const mine = fighterFromTeam(
    makeTeamBeast(`b${i}`, { speciesId, variant: 'comune', seed: seedFrom(`mine${i}`) }, level, true),
  );
  const wild = makeFighter({ speciesId, variant: 'comune', seed: seedFrom(`wild${i}`) }, level);
  const s = createBattle([mine], wild);
  for (let round = 0; round < 200 && !s.over; round++) {
    s.foeMove = chooseFoeMove(s, rng);
    // you choose like the wild one does (its own way of picking, seen from your side)
    const mirror = createBattle([s.foe], you(s));
    const mine = chooseFoeMove(mirror, rng);
    const first = firstSide(s, { kind: 'move', index: mine }, rng);
    const order: ['you' | 'foe', number][] =
      first === 'you'
        ? [
            ['you', mine],
            ['foe', s.foeMove],
          ]
        : [
            ['foe', s.foeMove],
            ['you', mine],
          ];
    for (const [side, idx] of order) {
      useMove(s, side, idx, rng, side === first);
      if (s.foe.hp <= 0 || you(s).hp <= 0) break;
    }
    if (s.foe.hp <= 0) s.over = 'won';
    else if (you(s).hp <= 0) s.over = 'lost';
    else endRound(s);
  }
  return s.over === 'won';
}

describe('your beast against a wild one of the same species and level', () => {
  for (const speciesId of ['squalo_bianco', 'barracuda', 'tartaruga_marina', 'orca', 'manta'])
    it(`${speciesId}: about half the battles each`, () => {
      let won = 0;
      const n = 200;
      for (let i = 0; i < n; i++) if (duel(speciesId, 20, i)) won++;
      expect(won / n).toBeGreaterThan(0.38);
      expect(won / n).toBeLessThan(0.62);
    });
});

describe('who strikes first when a beast reaches you', () => {
  it('only from behind does it get a free attack', async () => {
    const { ambush } = await import('../src/systems/encounters');
    expect(ambush({ x: 100 }, { x: 0, face: 1 })).toBe('normal'); // you face it
    expect(ambush({ x: -100 }, { x: 0, face: 1 })).toBe('foe'); // behind you
    expect(ambush({ x: -100 }, { x: 0, face: 1 }, { face: -1 })).toBe('normal'); // your mount faces it
  });
});
