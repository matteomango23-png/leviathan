// Lot AD-4 (22 ottobre 2026): the special powers. The octopus opens the crusted chests, the otter opens wrecks from
// farther and finds more teeth, the beluga's echo reaches farther (ridden too), the hammerhead feels the buried
// chests, the sunfish, the seals and the walrus give you air while you stay still beside them.
import { beforeAll, describe, expect, it } from 'vitest';
import { PACK, TEAM_RULES } from '../src/data/beasts';
import { WRECK_REACH, WRECKS } from '../src/data/economy';
import { SPECIAL_POWERS } from '../src/data/powers';
import { bay as bayX } from '../src/data/worldLayout';
import { callMount } from '../src/systems/beasts/mount';
import type { GameEvent } from '../src/systems/events';
import { createGame, stepGame, type GameState } from '../src/systems/game';
import { consumePresses, emptyInput, type InputState } from '../src/systems/input';
import { stepPackEcho } from '../src/systems/pack';
import { doAction } from '../src/systems/playerActions';
import { spawnWild } from '../src/systems/beasts/wildState';
import { giveTestBeast } from '../src/systems/testTools';
import { canOpen, stepAirStation, wreckReach, wreckShown } from '../src/systems/specialPowers';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

const X = bayX(900);
const DT = 1 / 30;
let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

function run(g: GameState, seconds: number, input: InputState = emptyInput()): void {
  for (let t = 0; t < seconds; t += DT) {
    g.diver.o2 = g.diver.maxO2;
    Object.assign(g.diver, { x: X, y: 200, vx: 0, vy: 0 });
    stepGame(g, input, DT);
    consumePresses(input);
  }
}

/** A game with these beasts called into the water (the companions at your side, a mount under you). */
function withBeasts(ids: string[], level = 20): GameState {
  const g = createGame(map, null, 3);
  g.beasts.team = [];
  for (const id of ids) giveTestBeast(g, { speciesId: id, variant: 'comune' }, level);
  for (let i = 0; i < ids.length; i++) run(g, DT, { ...emptyInput(), summon: i });
  run(g, TEAM_RULES.arriveSeconds + 0.5);
  return g;
}

/** A chest of this kind put by the diver. */
function chestBy(g: GameState, kind: 'locked' | 'buried', dx = 4) {
  const w = g.wrecks.find((x) => x.def.kind === kind)!;
  Object.assign(w, { x: g.diver.x + dx, y: g.diver.y + 6 });
  return w;
}

describe('i forzieri chiusi: li apre il polpo', () => {
  it('ogni regione ha un forziere chiuso e uno sepolto, più ricchi', () => {
    expect(WRECKS.filter((w) => w.kind === 'locked').length).toBeGreaterThan(2);
    expect(WRECKS.filter((w) => w.kind === 'buried').length).toBe(
      WRECKS.filter((w) => w.kind === 'locked').length,
    );
  });

  it('senza polpo resta chiuso (e lo dice), con il polpo nel branco si apre', () => {
    const g = withBeasts(['barracuda']);
    const w = chestBy(g, 'locked');
    const ev: GameEvent[] = [];
    doAction(g, ev);
    expect(ev.some((e) => e.type === 'wreckLocked')).toBe(true);
    expect(g.gear.wrecks).not.toContain(w.def.id);
    const h = withBeasts(['polpo_gigante']);
    const w2 = chestBy(h, 'locked');
    expect(canOpen(h, w2)).toBe(true);
    const ev2: GameEvent[] = [];
    doAction(h, ev2);
    expect(h.gear.wrecks).toContain(w2.def.id);
  });
});

describe('i forzieri sepolti: li sente lo squalo martello', () => {
  it('invisibili senza martello; vicini a lui (anche in groppa) si vedono e si aprono; lontani no', () => {
    const g = withBeasts(['barracuda']);
    const w = chestBy(g, 'buried');
    expect(wreckShown(g, w)).toBe(false);
    const h = withBeasts(['squalo_martello']); // a mount now: you ride it
    expect(h.beasts.riding).toBe(true);
    const w2 = chestBy(h, 'buried');
    expect(wreckShown(h, w2)).toBe(true);
    doAction(h, []);
    expect(h.gear.wrecks).toContain(w2.def.id);
    const w3 = h.wrecks.filter((x) => x.def.kind === 'buried')[1]!;
    Object.assign(w3, { x: h.diver.x + SPECIAL_POWERS.revealsBuried.radius * 3, y: h.diver.y });
    expect(wreckShown(h, w3)).toBe(false);
  });
});

describe('la lontra raccoglie di più', () => {
  it('apre da più lontano e trova più denti', () => {
    const g = withBeasts(['lontra_marina']);
    expect(wreckReach(g)).toBe(WRECK_REACH * SPECIAL_POWERS.scavenger.reachMult);
    const w = g.wrecks.find((x) => !x.def.kind && (x.def.reward.teeth ?? 0) > 0)!;
    Object.assign(w, { x: g.diver.x + WRECK_REACH * 1.5, y: g.diver.y + 6 });
    const before = g.gear.teeth;
    const ev: GameEvent[] = [];
    doAction(g, ev);
    expect(g.gear.wrecks).toContain(w.def.id);
    expect(g.gear.teeth - before).toBeGreaterThan(w.def.reward.teeth!);
    expect(ev.some((e) => e.type === 'wreckOpened' && (e.bonus ?? 0) > 0)).toBe(true);
  });
});

describe("l'eco del beluga arriva più lontano, anche in groppa", () => {
  it('trova una bestia oltre la portata normale', () => {
    const g = withBeasts(['beluga']);
    expect(g.beasts.riding).toBe(true);
    const w = g.beasts.wilds[0]!;
    spawnWild(
      w,
      { speciesId: 'barracuda', variant: 'comune' },
      5,
      g.diver.x + PACK.echoReach * 1.8,
      g.diver.y,
      1,
    );
    g.timers.packEcho = 0;
    const ev: GameEvent[] = [];
    stepPackEcho(g, DT, ev);
    const echo = ev.find((e) => e.type === 'packEcho');
    expect(echo && echo.type === 'packEcho' && echo.found.length).toBeGreaterThan(0);
  });
});

describe("l'aria del tricheco", () => {
  it("fermo vicino a lui l'aria sale; in movimento no", () => {
    const g = withBeasts(['tricheco']);
    const m = g.beasts.pack[0]!;
    Object.assign(g.diver, { x: m.x + 10, y: m.y, vx: 0, vy: 0, o2: 10 });
    g.timers.airTold = 0; // (it may have said so already while you waited for it)
    const ev: GameEvent[] = [];
    stepAirStation(g, false, 1, ev);
    expect(g.diver.o2).toBeGreaterThan(10);
    expect(ev.some((e) => e.type === 'airGiven')).toBe(true);
    Object.assign(g.diver, { o2: 10, vx: 60 });
    stepAirStation(g, false, 1, []);
    expect(g.diver.o2).toBe(10);
    Object.assign(g.diver, { vx: 0 });
    stepAirStation(g, true, 1, []); // in a vehicle
    expect(g.diver.o2).toBe(10);
  });

  it('un compagno qualunque non dà aria', () => {
    const g = withBeasts(['barracuda']);
    const m = g.beasts.pack[0] ?? callMount(g.beasts.team[0]!, g.diver, g.map, false);
    Object.assign(g.diver, { x: m.x, y: m.y, vx: 0, vy: 0, o2: 10 });
    stepAirStation(g, false, 1, []);
    expect(g.diver.o2).toBe(10);
  });
});
