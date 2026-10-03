// Battles like Pokémon, phase 3: growth groups, Gen V scaled experience, the catch formula.
import { describe, expect, it } from 'vitest';
import { BATTLE } from '../src/data/battle';
import { GROWTH_CURVES, XP_RULES, scaledXp } from '../src/data/progression';
import { createBattle, tameChance } from '../src/systems/battle/battle';
import { makeFighter } from '../src/systems/battle/fighter';
import { growthOf, xpBetween, xpReward } from '../src/systems/beasts/growth';

const fighter = (id: string, level: number) => makeFighter({ speciesId: id, variant: 'comune' }, level);

describe('growth groups', () => {
  it('follow the Pokémon curves', () => {
    expect(GROWTH_CURVES.medio(10)).toBe(1000);
    expect(GROWTH_CURVES.veloce(10)).toBe(800);
    expect(GROWTH_CURVES.lento(10)).toBe(1250);
    expect(GROWTH_CURVES.medio_lento(10)).toBe(560);
    expect(xpBetween('medio', 10)).toBe(331);
  });

  it('grow upward at every level, so no level is free', () => {
    for (const g of Object.keys(GROWTH_CURVES) as (keyof typeof GROWTH_CURVES)[])
      for (let n = 1; n < 50; n++) expect(xpBetween(g, n), `${g} ${n}`).toBeGreaterThan(0);
  });

  it('a starter grows like a Pokémon starter, a legend slowly', () => {
    expect(growthOf({ speciesId: 'zanna', variant: 'comune' })).toBe('medio_lento');
    expect(growthOf({ speciesId: 'barracuda', variant: 'comune' })).toBe('veloce');
  });
});

describe('experience (Gen V scaled)', () => {
  it('matches the formula at equal levels', () => {
    // yield × L / 5 × 1 + 1
    expect(scaledXp(64, 10, 10)).toBe(129);
  });

  it('a stronger foe gives more, a weaker one less', () => {
    const f = { speciesId: 'barracuda', variant: 'comune' as const };
    expect(xpReward(f, 10, 5)).toBeGreaterThan(xpReward(f, 10, 10));
    expect(xpReward(f, 10, 20)).toBeLessThan(xpReward(f, 10, 10));
    expect(xpReward(f, 10, 10)).toBe(scaledXp(XP_RULES.yieldByStars[1], 10, 10));
  });
});

describe('catching (Pokémon formula)', () => {
  it('at full health it is a third of the catch rate', () => {
    const s = createBattle([fighter('squalo_bianco', 10)], fighter('barracuda', 5));
    expect(tameChance(s, 10)).toBeCloseTo(BATTLE.catch.rateByStars[1]! / 3 / 255, 2);
  });

  it('asleep or frozen ×2.5, other conditions ×1.5', () => {
    const s = createBattle([fighter('squalo_bianco', 10)], fighter('squalo_bianco', 10));
    const base = tameChance(s, 10);
    s.foe.status = 'stordito';
    expect(tameChance(s, 10)).toBeCloseTo(base * 2.5, 5);
    s.foe.status = 'avvelenato';
    expect(tameChance(s, 10)).toBeCloseTo(base * 1.5, 5);
  });

  it('a legend is much harder than a common beast', () => {
    const common = createBattle([fighter('squalo_bianco', 10)], fighter('squalo_bianco', 10));
    const legend = createBattle(
      [fighter('squalo_bianco', 10)],
      makeFighter({ speciesId: 'squalo_bianco', variant: 'comune', unique: 'sfregiato' }, 10),
    );
    expect(tameChance(legend, 10)).toBeLessThan(tameChance(common, 10) / 3);
  });
});
