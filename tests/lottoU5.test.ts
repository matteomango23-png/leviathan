// Lot U5 (owner, 12 novembre 2026): the red eye where the open-mouth picture has it, packs that make passes instead of
// spinning round, the manta whole on the battle's stage.
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BATTLE_STAGE } from '../src/data/battle';
import { BEAST_EYES, BEAST_EYES_OPEN } from '../src/data/beastEyes';
import { passOver } from '../src/systems/beasts/roam';

describe('l’occhio a bocca aperta', () => {
  it('ogni posizione ha la sua immagine aperta, nella testa del riquadro', () => {
    expect(Object.keys(BEAST_EYES_OPEN).length).toBeGreaterThan(60);
    for (const [id, [x, y]] of Object.entries(BEAST_EYES_OPEN)) {
      expect(existsSync(`public/sprites/${id}_open.webp`), id).toBe(true);
      expect(BEAST_EYES[id], id).toBeDefined();
      expect(x, id).toBeGreaterThan(500);
      expect(x, id).toBeLessThanOrEqual(1000);
      expect(y, id).toBeGreaterThan(0);
      expect(y, id).toBeLessThan(460);
    }
  });
});

describe('i branchi', () => {
  it('passano oltre il banco prima di girarsi', () => {
    // swimming east towards a school at 0: the goal stays ahead of it until it is well past
    let x = -100;
    let face: 1 | -1 = 1;
    let turns = 0;
    for (let t = 0; t < 600; t++) {
      const goal = passOver(0, x, face, 30);
      if (Math.sign(goal - x) !== face && Math.abs(goal - x) > 3) {
        face = face > 0 ? -1 : 1;
        turns++;
      }
      x += face * 2;
    }
    // 1200 units swum, passes 2 × 30 + a little long: a turn every ~55 units, never every step
    expect(turns).toBeGreaterThan(5);
    expect(turns).toBeLessThan(40);
  });
});

describe('la manta in battaglia', () => {
  it('non è più ingrandita: la sua immagine è larga quanto le ali', () => {
    expect(BATTLE_STAGE.pictureMult.manta).toBeLessThan(1);
  });
});
