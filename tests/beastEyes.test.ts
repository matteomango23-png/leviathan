// Red eyes of hunting beasts (25 ottobre 2026): every eye is on a real picture, inside its frame, on the head side.
import { describe, expect, it } from 'vitest';
import { BEAST_EYES } from '../src/data/beastEyes';
import { BEAST_SPRITE, BEAST_TEMPER } from '../src/data/beasts';
import { SPRITE_KEYS } from '../src/data/sprites.generated';

describe('occhi rossi', () => {
  it('ogni occhio è su un’immagine vera, nella metà della testa', () => {
    for (const [key, [x, y]] of Object.entries(BEAST_EYES)) {
      expect(SPRITE_KEYS, key).toContain(key);
      expect(x, key).toBeGreaterThan(BEAST_SPRITE.frameW / 2);
      expect(x, key).toBeLessThan(BEAST_SPRITE.frameW);
      expect(y, key).toBeGreaterThan(0);
      expect(y, key).toBeLessThan(BEAST_SPRITE.frameH);
    }
  });

  it('tutte le bestie che cacciano hanno gli occhi segnati (tranne il calamaro, senza occhio in vista)', () => {
    const hunters = Object.entries(BEAST_TEMPER)
      .filter(([, t]) => t.temper === 'aggressive')
      .map(([id]) => id)
      .filter((id) => SPRITE_KEYS.includes(id) && id !== 'calamaro_gigante');
    for (const id of hunters) expect(BEAST_EYES[id], id).toBeDefined();
  });
});
