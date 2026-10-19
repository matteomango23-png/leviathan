// Lot R (19 ottobre 2026): shooting behind you no longer flips the diver back and forth.
import { describe, expect, it } from 'vitest';
import { DIVER } from '../src/data/diver';
import { bay } from '../src/data/worldLayout';
import { createGame, stepGame } from '../src/systems/game';
import { consumePresses, emptyInput } from '../src/systems/input';
import { generateWorld } from '../src/systems/world/worldGen';

const DT = 1 / 60;

describe('the harpoon fired behind you', () => {
  it('the diver turns to the shot once and keeps facing it a moment while swimming the other way', () => {
    const g = createGame(generateWorld(), null, 5);
    Object.assign(g.diver, { x: bay(900), y: 150, vx: 0, vy: 0, face: 1 });
    const faces: number[] = [];
    for (let i = 0; i < 90; i++) {
      // swimming right all along; one shot to the left on the 10th frame (the aim stick let go at once)
      const input = { ...emptyInput(), moveX: 1, fireHeld: i === 10, aim: i === 10 ? Math.PI : null };
      stepGame(g, input, DT);
      consumePresses(input);
      faces.push(g.diver.face);
    }
    const flips = faces.filter((f, i) => i > 0 && f !== faces[i - 1]).length;
    expect(flips).toBe(2); // to the shot, and back once the moment is over
    const turnedAt = faces.indexOf(-1);
    const backAt = faces.indexOf(1, turnedAt);
    expect((backAt - turnedAt) * DT).toBeGreaterThanOrEqual(DIVER.aimHoldSeconds - 0.05);
    expect(g.diver.vx).toBeGreaterThan(0); // he kept swimming right
  });
});

describe('the aim held behind you', () => {
  it('keeps the diver facing the aim between two shots', () => {
    const g = createGame(generateWorld(), null, 5);
    Object.assign(g.diver, { x: bay(900), y: 150, vx: 0, vy: 0, face: 1 });
    const faces: number[] = [];
    for (let i = 0; i < 120; i++) {
      const input = { ...emptyInput(), moveX: 1, fireHeld: true, aim: Math.PI };
      stepGame(g, input, DT);
      consumePresses(input);
      faces.push(g.diver.face);
    }
    expect(faces.slice(1).every((f) => f === -1)).toBe(true);
  });
});
