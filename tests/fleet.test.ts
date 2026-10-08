// The fleet (owner, 8 ottobre 2026, block 4a): eight ships with their own numbers, the shipyard of Porto Fango,
// real lengths, fuel to plan for, the save v18.
import { describe, expect, it } from 'vitest';
import { PORT, PORTO_FANGO } from '../src/data/economy';
import { SHIP_MODELS, TRADE_IN_SHARE } from '../src/data/fleet';
import { FUEL } from '../src/data/ship';
import { ART_KEYS, WORLD_ART_KEYS } from '../src/data/sprites.generated';
import { SUB_MODELS } from '../src/data/submarine';
import { WORLD } from '../src/data/worldLayout';
import { autonomyKm } from '../src/systems/fuelBurn';
import { createGame } from '../src/systems/game';
import { stepHeading } from '../src/systems/helm';
import { migrate } from '../src/systems/save/saveData';
import { shipLength, shipRates, shipTopSpeed } from '../src/systems/ship/model';
import { buyShip } from '../src/systems/ship/shipyard';
import { cameraAim } from '../src/systems/shipCamera';
import { generateWorld } from '../src/systems/world/worldGen';
import { giveVessels } from './helpers/vessels';

const map = generateWorld();

describe('the ships of the fleet', () => {
  it('each has its numbers and its card; the ready ones their paintings and submarines', () => {
    expect(SHIP_MODELS).toHaveLength(8);
    for (const m of SHIP_MODELS) {
      expect(m.knots, m.id).toBeGreaterThan(0);
      expect(m.tank, m.id).toBeGreaterThan(0);
      expect(ART_KEYS, m.id).toContain(m.card);
      for (const b of m.bays) expect(ART_KEYS, b.card).toContain(b.card);
      if (!m.ready) continue;
      expect(WORLD_ART_KEYS).toContain(m.art!.closed);
      expect(WORLD_ART_KEYS).toContain(m.art!.open);
      for (const b of m.bays.filter((x) => x.kind === 'sub'))
        expect(SUB_MODELS.map((s) => s.id)).toContain(b.model);
    }
    expect(Math.max(...SHIP_MODELS.map((m) => m.price))).toBe(50000); // owner: the dearest at 50.000
  });

  it('their length is the real one; the first ship cannot go there and back across the 30 km sea', () => {
    for (const m of SHIP_MODELS) expect(shipLength({ model: m.id })).toBe(m.lengthM * WORLD.unitsPerMetre);
    const aurelia = SHIP_MODELS.find((m) => m.id === 'aurelia')!;
    expect(autonomyKm(aurelia.tank, aurelia.perKm)).toBeLessThan(60);
    expect(FUEL.pricePerLitre).toBe(1);
  });

  it('a big ship takes longer to reach its top speed than a quick one (owner)', () => {
    const timeToTop = (id: string): number => {
      const s = { model: id };
      let h = { face: 1 as 1 | -1, speed: 0 };
      let t = 0;
      while (h.speed < shipTopSpeed(s) * 0.95 && t < 200) {
        h = stepHeading(
          h.face,
          h.speed,
          { throttle: 1, dir: 1, dive: 0 },
          shipTopSpeed(s),
          shipRates(s),
          0.1,
        );
        t += 0.1;
      }
      return t;
    };
    expect(timeToTop('nightmare')).toBeGreaterThan(timeToTop('aurelia'));
    expect(timeToTop('poseidon')).toBeLessThan(timeToTop('eh2'));
  });

  it('a longer ship widens the view at the helm', () => {
    const g = createGame(map, null, 4);
    giveVessels(g);
    g.ship.aboard = true;
    const small = cameraAim(g, 0).viewH;
    g.ship.model = 'eh1';
    expect(cameraAim(g, 0).viewH).toBeGreaterThan(small);
  });
});

describe('the shipyard of Porto Fango', () => {
  const atYard = () => {
    const g = createGame(map, null, 4);
    giveVessels(g);
    g.port = PORTO_FANGO;
    return g;
  };

  it('a new ship: paid less the trade-in, at the pier, with its own submarine in the hold and your fuel', () => {
    const g = atYard();
    g.gear.teeth = 10000;
    g.ship.fuel = 250;
    expect(buyShip(g, 'eh1').ok).toBe(true);
    expect(g.gear.teeth).toBe(10000 - 6000); // the Aurelia is a gift: worth nothing
    expect(g.ship).toMatchObject({ model: 'eh1', x: PORTO_FANGO.shipDock, bay: 'docked', fuel: 250 });
    expect(g.sub.model).toBe('squalo_acciaio');
    expect(g.sub.hull).toBe(SUB_MODELS.find((s) => s.id === 'squalo_acciaio')!.hull);
    // back to the Aurelia: the EH1 is traded in for a share of its price
    expect(buyShip(g, 'aurelia').ok).toBe(true);
    expect(g.gear.teeth).toBe(4000 + 6000 * TRADE_IN_SHARE);
  });

  it('only at Porto Fango, only ships that are ready, only with the teeth', () => {
    const g = atYard();
    g.gear.teeth = 100000;
    expect(buyShip(g, 'nightmare').ok).toBe(false); // in cantiere
    g.port = PORT;
    expect(buyShip(g, 'eh1').ok).toBe(false);
    g.port = PORTO_FANGO;
    g.gear.teeth = 10;
    expect(buyShip(g, 'eh1').ok).toBe(false);
  });
});

describe('saves before the fleet (v17 → v18)', () => {
  it('the ship becomes the Aurelia; parts and submarines bought are paid back', () => {
    const o = migrate(
      {
        version: 17,
        ship: { x: 9000, face: 1, upgrades: ['serbatoio', 'motori'], fuel: 600 },
        sub: {
          x: 1,
          y: 2,
          model: 'squalo_ferro',
          models: ['batiscafo', 'squalo_ferro'],
          hull: 100,
          fuel: 50,
        },
        gear: { teeth: 100 },
      },
      undefined,
      18,
    );
    expect(o.ship).toMatchObject({ model: 'aurelia' });
    expect((o.ship as Record<string, unknown>).upgrades).toBeUndefined();
    expect(o.sub).toMatchObject({ model: 'batiscafo', models: ['batiscafo'] });
    expect((o.gear as { teeth: number }).teeth).toBe(100 + 900 + 2500 + 1800);
  });
});
