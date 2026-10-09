// Owner, 9 ottobre 2026: in the U-Boat the beasts popped up on screen, and the murky water changed at a stroke. Beasts
// now come out of the dark (and go back into it) only off screen, however wide the view; the murk of one stretch of
// sea blends softly into the next.
import { describe, expect, it } from 'vitest';
import { ENDLESS } from '../src/data/endless';
import { WORLD } from '../src/data/worldLayout';
import { onScreen } from '../src/systems/beastState';
import { cycleMurk } from '../src/systems/clarity';
import { createGame, stepGame } from '../src/systems/game';
import { emptyInput } from '../src/systems/input';
import { generateWorld } from '../src/systems/world/worldGen';

describe('beasts come out of the dark off screen', () => {
  it('travelling fast through the endless sea with a wide view, none appears on screen', () => {
    const g = createGame(generateWorld(), null, 7);
    const DT = 1 / 30;
    let x = ENDLESS.startX + 3000;
    let shown = 0;
    for (let t = 0; t < 40; t += DT) {
      x += 160 * DT; // a fast U-Boat
      Object.assign(g.diver, { x, y: WORLD.surfaceY + 150, vx: 160, vy: 0, o2: g.diver.maxO2 });
      g.beasts.view = { x: x - 800, y: g.diver.y - 350, width: 1600, height: 700 };
      for (const e of stepGame(g, emptyInput(), DT)) {
        if (e.type !== 'wildAppeared') continue;
        shown++;
        const w = g.beasts.wilds.find((b) => b.id === e.id)!;
        expect(onScreen(g.beasts.view, w.x, w.y, 0)).toBe(false);
      }
      g.beasts.battle = null;
    }
    expect(shown).toBeGreaterThan(0);
  });
});

describe('the murk changes softly', () => {
  it('from one stretch of sea to the next there is no jump', () => {
    const zone = 1500 * WORLD.unitsPerMetre;
    for (let t = 0; t < 600; t += 37)
      for (let k = 1; k < 6; k++) {
        const edge = k * zone;
        expect(Math.abs(cycleMurk(edge + 1, t) - cycleMurk(edge - 1, t))).toBeLessThan(0.01);
      }
  });
});
