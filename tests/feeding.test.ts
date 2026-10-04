import { describe, expect, it } from 'vitest';
import { FEEDING } from '../src/data/beasts';
import { headOf } from '../src/systems/beasts/combat';
import type { Mount } from '../src/systems/beasts/mount';
import type { TeamBeast } from '../src/systems/beasts/team';
import { beastEats } from '../src/systems/feeding';
import type { Fish, FishState } from '../src/systems/fish';

function mount(length: number): Mount {
  return { x: 500, y: 200, face: 1, pitch: 0, length, state: 'ride', jaw: 0 } as unknown as Mount;
}
/** A tight school of sardines right in front of the mouth. */
function school(m: Mount, n: number): FishState {
  const h = headOf(m);
  const fish = Array.from(
    { length: n },
    (_, i) =>
      ({
        kind: 'sardina',
        x: h.x + ((i % 5) - 2) * 4,
        y: h.y + (Math.floor(i / 5) - 1) * 4,
        alive: true,
        hooked: false,
      }) as Fish,
  );
  return { schools: [], fish };
}
const beast = {} as TeamBeast;

describe('le bestie mangiano i pesci (4 ottobre: la megattera inghiotte il banco)', () => {
  it('una bestia grande inghiotte tutte le sardine che ha in bocca in un morso', () => {
    const m = mount(90); // a humpback, 15 m
    const fish = school(m, 15);
    const eaten = beastEats(m, beast, fish, { feed: 0 }, 1 / 30);
    expect(eaten).toHaveLength(15);
    expect(m.jaw).toBeGreaterThanOrEqual(0.8);
    expect(eaten.length).toBeGreaterThanOrEqual(FEEDING.gulpFrom);
  });

  it('una bestia piccola ne prende poche, e i pesci fuori dalla bocca restano', () => {
    const m = mount(8);
    const fish = school(m, 15);
    const eaten = beastEats(m, beast, fish, { feed: 0 }, 1 / 30);
    expect(eaten.length).toBeGreaterThan(0);
    expect(eaten.length).toBeLessThan(15);
  });

  it('tra un morso e l’altro aspetta', () => {
    const m = mount(90);
    const timer = { feed: 0 };
    expect(beastEats(m, beast, school(m, 3), timer, 1 / 30)).toHaveLength(3);
    expect(beastEats(m, beast, school(m, 3), timer, 1 / 30)).toHaveLength(0);
  });
});
