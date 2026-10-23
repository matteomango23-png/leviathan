// Lot P1 (23 ottobre 2026): the harbours get painted villages, every outpost its own picture, the Delta painted
// islets and its own look of the sea, and the ice sheet is painted — solid exactly where its pictures are, opening
// in whole columns where the ship breaks it (owner: the old icebergs showed drawn ice with no collisions on the
// picture).
import { describe, expect, it } from 'vitest';
import { parseExtraName } from '../scripts/art/cutout';
import { ENDLESS } from '../src/data/endless';
import { OUTPOSTS } from '../src/data/economy';
import { DELTA_ISLETS, OUTPOST_ART, OUTPOST_FALLBACK, VILLAGES } from '../src/data/placeArt';
import { SEA_LOOKS } from '../src/data/seaLooks';
import { WORLD_ART_KEYS } from '../src/data/sprites.generated';
import { ICE, DELTA, TILE, WORLD } from '../src/data/worldLayout';
import { lookAt, lookIdAt, battlePlaceAt } from '../src/systems/seaLook';
import { breakIce, type BrokenIce } from '../src/systems/ship/surface';
import { iceArtReady, iceArtSolidAt, iceSheetNear, inPillar } from '../src/systems/world/iceSheet';
import { generateWorld } from '../src/systems/world/worldGen';

const map = generateWorld();

describe('porti e avamposti', () => {
  it('ogni avamposto ha la sua immagine, e quella di riserva c’è', () => {
    const arts = OUTPOSTS.map((o) => OUTPOST_ART[o.id]!.art);
    expect(new Set(arts).size).toBe(OUTPOSTS.length);
    for (const a of arts) expect(WORLD_ART_KEYS).toContain(a);
    expect(WORLD_ART_KEYS).toContain(OUTPOST_FALLBACK.art);
    for (const o of OUTPOSTS) expect(OUTPOST_ART[o.id]!.width).toBe(OUTPOST_FALLBACK.width); // the ship docks by it
  });

  it('i paesi dei due porti e gli isolotti del Delta sono dipinti', () => {
    for (const v of Object.values(VILLAGES)) expect(WORLD_ART_KEYS).toContain(v.art);
    expect(DELTA_ISLETS.length).toBe(DELTA.islands.length);
    for (const i of DELTA_ISLETS) expect(WORLD_ART_KEYS).toContain(i.art);
  });

  it('lo script delle immagini riconosce i nomi nuovi', () => {
    for (const n of [
      'paese_fango',
      'delta_isola_2',
      'ghiaccio_soffitto',
      'ghiaccio_pilastro_1',
      'avamposto_orlo',
    ])
      expect(parseExtraName(`${n}.jpg`)).toEqual({ kind: 'world', id: n });
    expect(parseExtraName('mare_delta_medio.jpg')).toEqual({ kind: 'panorama', id: 'mare_delta_medio' });
  });
});

describe('la laguna', () => {
  it('ha il suo aspetto del mare, che sfuma ai bordi', () => {
    const mid = (DELTA.x0 + DELTA.x1) / 2;
    expect(lookIdAt(mid)).toBe('delta');
    expect(lookIdAt(DELTA.x0 - 50)).toBe('costa');
    expect(lookAt(mid)).toEqual({ a: 'delta', b: 'delta', t: 0 });
    const edge = lookAt(DELTA.x0);
    expect([edge.a, edge.b]).toEqual(['costa', 'delta']);
    expect(edge.t).toBeGreaterThan(0.3);
    expect(edge.t).toBeLessThan(0.7);
    expect(SEA_LOOKS.delta.sound).toBe('swamp');
    // the battles there keep the Delta's own background
    expect(battlePlaceAt(mid, 'delta')).toBe('delta');
  });
});

describe('il ghiaccio dipinto', () => {
  const T = WORLD.tileSize;
  const sheet = iceSheetNear(ICE.xMin, ENDLESS.startX - 1); // the Mare di Ghiaccio's

  it('c’è, tra un buco e l’altro, con i pilastri', () => {
    expect(iceArtReady()).toBe(true);
    expect(sheet.slabs.length).toBe(ICE.holes.length + 1);
    expect(sheet.pillars.length).toBeGreaterThan(0);
  });

  it('si sbatte dove c’è il ghiaccio dipinto, e solo lì', () => {
    for (const s of sheet.slabs) {
      // under the snow, in the middle of the slab: ice
      expect(map.solidAt((s.left + s.right) / 2, WORLD.surfaceY + 6)).toBe(true);
      // the tiles are the picture's: ice where its mask is, water where it is not
      for (let x = s.left + T; x < s.right - T; x += T * 3)
        for (let y = WORLD.surfaceY + T / 2; y < s.top + s.h; y += T) {
          const [tx, ty] = [Math.floor(x / T), Math.floor(y / T)];
          const [cx, cy] = [tx * T + T / 2, ty * T + T / 2];
          if (cy < WORLD.surfaceY) continue;
          expect(map.get(tx, ty) === TILE.ice).toBe(iceArtSolidAt(cx, cy));
        }
    }
    // nothing of the old flat ceiling under the picture: under its icicles the sea is open
    const underPillar = (x: number): boolean =>
      sheet.pillars.some((p) => x > p.left - 4 && x < p.left + p.w + 4);
    for (const s of sheet.slabs)
      for (let x = s.left + 30; x < s.right - 30; x += 20)
        if (!underPillar(x)) expect(map.solidAt(x, s.top + s.h + 4)).toBe(false);
  });

  it('dai buchi si sale a respirare', () => {
    for (const [a, b] of ICE.holes) {
      const x = (a + b) / 2;
      for (let y = WORLD.surfaceY + 2; y < 90; y += 3) expect(map.hitCircle(x, y, 4)).toBe(false);
    }
  });

  it('la nave rompe colonne intere, e un pilastro tutto insieme', () => {
    const m = generateWorld();
    const s = sheet.slabs[1]!;
    const x = (s.left + s.right) / 2;
    const broken: BrokenIce[] = [];
    breakIce(m, x - 4, x + 4, broken, 25);
    // the whole column, icicles too: nothing invisible left to bump into
    for (let y = WORLD.surfaceY; y < s.top + s.h; y += 2) expect(m.solidAt(x, y)).toBe(false);
    expect(broken.length).toBeGreaterThan(4);
    // a pillar's top under the hull: all of it goes
    const p = sheet.pillars[0]!;
    const px = p.left + p.w / 2;
    breakIce(m, px - 2, px + 2, broken, 25);
    for (let y = p.top; y < p.top + p.h; y += 3)
      for (let xx = p.left; xx < p.left + p.w; xx += 3)
        if (inPillar(p, xx, y)) expect(m.get(Math.floor(xx / T), Math.floor(y / T))).not.toBe(TILE.ice);
  });
});
