// Owner's feedback of 3 ottobre 2026 (second round): the riding turn curled the tail upside down; flat battle
// pictures (a turtle from behind, a hammerhead head-on) looked tiny.
import { describe, expect, it } from 'vitest';
import { BATTLE_STAGE } from '../src/data/battle';
import { BATTLE_ART_FLAT } from '../src/data/sprites.generated';
import { battleSizes } from '../src/systems/battle/stage';
import { stepMount, type Mount } from '../src/systems/beasts/mount';

const mount = (): Mount => ({
  uid: 'b1',
  x: 0,
  y: 100,
  face: 1,
  pitch: 0,
  length: 36,
  vx: 0,
  vy: 0,
  pitchV: 0,
  phase: 0,
  jaw: 0,
  flash: 0,
  alpha: 1,
  state: 'ride',
  rider: true,
  t: 0,
  loop: 0,
  loopDir: -1,
});

describe('riding turn', () => {
  it('turns through the vertical with a straight body, never past upside down', () => {
    for (const vy of [-40, 0, 40]) {
      const m = mount();
      const diver = { x: 0, y: 100, vx: 50, vy, face: 1 as 1 | -1 };
      for (let i = 0; i < 30; i++) stepMount(m, diver, 1 / 30); // swimming right
      Object.assign(diver, { vx: -50, face: -1 });
      let maxPitch = 0;
      for (let i = 0; i < 60; i++) {
        stepMount(m, diver, 1 / 30);
        maxPitch = Math.max(maxPitch, Math.abs(m.pitch));
        if (m.loop > 0) expect(m.pitchV).toBe(0); // no bending in the loop
      }
      expect(m.face).toBe(-1);
      expect(maxPitch).toBeLessThanOrEqual(Math.PI / 2 + 0.01);
    }
  });
});

describe('battle sizes', () => {
  it('a flat picture is drawn bigger than a square one of the same length', () => {
    expect(BATTLE_ART_FLAT.tartaruga_marina_back).toBeGreaterThan(1.4);
    const square = { lengthM: 2, giant: false };
    const flat = { lengthM: 2, giant: false, flat: BATTLE_ART_FLAT.tartaruga_marina_back };
    const a = battleSizes(square, square).you;
    const b = battleSizes(flat, square).you;
    expect(b).toBeGreaterThan(a * 1.3);
    expect(b).toBeLessThanOrEqual(BATTLE_STAGE.size.max);
  });
});
