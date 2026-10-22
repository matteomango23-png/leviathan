// Lot AI (21 ottobre 2026): what glows on a beast. The runes of Scintilla, Saetta and Folgore pulse like a shock, a
// band of light running along the body and back; eyes and lures shine steady. Their glow pictures exist for every
// picture of these beasts.
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GLOW, GLOW_PULSE } from '../src/data/glow';
import { BATTLE_ART_KEYS, GLOW_KEYS, SPRITE_KEYS } from '../src/data/sprites.generated';
import { glowAt, glowOf } from '../src/systems/glowPulse';

describe('le rune che pulsano (proprietario: "tipo una scossa che va avanti e indietro")', () => {
  const runes = GLOW.folgore!;

  it('la luce corre dalla testa alla coda e torna', () => {
    const peak = (t: number): number => {
      let best = 0;
      let at = 0;
      for (let i = 0; i <= 20; i++) {
        const v = glowAt(runes, t, i / 20);
        if (v > best) [best, at] = [v, i / 20];
      }
      return at;
    };
    expect(peak(0)).toBeLessThan(0.15); // at the head
    expect(peak(GLOW_PULSE.seconds / 2)).toBeGreaterThan(0.85); // at the tail
    expect(peak(GLOW_PULSE.seconds)).toBeLessThan(0.15); // back at the head
  });

  it('fuori dalla banda le rune restano accese piano, mai spente', () => {
    for (let t = 0; t < 3; t += 0.1)
      for (let a = 0; a <= 1; a += 0.1) {
        const v = glowAt(runes, t, a);
        expect(v).toBeGreaterThan(GLOW_PULSE.rest * (1 - GLOW_PULSE.flicker) * runes.strength - 1e-6);
        expect(v).toBeLessThanOrEqual(1);
      }
  });

  it('gli occhi brillano fissi', () => {
    const eyes = GLOW.dunkleosteus!;
    expect(glowAt(eyes, 0, 0.1)).toBe(glowAt(eyes, 2.3, 0.9));
  });
});

describe('le immagini dei bagliori', () => {
  it('ogni immagine di una bestia che brilla ha il suo bagliore, e lo trova anche in battaglia', () => {
    for (const key of Object.keys(GLOW)) {
      expect(SPRITE_KEYS.includes(key) || BATTLE_ART_KEYS.includes(`${key}_front`), key).toBe(true);
      for (const pic of [key, `${key}_front`, `${key}_back`])
        if (SPRITE_KEYS.includes(pic) || BATTLE_ART_KEYS.includes(pic)) {
          expect(GLOW_KEYS, pic).toContain(pic);
          expect(existsSync(`public/glow/${pic}.webp`)).toBe(true);
        }
    }
    expect(glowOf('saetta_front')).toBe(GLOW.saetta);
    expect(glowOf('barracuda')).toBeUndefined();
  });
});
