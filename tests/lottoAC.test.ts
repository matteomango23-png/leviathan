// Lot AC (21 ottobre 2026): how a beast you ride swims. Its own acceleration (a small one at once, a giant slowly), a
// dash that pushes beyond its pace and fades back (sharp and short for a small one, softer and longer for a giant)
// with a cooldown, a stamina bar (fast beasts tire sooner), leaps as high as the speed out of the water; Folgore thin.
import { describe, expect, it } from 'vitest';
import { RIDE_MOTION } from '../src/data/beasts';
import { SPECIES } from '../src/data/species';
import { bay, WORLD } from '../src/data/worldLayout';
import { createDiver, stepDiver } from '../src/systems/diver';
import { emptyInput, type InputState } from '../src/systems/input';
import { makeRng } from '../src/systems/math';
import { dashCurve, rideProfile, type RideProfile } from '../src/systems/rideMotion';
import { rest, spendDash, staminaOf, type Stamina } from '../src/systems/stamina';
import { generateWorld } from '../src/systems/world/worldGen';

const map = generateWorld();
const DT = 1 / 60;
const SPEED = 60;
const small = rideProfile(3, 1.5); // a mako: small and fast
const big = rideProfile(16, 0.8); // a humpback: big and slower

/** Rides deep in open water for `seconds`: the speed at each step. */
function ride(p: RideProfile, seconds: number, input: (t: number) => Partial<InputState>, v0 = 0): number[] {
  const d = createDiver(bay(1000), WORLD.surfaceY + 300);
  d.vx = v0;
  const out: number[] = [];
  for (let t = 0; t < seconds; t += DT) {
    stepDiver(d, { ...emptyInput(), ...input(t) }, map, DT, makeRng(1), [], {
      respawnAt: { x: 0, y: 0 },
      mountSpeed: SPEED,
      ride: { profile: p, canDash: true, worn: false },
    });
    d.y = WORLD.surfaceY + 300; // level, far from the surface and the floor
    out.push(Math.hypot(d.vx, d.vy));
  }
  return out;
}
const timeTo = (speeds: number[], v: number): number => speeds.findIndex((s) => s >= v) * DT;

describe('its own acceleration (owner: "da 0 a 100 in un attimo… in base all\'animale")', () => {
  it('a small one reaches its top speed sooner than a giant, and neither goes past it without a dash', () => {
    const a = ride(small, 4, () => ({ moveX: 1 }));
    const b = ride(big, 4, () => ({ moveX: 1 }));
    expect(timeTo(a, SPEED * 0.9)).toBeLessThan(timeTo(b, SPEED * 0.9));
    expect(timeTo(b, SPEED * 0.9)).toBeGreaterThan(1.5);
    expect(Math.max(...a, ...b)).toBeLessThanOrEqual(SPEED * 1.001);
  });

  it('let go, it glides on and slows down: no sudden stop', () => {
    const s = ride(big, 1, () => ({}), SPEED);
    expect(s[Math.round(0.25 / DT)]!).toBeGreaterThan(SPEED * 0.7);
    expect(s[s.length - 1]!).toBeLessThan(SPEED);
  });
});

describe('the dash (owner: "un boost oltre la sua velocità che poi torna in modo graduale")', () => {
  it("a small one's push is sharper and over sooner; a giant's rises and lasts longer", () => {
    expect(dashCurve(0, small)).toBe(1);
    expect(dashCurve(0, big)).toBe(0);
    expect(dashCurve(big.rise, big)).toBe(1);
    const end = (p: RideProfile): number => {
      let t = 0;
      while (dashCurve(t, p) > 0 || t < p.rise) t += 0.01;
      return t;
    };
    expect(end(small)).toBeLessThan(end(big));
    expect(small.boost).toBeGreaterThan(big.boost);
  });

  it('pushes beyond its top speed and comes back to it gradually, and from still gets there at once', () => {
    const s = ride(small, 3, (t) => ({ moveX: 1, dash: t < DT / 2 }), SPEED);
    const peak = Math.max(...s);
    expect(peak).toBeGreaterThan(SPEED * 1.5);
    const i = s.indexOf(peak);
    expect(s[i + 3]!).toBeGreaterThan(SPEED * 1.2); // not cut at once
    expect(s[s.length - 1]!).toBeLessThan(SPEED * 1.05);
    const still = ride(small, 0.3, (t) => ({ moveX: 1, dash: t < DT / 2 }));
    expect(still[Math.round(0.1 / DT)]!).toBeGreaterThan(SPEED * 0.9);
  });

  it('a giant covers more metres in its dash than a small one beyond their pace', () => {
    const extra = (p: RideProfile): number =>
      ride(p, 4, (t) => ({ moveX: 1, dash: t < DT / 2 }), SPEED).reduce((a, s) => a + (s - SPEED) * DT, 0);
    expect(extra(big) / big.boost).toBeGreaterThan(extra(small) / small.boost);
  });

  it('cannot be pressed again before its cooldown', () => {
    let dashes = 0;
    const d = createDiver(bay(1000), WORLD.surfaceY + 300);
    for (let t = 0; t < small.cooldown * 0.9; t += DT) {
      const ev: { type: string }[] = [];
      stepDiver(d, { ...emptyInput(), moveX: 1, dash: true }, map, DT, makeRng(1), ev as never, {
        respawnAt: { x: 0, y: 0 },
        mountSpeed: SPEED,
        ride: { profile: small, canDash: true, worn: false },
      });
      dashes += ev.filter((e) => e.type === 'dash').length;
    }
    expect(dashes).toBe(1);
  });
});

describe('stamina (owner: "animali veloci si stancano prima… si deve ricaricare completamente")', () => {
  const dashesToEmpty = (p: RideProfile): number => {
    const s: Stamina = { value: 1, worn: false };
    let n = 0;
    while (!s.worn) {
      spendDash(s, p);
      n++;
    }
    return n;
  };

  it('a fast small beast is worn out after fewer dashes than a big slow one', () => {
    expect(dashesToEmpty(rideProfile(3, 1.5))).toBeLessThan(dashesToEmpty(rideProfile(16, 0.8)));
    expect(dashesToEmpty(rideProfile(3, 1.5))).toBeGreaterThanOrEqual(3);
  });

  it('worn out it swims slower and cannot dash, until full again a minute later', () => {
    const s: Stamina = { value: 1, worn: false };
    while (!s.worn) spendDash(s, small);
    const worn = ride(small, 3, () => ({ moveX: 1 }));
    const d = createDiver(bay(1000), WORLD.surfaceY + 300);
    const ev: { type: string }[] = [];
    stepDiver(d, { ...emptyInput(), moveX: 1, dash: true }, map, DT, makeRng(1), ev as never, {
      respawnAt: { x: 0, y: 0 },
      mountSpeed: SPEED,
      ride: { profile: small, canDash: false, worn: true },
    });
    expect(ev.some((e) => e.type === 'dash')).toBe(false);
    expect(worn.length).toBeGreaterThan(0);
    for (let t = 0; t < RIDE_MOTION.stamina.exhaustedSeconds - 1; t += 1) rest(s, 1);
    expect(s.worn).toBe(true);
    rest(s, 2);
    expect(s.worn).toBe(false);
    expect(s.value).toBe(1);
  });

  it('worn out the beast swims at its tired share of its pace', () => {
    const d = createDiver(bay(1000), WORLD.surfaceY + 300);
    for (let t = 0; t < 5; t += DT) {
      stepDiver(d, { ...emptyInput(), moveX: 1 }, map, DT, makeRng(1), [], {
        respawnAt: { x: 0, y: 0 },
        mountSpeed: SPEED,
        ride: { profile: small, canDash: false, worn: true },
      });
      d.y = WORLD.surfaceY + 300;
    }
    expect(Math.hypot(d.vx, d.vy)).toBeCloseTo(SPEED * RIDE_MOTION.stamina.exhaustedShare, 0);
  });

  it('each beast keeps its own, and the one you left rests', () => {
    const all: Record<string, Stamina> = {};
    spendDash(staminaOf(all, 'a'), small);
    expect(staminaOf(all, 'b').value).toBe(1);
    const before = staminaOf(all, 'a').value;
    rest(staminaOf(all, 'a'), 5);
    expect(staminaOf(all, 'a').value).toBeGreaterThan(before);
  });
});

describe('Folgore in groppa (owner: "troppo tozzo e corto… come in battaglia, molto lungo ma non tozzo")', () => {
  it('is drawn as thin as its picture', () => {
    expect(SPECIES.find((s) => s.id === 'folgore')!.girth).toBeUndefined();
  });
});
