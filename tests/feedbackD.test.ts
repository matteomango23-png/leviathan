// Owner's feedback of 3 ottobre 2026 (second round): the riding turn curled the tail upside down; flat battle
// pictures (a turtle from behind, a hammerhead head-on) looked tiny.
import { describe, expect, it } from 'vitest';
import { BATTLE_STAGE } from '../src/data/battle';
import { BATTLE_ART_BOX } from '../src/data/sprites.generated';
import { battleSize } from '../src/systems/battle/stage';
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
  turn: 0,
  turnFrom: 1,
  travel: 0,
  side: -1,
});

describe('riding turn', () => {
  it('turns sideways and level, never through the vertical', () => {
    for (const vy of [-40, 0, 40]) {
      const m = mount();
      const diver = { x: 0, y: 100, vx: 50, vy, face: 1 as 1 | -1 };
      for (let i = 0; i < 30; i++) stepMount(m, diver, 1 / 30); // swimming right
      Object.assign(diver, { vx: -50, face: -1 });
      let maxPitch = 0;
      for (let i = 0; i < 60; i++) {
        stepMount(m, diver, 1 / 30);
        maxPitch = Math.max(maxPitch, Math.abs(m.pitch));
        if (m.turn > 0) expect(m.pitchV).toBe(0); // no bending while it turns
      }
      expect(m.face).toBe(-1);
      expect(maxPitch).toBeLessThan(0.9);
      expect(m.turn).toBe(0);
    }
  });
});

describe('battle sizes', () => {
  it('a flat picture is drawn bigger than a square one of the same length', () => {
    const turtle = BATTLE_ART_BOX.tartaruga_marina_back!;
    expect((turtle[2] - turtle[0]) / (turtle[3] - turtle[1])).toBeGreaterThan(2);
    const square = { lengthM: 2, giant: false, box: [20, 20, 780, 780] as const };
    const flat = { lengthM: 2, giant: false, box: turtle };
    const a = battleSize('you', square, 3);
    const b = battleSize('you', flat, 3);
    expect(b).toBeGreaterThan(a * 1.3);
    expect(b).toBeLessThanOrEqual(
      BATTLE_STAGE.size.max * BATTLE_STAGE.size.youCloser * BATTLE_STAGE.flat.max,
    );
  });
});

describe('il compagno nuota con te come un delfino vero (4 ottobre)', () => {
  it('se ti giri a destra e sinistra da fermo, non si gira ogni volta', () => {
    const m = { ...mount(), state: 'follow' as const, x: -30, y: 105 };
    const diver = { x: 0, y: 100, vx: 0, vy: 0, face: 1 as 1 | -1 };
    let turns = 0;
    let face = m.face;
    for (let i = 0; i < 300; i++) {
      diver.face = Math.floor(i / 15) % 2 ? -1 : 1; // you flip every half second without moving
      stepMount(m, diver, 1 / 30);
      if (m.face !== face) {
        turns++;
        face = m.face;
      }
    }
    expect(turns).toBeLessThanOrEqual(1);
  });

  it('quando nuoti da una parte, ti si mette dietro e si gira con calma', () => {
    const m = { ...mount(), state: 'follow' as const, x: 30, y: 105, face: -1 as 1 | -1, side: 1 as 1 | -1 };
    const diver = { x: 0, y: 100, vx: 45, vy: 0, face: 1 as 1 | -1 };
    for (let i = 0; i < 300; i++) {
      diver.x += diver.vx / 30;
      stepMount(m, diver, 1 / 30);
    }
    expect(m.x).toBeLessThan(diver.x); // behind you
    expect(m.face).toBe(1); // swimming your way
  });
});
