// Lot BB (22 ottobre 2026, block 6): you choose who rests in the ship's pool (your picks first, the free places to
// the most hurt, never the ones you took out); the hand-made waters have beasts up to about level 30, mostly low.
import { describe, expect, it } from 'vitest';
import { COAST_LEVELS } from '../src/data/beasts';
import { rollWildLevel } from '../src/systems/beasts/forms';
import { makeTeamBeast, maxHpOf, type TeamBeast } from '../src/systems/beasts/team';
import { makeRng } from '../src/systems/math';
import { goesInPool, inPool, togglePool } from '../src/systems/ship/shipPool';
import { newShip } from '../src/systems/ship/ship';
import { shipModel } from '../src/systems/ship/model';

function world() {
  const ship = newShip(null);
  Object.assign(ship, { owned: true, aboard: true });
  const team: TeamBeast[] = ['barracuda', 'delfino', 'tonno', 'cernia', 'lampuga'].map((id, i) =>
    makeTeamBeast(`b${i}`, { speciesId: id, variant: 'comune' }, 10, true),
  );
  // all hurt, the last ones most
  team.forEach((b, i) => (b.hp = Math.round(maxHpOf(b) * (0.9 - i * 0.15))));
  return { ship, beasts: { team } };
}

describe('la vasca della nave (proprietario: "scegliere chi va in vasca")', () => {
  it('di suo prende le più ferite; la tua scelta passa avanti, e chi togli resta fuori', () => {
    const g = world();
    const places = shipModel(g.ship).pool;
    expect(places).toBeGreaterThan(0);
    const auto = inPool(g).map((b) => b.uid);
    expect(auto[0]).toBe('b4'); // the most hurt
    togglePool(g, 'b0'); // the least hurt, by your choice
    expect(goesInPool(g, 'b0')).toBe(true);
    expect(inPool(g)).toHaveLength(places);
    togglePool(g, 'b0'); // taken out again: it stays out, the free place goes back to the most hurt
    expect(goesInPool(g, 'b0')).toBe(false);
    expect(goesInPool(g, 'b4')).toBe(true);
    togglePool(g, 'b4'); // the most hurt taken out too: the next most hurt instead
    expect(goesInPool(g, 'b4')).toBe(false);
    expect(goesInPool(g, places > 1 ? 'b2' : 'b3')).toBe(true);
  });

  it('a terra la vasca non cura nessuno', () => {
    const g = world();
    g.ship.aboard = false;
    expect(inPool(g)).toHaveLength(0);
  });
});

describe('la costa fino a circa livello 30', () => {
  it('le bestie della costa arrivano fino al livello 30, quasi sempre più basse', () => {
    const rng = makeRng(7);
    const small = Array.from({ length: 2000 }, () =>
      rollWildLevel({ speciesId: 'murena', variant: 'comune' }, rng),
    );
    const [lo, hi] = COAST_LEVELS.byDanger[2]!;
    expect(Math.min(...small)).toBeGreaterThanOrEqual(lo);
    expect(Math.max(...small)).toBeLessThanOrEqual(hi);
    expect(Math.max(...small)).toBeGreaterThan(26);
    expect(small.filter((l) => l < 20).length / small.length).toBeGreaterThan(0.6);
    const harmless = Array.from({ length: 500 }, () =>
      rollWildLevel({ speciesId: 'barracuda', variant: 'comune' }, rng),
    );
    expect(Math.max(...harmless)).toBeLessThanOrEqual(COAST_LEVELS.byDanger[1]![1]);
  });

  it('in mare aperto (con la sua fascia) i livelli restano quelli di prima', () => {
    const rng = makeRng(7);
    const open = rollWildLevel({ speciesId: 'murena', variant: 'comune' }, rng, 0);
    expect(open).toBeLessThan(14);
  });
});
