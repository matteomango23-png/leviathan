// Lot N1b (owner, 13 novembre 2026): "la notte deve essere veramente dark". The night's darkness row by row by depth
// (a little light at the surface, black a few metres down), the floodlights as beams, no round spots under the hull.
import { beforeAll, describe, expect, it } from 'vitest';
import { NIGHT } from '../src/data/daynight';
import { SHIP } from '../src/data/ship';
import { WORLD } from '../src/data/worldLayout';
import { nightDarkAt } from '../src/systems/dayNight';
import { createGame } from '../src/systems/game';
import { floodBeams } from '../src/systems/ship/floodlight';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';
import { giveVessels } from './helpers/vessels';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

describe('il buio della notte', () => {
  it('in superficie si vede un poco, a pochi metri sotto è nero', () => {
    expect(nightDarkAt(0)).toBeCloseTo(NIGHT.surfaceDark);
    expect(nightDarkAt(NIGHT.blackByM)).toBeCloseTo(NIGHT.deepDark);
    expect(nightDarkAt(NIGHT.blackByM / 2)).toBeGreaterThan(nightDarkAt(0));
    expect(nightDarkAt(200)).toBeCloseTo(NIGHT.deepDark);
  });

  it('il cielo è più chiaro all’orizzonte che in alto, e del mare (la nave si staglia)', () => {
    expect(nightDarkAt(-1)).toBeLessThan(nightDarkAt(-NIGHT.skyFadeM));
    expect(nightDarkAt(-1)).toBeLessThan(nightDarkAt(0));
  });
});

describe('le luci della nave', () => {
  it('i fari della nave abissale sono fasci con una direzione, che segue la prua', () => {
    const g = createGame(map, null, 4);
    giveVessels(g);
    g.ship.model = 'nightmare';
    g.ship.dive = 100 * WORLD.unitsPerMetre;
    g.ship.face = 1;
    const right = floodBeams(g.ship, 0)[0]!;
    expect(Math.cos(right.angle)).toBeGreaterThan(0.8);
    expect(right.x).toBeGreaterThan(g.ship.x);
    g.ship.face = -1;
    const left = floodBeams(g.ship, 0)[0]!;
    expect(Math.cos(left.angle)).toBeLessThan(-0.8);
    expect(left.x).toBeLessThan(g.ship.x);
  });

  it('sotto lo scafo non ci sono più macchie tonde', () => {
    expect('lights' in SHIP).toBe(false);
  });
});

describe('la luce segue il muso', () => {
  it('a bordo della nave, anche a galla, il faro punta sempre dalla parte della prua', async () => {
    const { lampAim } = await import('../src/systems/submarine');
    const sub = { aboard: false, face: 1 } as unknown as Parameters<typeof lampAim>[0]['sub'];
    const diver = { aim: 1.2 }; // where the diver was aiming before boarding: not the light's way
    expect(lampAim({ sub, diver, ship: { aboard: true, face: -1, dive: 0 } })).toBeCloseTo(Math.PI);
    expect(lampAim({ sub, diver, ship: { aboard: true, face: 1, dive: 0 } })).toBe(0);
  });
});

describe('le luci attaccate ai mezzi', () => {
  it('ogni nave, sottomarino e motoscafo ha il faro sul davanti dello scafo, non in mare', async () => {
    const { SHIP_MODELS } = await import('../src/data/fleet');
    const { SUB_MODELS } = await import('../src/data/submarine');
    const { BOAT_MODELS } = await import('../src/data/boats');
    for (const m of SHIP_MODELS) {
      if (!m.art) continue;
      const { lamp, keel } = m.art.picture;
      expect(lamp.u, m.id).toBeGreaterThan(0.75);
      expect(lamp.v, m.id).toBeLessThan(keel);
    }
    for (const m of [...SUB_MODELS, ...BOAT_MODELS.map((b) => ({ id: b.id, lamp: b.picture.lamp }))]) {
      expect(m.lamp.u, m.id).toBeGreaterThan(0.75);
      expect(m.lamp.u, m.id).toBeLessThanOrEqual(1);
      expect(m.lamp.v, m.id).toBeGreaterThan(0);
      expect(m.lamp.v, m.id).toBeLessThan(1);
    }
  });

  it('il faro avanti della nave abissale parte dal suo faro dipinto', async () => {
    const { shipPoint } = await import('../src/systems/ship/geometry');
    const { shipPicture } = await import('../src/systems/ship/model');
    const g = createGame(map, null, 4);
    giveVessels(g);
    g.ship.model = 'nightmare';
    g.ship.dive = 100 * WORLD.unitsPerMetre;
    const { u, v } = shipPicture(g.ship).lamp;
    const beam = floodBeams(g.ship, 0)[0]!;
    expect(beam.x).toBeCloseTo(shipPoint(g.ship, u, v).x);
    expect(beam.y).toBeCloseTo(shipPoint(g.ship, u, v).y);
  });

  it('il motoscafo accende il faro sulla sua prua, dalla parte dove guarda', async () => {
    const { boatLamp } = await import('../src/systems/boat');
    const b = { model: 'motoscafo_eh2', x: 1000, y: 500, face: 1 as const };
    expect(boatLamp(b).x).toBeGreaterThan(1000);
    expect(boatLamp({ ...b, face: -1 }).x).toBeLessThan(1000);
    expect(boatLamp(b).y).toBeLessThan(500); // above the water
  });

  it('il sub che si gira porta la lampada dall’altra parte subito, senza girare per il mare', async () => {
    const { turnDiver } = await import('../src/systems/diver');
    const d = { face: 1 as 1 | -1, aim: 0.2 };
    turnDiver(d, -1);
    expect(d.face).toBe(-1);
    expect(d.aim).toBeCloseTo(Math.PI - 0.2);
    turnDiver(d, -1);
    expect(d.aim).toBeCloseTo(Math.PI - 0.2); // no turn, no change
  });
});
