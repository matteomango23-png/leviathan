// The Krill Hunter (owner, 10 ottobre 2026): the whale ship at 40.000 teeth with a claw drone that plants a tracker
// from afar and a whale speedboat; its mouth opens (ship still, hatches shut), draws and swallows the sardines, at
// most 25 a time and a minute open, then 10 minutes to recharge.
import { beforeAll, describe, expect, it } from 'vitest';
import { PORTO_FANGO } from '../src/data/economy';
import { SHIP } from '../src/data/ship';
import { WORLD } from '../src/data/worldLayout';
import { spawnWild } from '../src/systems/beasts/wildState';
import type { GameEvent } from '../src/systems/events';
import { createGame, stepGame, type GameState } from '../src/systems/game';
import { emptyInput } from '../src/systems/input';
import { mouthPoint, stepMouth, toggleMouth } from '../src/systems/ship/krillMouth';
import { canRecon, canSendTracker, sendTrackerDrone } from '../src/systems/ship/gadgets';
import { toggleHatch } from '../src/systems/ship/hatch';
import { buyShip } from '../src/systems/ship/shipyard';
import { shipStats } from '../src/systems/ship/stats';
import { SHIP_MODELS } from '../src/data/fleet';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';
import { giveVessels } from './helpers/vessels';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

function krill(): GameState {
  const g = createGame(map, null, 4);
  giveVessels(g);
  g.port = PORTO_FANGO;
  g.gear.teeth = 50000;
  expect(buyShip(g, 'krill').ok).toBe(true);
  g.ship.aboard = true;
  g.ship.fuel = 1000;
  return g;
}

describe('the Krill Hunter', () => {
  it('costs 40.000 teeth and brings its claw drone and its whale speedboat', () => {
    const g = krill();
    expect(g.gear.teeth).toBe(10000);
    expect(g.sub.model).toBe('drone_krill');
    expect(g.boat.model).toBe('motoscafo_krill');
    const rows = shipStats(SHIP_MODELS.find((m) => m.id === 'krill')!);
    expect(rows.find((r) => r.key === 'mouth')).toBeDefined();
    expect(rows.find((r) => r.key === 'sub.remote')?.text).toContain('tracker');
  });

  it('its mouth opens only still with the hatches shut; then the hatches cannot open', () => {
    const g = krill();
    const ev: GameEvent[] = [];
    g.ship.hatches[0]!.open = true;
    g.ship.hatches[0]!.t = 1;
    toggleMouth(g, ev);
    expect(g.ship.mouthOpen).toBe(false);
    g.ship.hatches[0]!.open = false;
    g.ship.hatches[0]!.t = 0;
    toggleMouth(g, ev);
    expect(g.ship.mouthOpen).toBe(true);
    toggleHatch(g, 0, ev);
    expect(g.ship.hatches[0]!.open).toBe(false);
  });

  it('it swallows at most 25 sardines into the bag, then shuts and recharges for 10 minutes', () => {
    const g = krill();
    const ev: GameEvent[] = [];
    toggleMouth(g, ev);
    const at = mouthPoint(g.ship);
    for (let round = 0; round < 4; round++) {
      for (const f of g.fish.fish) Object.assign(f, { alive: true, hooked: false, x: at.x, y: at.y });
      stepMouth(g, 0.1, ev);
    }
    expect(g.ship.mouthEaten).toBe(SHIP.mouth.maxSardines);
    expect(g.ship.mouthOpen).toBe(false);
    expect(Object.values(g.gear.bag).reduce((a, b) => a + b, 0)).toBe(SHIP.mouth.maxSardines);
    expect(g.ship.mouthWait).toBeGreaterThan(SHIP.mouth.rechargeSeconds - 1);
    toggleMouth(g, ev);
    expect(g.ship.mouthOpen).toBe(false); // recharging
    expect(ev.some((e) => e.type === 'mouthNo')).toBe(true);
  });

  it('it shuts by itself after a minute', () => {
    const g = krill();
    toggleMouth(g, []);
    for (const f of g.fish.fish) f.alive = false;
    for (let t = 0; t < SHIP.mouth.seconds + 1; t += 0.5) stepMouth(g, 0.5, []);
    expect(g.ship.mouthOpen).toBe(false);
    expect(g.ship.mouthWait).toBe(0); // it ate nothing: no recharge
  });

  it('its drone plants a tracker on a beast picked on the sonar, then comes home; it does not scout', () => {
    const g = krill();
    g.ship.x = PORTO_FANGO.shipDock + 600;
    g.ship.hatches[0]!.open = true;
    g.ship.hatches[0]!.t = 1;
    expect(canRecon(g)).toBe(false);
    expect(canSendTracker(g)).toBe(true);
    for (const w of g.beasts.wilds) w.motion = 'gone';
    const w = g.beasts.wilds.find((b) => !b.spawn.endless)!;
    spawnWild(
      w,
      { speciesId: 'tartaruga_marina', variant: 'comune' },
      8,
      g.ship.x + 200,
      WORLD.surfaceY + 120,
      1,
    );
    w.respawn = 1e9;
    // its waters round it, so it stays out while the drone goes
    w.spawn = { ...w.spawn, area: [w.x - 600, WORLD.surfaceY, w.x + 600, WORLD.surfaceY + 400] };
    const ev: GameEvent[] = [];
    expect(sendTrackerDrone(g, { wild: w.id, speciesId: w.spawn.speciesId }, ev)).toBe(true);
    for (let t = 0; t < 30 && g.gadgets.recon.phase !== 'idle'; t += 1 / 30) {
      Object.assign(w, { vx: 0, vy: 0 });
      ev.push(...stepGame(g, emptyInput(), 1 / 30));
    }
    expect(ev.some((e) => e.type === 'trackerHit')).toBe(true);
    expect(g.gadgets.target).toEqual({ wild: w.id, speciesId: w.spawn.speciesId });
    expect(g.gadgets.trackLeft).toBeGreaterThan(0);
    expect(g.gadgets.recon.phase).toBe('idle');
    expect(g.gadgets.recon.report).toBeNull();
  });
});
