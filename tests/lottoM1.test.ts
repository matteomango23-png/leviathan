// Lot M1 (22 ottobre 2026, docs/PROPOSTA-MARE.md): every region of the sea recognisable at a glance — its water,
// ridges, light, marine snow, glowing specks and sound — blending over a border; battles out at sea in the look of
// where you fight; the sea's painted panoramas recognised by the art script.
import { describe, expect, it } from 'vitest';
import { parseExtraName } from '../scripts/art/cutout';
import { fadeBottom, seamless } from '../scripts/art/extras';
import { BATTLE_PALETTES, BATTLE_STAGE } from '../src/data/battle';
import { ENDLESS } from '../src/data/endless';
import { SEA_REGIONS } from '../src/data/regions';
import { SEA_LOOK_BLEND, SEA_LOOKS, type SeaLookId } from '../src/data/seaLooks';
import { WORLD } from '../src/data/worldLayout';
import { soundShares } from '../src/audio/regionSound';
import { battlePlaceAt, lookAt, lookIdAt, lookNumber, snowShare, waterTint } from '../src/systems/seaLook';
import { biomeOf, stretchAt } from '../src/systems/world/stretches';

const atKm = (km: number): number => km * 1000 * WORLD.unitsPerMetre;
const ids = Object.keys(SEA_LOOKS) as SeaLookId[];

describe('ogni regione ha il suo aspetto', () => {
  it('la costa prima del mare aperto, poi quello della regione', () => {
    expect(lookIdAt(ENDLESS.startX - 10)).toBe('costa');
    expect(lookIdAt(atKm(3))).toBe('barriera');
    expect(lookIdAt(atKm(9))).toBe('mareblu');
    expect(lookIdAt(atKm(22))).toBe('fosse');
    expect(lookIdAt(atKm(28))).toBe('abisso');
  });

  it('nella Foresta e Banchisa conta il tratto', () => {
    const seen = new Set<SeaLookId>();
    for (let km = 12.2; km < 18; km += 0.3) {
      const x = atKm(km);
      const look = lookIdAt(x);
      seen.add(look);
      expect(look).toBe(biomeOf(stretchAt(x)).id === 'foresta' ? 'foresta' : 'banchisa');
    }
    expect(seen.has('banchisa')).toBe(true);
  });

  it('al confine due aspetti si mescolano piano, senza salti', () => {
    const border = atKm(SEA_REGIONS[1]!.fromKm);
    const before = lookAt(border - SEA_LOOK_BLEND);
    const after = lookAt(border + SEA_LOOK_BLEND);
    expect(before).toEqual({ a: 'barriera', b: 'barriera', t: 0 });
    expect(after.a).toBe('mareblu');
    let last = -1;
    for (let x = border - SEA_LOOK_BLEND / 2 + 1; x < border + SEA_LOOK_BLEND / 2; x += 50) {
      const m = lookAt(x);
      expect([m.a, m.b]).toEqual(['barriera', 'mareblu']);
      expect(m.t).toBeGreaterThanOrEqual(last);
      if (last >= 0) expect(m.t - last).toBeLessThan(0.1);
      last = m.t;
    }
    // the water's tint changes little at a time
    const tintA = waterTint(lookAt(border - 25));
    const tintB = waterTint(lookAt(border + 25));
    for (let i = 0; i < 3; i++) expect(Math.abs(tintA[i]! - tintB[i]!)).toBeLessThan(0.05);
  });

  it('nella Foresta e Banchisa alghe e ghiaccio si vedono anche puri', () => {
    let pure = 0;
    for (let km = 12.2; km < 18; km += 0.05) {
      const m = lookAt(atKm(km));
      if (m.a === m.b) pure++;
    }
    expect(pure).toBeGreaterThan(80);
  });

  it('ogni aspetto ha acqua, creste, luce, neve e suono validi', () => {
    for (const id of ids) {
      const l = SEA_LOOKS[id];
      for (const k of l.water) expect(k).toBeGreaterThan(0.3);
      for (const r of [l.far, l.mid]) {
        expect(r.top).toMatch(/^#[0-9a-f]{6}$/);
        expect(r.bottom).toMatch(/^#[0-9a-f]{6}$/);
      }
      expect(l.rays).toBeGreaterThan(0);
      expect(l.snow).toBeGreaterThan(0);
      expect(l.glow).toBeGreaterThanOrEqual(0);
      expect(l.glow).toBeLessThanOrEqual(1);
      if (l.glow > 0) expect(l.glowColors.length).toBeGreaterThan(0);
    }
    // the regions really differ: no two looks share both their ridges' shape and their water
    for (const a of ids)
      for (const b of ids)
        if (a < b)
          expect(
            SEA_LOOKS[a].far.style === SEA_LOOKS[b].far.style &&
              SEA_LOOKS[a].water.join() === SEA_LOOKS[b].water.join(),
          ).toBe(false);
  });

  it('più giù la neve marina è più fitta; nelle fosse c’è più luce che nell’abisso', () => {
    const coast = { a: 'costa', b: 'costa', t: 0 } as const;
    expect(snowShare(coast, 0)).toBeCloseTo(0.5);
    expect(snowShare(coast, 300)).toBeGreaterThan(snowShare(coast, 0));
    expect(snowShare({ a: 'abisso', b: 'abisso', t: 0 }, 0)).toBe(1);
    const rays = (id: SeaLookId): number => lookNumber({ a: id, b: id, t: 0 }, (l) => l.rays);
    expect(rays('mareblu')).toBeGreaterThan(rays('fosse'));
    expect(rays('fosse')).toBeGreaterThan(rays('abisso'));
  });

  it('il suono segue la mescolanza', () => {
    expect(soundShares({ a: 'barriera', b: 'barriera', t: 0 }).reef).toBe(1);
    const half = soundShares({ a: 'barriera', b: 'mareblu', t: 0.5 });
    expect(half.reef).toBeCloseTo(0.5);
    expect(half.whale).toBeCloseTo(0.5);
    expect(soundShares({ a: 'fosse', b: 'abisso', t: 0.3 }).deep).toBeCloseTo(1);
  });
});

describe('le battaglie in mare aperto', () => {
  it('ogni aspetto del mare aperto è un luogo di battaglia con la sua tavolozza', () => {
    for (const id of ids.filter((i) => i !== 'costa')) {
      expect((BATTLE_STAGE.places as readonly string[]).includes(id)).toBe(true);
      expect(BATTLE_PALETTES[id as keyof typeof BATTLE_PALETTES]).toBeDefined();
    }
  });

  it('il luogo viene da dove combatti, sulla costa da dove vive la specie', () => {
    expect(battlePlaceAt(ENDLESS.startX - 100, 'delta')).toBe('delta');
    expect(battlePlaceAt(atKm(9), 'baia')).toBe('mareblu');
    expect(battlePlaceAt(atKm(28), 'barriera')).toBe('abisso');
  });
});

describe('le immagini del lotto 9', () => {
  it('lo script riconosce i panorami del mare', () => {
    expect(parseExtraName('mare_mareblu_lontano.jpg')).toEqual({
      kind: 'panorama',
      id: 'mare_mareblu_lontano',
    });
    expect(parseExtraName('mare_fosse_medio.png')).toEqual({ kind: 'panorama', id: 'mare_fosse_medio' });
    expect(parseExtraName('bg_fosse_far.jpg')).toEqual({ kind: 'bg', place: 'fosse', layer: 'far' });
    expect(parseExtraName('mare_fosse_vicino.jpg')).toBeNull();
  });
});

describe('i panorami si ripetono senza giunture e senza riga sotto', () => {
  // a 10×4 picture: left half red, right half blue, solid
  const pic = (): Uint8ClampedArray => {
    const px = new Uint8ClampedArray(10 * 4 * 4);
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 10; x++) px.set(x < 5 ? [200, 0, 0, 255] : [0, 0, 200, 255], (y * 10 + x) * 4);
    return px;
  };

  it('il bordo destro continua nel sinistro', () => {
    const t = seamless(pic(), 10, 4, 2);
    expect(t.w).toBe(8);
    // the first column is the old ninth (blue, past the new right edge), so it runs on from the last one (blue)
    expect(Array.from(t.px.subarray(0, 4))).toEqual([0, 0, 200, 255]);
    expect(Array.from(t.px.subarray(7 * 4, 7 * 4 + 4))).toEqual([0, 0, 200, 255]);
  });

  it('in basso tutto sfuma nel colore medio del bordo, anche i varchi', () => {
    const px = pic();
    px[(3 * 10 + 0) * 4 + 3] = 0; // a gap in the bottom row
    fadeBottom(px, 10, 4, 0.5);
    const last = (x: number): number[] => Array.from(px.subarray((3 * 10 + x) * 4, (3 * 10 + x) * 4 + 4));
    expect(last(0)[3]).toBe(255);
    expect(last(0)).toEqual(last(9));
  });
});
