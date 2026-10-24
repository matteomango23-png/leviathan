// Lot C1 (24 ottobre 2026, the owner's notes after v0.108.0): softer music voices, more air in the submarines, no
// rising by itself out of air (hearts instead), the pressure bar filling back aboard.
import { describe, expect, it } from 'vitest';
import { VOICE_TONE } from '../src/data/music';
import { SUB_MODELS } from '../src/data/submarine';
import { chokeAboard, createDiver } from '../src/systems/diver';
import type { GameEvent } from '../src/systems/events';

describe('lotto C1', () => {
  it('le voci della musica non sono più a dente di sega', () => {
    expect(VOICE_TONE.wave).not.toBe('sawtooth');
    expect(VOICE_TONE.wave).not.toBe('square');
  });

  it('i sottomarini restano sott’acqua almeno 5 minuti', () => {
    for (const m of SUB_MODELS) expect(m.airSeconds).toBeGreaterThanOrEqual(300);
  });

  it('senz’aria a bordo si perde un cuore ogni tot secondi, fino a morire', () => {
    const d = createDiver(0, 0);
    d.invulnerable = 0;
    const events: GameEvent[] = [];
    let t = 0;
    while (!chokeAboard(d, 5, 0.1, events) && t < 120) t += 0.1;
    expect(d.dead).toBe(true);
    expect(events.filter((e) => e.type === 'hurt').length).toBe(d.maxHp);
    expect(t).toBeGreaterThan(5 * (d.maxHp - 1) - 0.5); // one heart every 5 s
  });
});
