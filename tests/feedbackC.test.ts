// Owner's feedback of 3 ottobre 2026: icebergs you can swim under (and no old blocky ice around them), more life
// in the sea, the green screen for the new pictures.
import { describe, expect, it } from 'vitest';
import { WILD_RULES, WILD_SPAWNS } from '../src/data/beasts';
import { OTHER_FISH_SCHOOLS } from '../src/data/economy';
import { ENDLESS } from '../src/data/endless';
import { ICEBERG_MAX_DRAFT, ICEBERGS } from '../src/data/worldArt';
import { TILE, WORLD } from '../src/data/worldLayout';
import { icebergBox } from '../src/systems/world/icebergs';
import { generateWorld } from '../src/systems/world/worldGen';
import { onGreenScreen, removeGreenBackground } from '../scripts/art/cutout';

const map = generateWorld();
const T = map.tileSize;

describe('icebergs', () => {
  it('never reach the sea floor: there is always open water to swim under them', () => {
    for (const p of ICEBERGS) {
      const b = icebergBox(p)!;
      expect(b.top + b.h - WORLD.surfaceY).toBeLessThanOrEqual(ICEBERG_MAX_DRAFT + 0.01);
      // a gap at least 3 diver heights tall under its whole width
      for (let x = b.left + 4; x < b.left + b.w - 4; x += 8) {
        let open = 0;
        for (let y = b.top + b.h + 2; y < b.top + b.h + 60; y += 2) if (!map.solidAt(x, y)) open += 2;
        expect(open, `x=${x}`).toBeGreaterThanOrEqual(36);
      }
    }
  });

  it('have no old blocky ice (ceiling, pillars) under or beside them', () => {
    for (const p of ICEBERGS) {
      const b = icebergBox(p)!;
      for (let x = b.left - 10; x < b.left + b.w + 10; x += T)
        for (let y = WORLD.surfaceY + 2; y < WORLD.surfaceY + 60; y += T) {
          const [tx, ty] = [Math.floor(x / T), Math.floor(y / T)];
          const solidIce = map.get(tx, ty) === TILE.ice;
          const [cx, cy] = [tx * T + T / 2, ty * T + T / 2]; // the tile's centre decides
          const inside = cx > b.left && cx < b.left + b.w && cy > b.top && cy < b.top + b.h;
          if (!inside) expect(solidIce, `${p.id} ${x},${y}`).toBe(false);
        }
    }
  });
});

describe('more life', () => {
  it('more beasts at once, more small and medium ones, more fish', () => {
    expect(WILD_RULES.maxPresent).toBeGreaterThanOrEqual(8);
    expect(ENDLESS.wildSlots).toBeGreaterThanOrEqual(8);
    const small = WILD_SPAWNS.filter((s) =>
      ['pesce_palla', 'murena', 'scorfano', 'pesce_napoleone', 'barracuda', 'tonno'].includes(s.speciesId),
    );
    expect(small.length).toBeGreaterThanOrEqual(14);
    expect(OTHER_FISH_SCHOOLS.length).toBeGreaterThanOrEqual(15);
  });
});

describe('green screen', () => {
  it('is recognised and keyed out, keeping the subject', () => {
    const w = 40;
    const h = 20;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 4;
        const subject = x > 10 && x < 30 && y > 5 && y < 15;
        data.set(subject ? [90, 70, 60, 255] : [10, 220, 15, 255], o);
      }
    const img = { data, width: w, height: h };
    expect(onGreenScreen(img)).toBe(true);
    const out = removeGreenBackground(img);
    expect(out[3]).toBe(0); // the corner is gone
    expect(out[(10 * w + 20) * 4 + 3]).toBe(255); // the subject stays
  });
});
