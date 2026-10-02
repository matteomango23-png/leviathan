// Plan B of the owner's feedback (2 ottobre 2026): team order and healing one beast, shells for taming, baits,
// hunters that follow you out of their waters, small predators that keep away from a big mount, the sea map,
// holding the dash button while riding.
import { beforeAll, describe, expect, it } from 'vitest';
import { ROAM, TEAM_RULES, WILD_SPAWNS } from '../src/data/beasts';
import { DIVER } from '../src/data/diver';
import { START_INVENTORY } from '../src/data/world';
import { bay as bayX } from '../src/data/worldLayout';
import { moveInTeam, teamMembers } from '../src/systems/beasts/team';
import { spawnWild } from '../src/systems/beasts/wildState';
import { stepRoam } from '../src/systems/beasts/roam';
import { useItemOn, useSlot } from '../src/systems/economy/backpack';
import { newGear, slotKind } from '../src/systems/economy/gear';
import { createGame, stepGame, type GameState } from '../src/systems/game';
import { consumePresses, emptyInput } from '../src/systems/input';
import { migrate } from '../src/systems/save/saveData';
import { seaMap, zoneKey } from '../src/systems/seaMap';
import { giveTestBeast } from '../src/systems/testTools';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});
const DT = 1 / 30;
const U = DIVER.lengthUnits;

function game(): GameState {
  const g = createGame(map, null, 5);
  Object.assign(g.diver, { x: bayX(900), y: 200, vx: 0, vy: 0 });
  return g;
}

describe('team', () => {
  it('can be put in any order (the first one leads)', () => {
    const g = game();
    giveTestBeast(g, { speciesId: 'barracuda', variant: 'comune' }, 5);
    giveTestBeast(g, { speciesId: 'torpedine', variant: 'comune' }, 5);
    const [a, b] = teamMembers(g.beasts.team);
    expect(moveInTeam(g.beasts.team, b!.uid, -1)).toBe(true);
    expect(teamMembers(g.beasts.team)[0]).toBe(b);
    expect(moveInTeam(g.beasts.team, b!.uid, -1)).toBe(false); // already first
    expect(teamMembers(g.beasts.team)[1]).toBe(a);
  });

  it('an Alga curativa heals the beast you choose', () => {
    const g = game();
    giveTestBeast(g, { speciesId: 'barracuda', variant: 'comune' }, 5);
    giveTestBeast(g, { speciesId: 'torpedine', variant: 'comune' }, 5);
    const [a, b] = teamMembers(g.beasts.team);
    a!.hp = 1;
    b!.hp = 0;
    b!.ko = true;
    g.gear.inventory.alga_curativa = 1;
    expect(useItemOn(g, 'alga_curativa', b!.uid, [])).toBe(true);
    expect(b!.ko).toBe(false);
    expect(a!.hp).toBe(1);
    expect(g.gear.inventory.alga_curativa ?? 0).toBe(0);
  });
});

describe('shells', () => {
  it('a new game starts with some; they are not a backpack slot; old saves receive them once', () => {
    expect(newGear().inventory.conchiglia).toBe(START_INVENTORY.conchiglia);
    expect(slotKind('conchiglia')).toBeNull();
    const old = migrate({ game: 'leviatano', version: 7, gear: { inventory: { conchiglia: 2 } } });
    expect((old.gear as { inventory: Record<string, number> }).inventory.conchiglia).toBe(7);
  });
});

describe('baits', () => {
  it('a blood bait brings the white shark of the bay in seconds, even with the sea crowded', () => {
    const g = game();
    giveTestBeast(g, { speciesId: 'zanna', variant: 'comune' }, 5);
    g.gear.inventory.esca_sangue = 1;
    g.gear.backpack[0] = 'esca_sangue';
    for (const w of g.beasts.wilds) w.respawn = 999;
    const shark = g.beasts.wilds.find((w) => w.spawn.speciesId === 'squalo_bianco')!;
    const input = { ...emptyInput(), slot: 0 };
    let came = false;
    for (let t = 0; t < 10 && !came; t += DT) {
      Object.assign(g.diver, { x: bayX(900), y: 200, vx: 0, vy: 0 });
      stepGame(g, input, DT);
      consumePresses(input);
      g.beasts.battle = null;
      came = shark.motion !== 'gone';
    }
    expect(came).toBe(true);
    expect(useSlot).toBeDefined();
  });
});

describe('wild beasts', () => {
  const bayShark = () => WILD_SPAWNS.find((s) => s.speciesId === 'squalo_bianco')!;

  it('a hunter follows you out of its waters, but not too far', () => {
    const g = game();
    const w = g.beasts.wilds.find((x) => x.spawn.speciesId === 'squalo_bianco')!;
    const [, , x1] = bayShark().area;
    spawnWild(w, { speciesId: 'squalo_bianco', variant: 'comune' }, 15, x1 - 40, 200, 1);
    const diver = { x: x1 + 40, y: 200, dead: false };
    w.mood = 'chase';
    let farthest = 0;
    for (let t = 0; t < 30; t += DT) {
      stepRoam(w, { diver, map: g.map, rng: g.rng, dt: DT, hidden: false });
      diver.x = w.x + 80; // you keep just ahead of it
      farthest = Math.max(farthest, w.x - x1);
    }
    expect(farthest).toBeGreaterThan(ROAM.chaseLeash * 0.5);
    // past the leash it stops hunting and leaves you alone (it turns home once out of your light)
    expect(w.mood).not.toBe('chase');
    expect(w.calm).toBeGreaterThan(0);
  });

  it('a small predator does not come at you while you ride something far bigger', () => {
    const g = game();
    const w = g.beasts.wilds.find((x) => x.spawn.speciesId === 'barracuda')!;
    spawnWild(w, { speciesId: 'barracuda', variant: 'comune' }, 3, bayX(900) + 60, 200, -1);
    const diver = { x: bayX(900), y: 200, dead: false };
    stepRoam(w, { diver, map: g.map, rng: g.rng, dt: DT, hidden: false, riderLength: w.length * 4 });
    expect(w.mood).toBe('flee');
    w.mood = 'wander';
    stepRoam(w, { diver, map: g.map, rng: g.rng, dt: DT, hidden: false, riderLength: 0 });
    expect(w.mood).toBe('chase');
  });
});

describe('sea map', () => {
  it('shows the zones you visited, and their beasts by how often you meet them (unseen as ???)', () => {
    const g = game();
    stepGame(g, emptyInput(), DT);
    expect(g.seen.has(zoneKey(g.zone))).toBe(true);
    const zones = seaMap(g.seen);
    const here = zones.find((z) => z.name === g.zone)!;
    expect(here.visited).toBe(true);
    expect(here.beasts.length).toBeGreaterThan(0);
    expect(here.beasts.every((b) => b.name === null)).toBe(true); // nothing seen yet
    const shares = here.beasts.reduce((a, b) => a + b.share, 0);
    expect(shares).toBeCloseTo(1);
    expect(zones.some((z) => !z.visited)).toBe(true);
  });
});

describe('riding', () => {
  it('holding the dash button keeps a faster pace', () => {
    const run = (held: boolean): number => {
      const g = game();
      giveTestBeast(g, { speciesId: 'squalo_bianco', variant: 'comune' }, 15);
      stepGame(g, { ...emptyInput(), summon: 0 }, DT);
      for (let t = 0; t < TEAM_RULES.arriveSeconds + 0.5; t += DT) {
        Object.assign(g.diver, { x: bayX(900), y: 200, vx: 0, vy: 0 });
        stepGame(g, emptyInput(), DT);
      }
      let top = 0;
      for (let t = 0; t < 2; t += DT) {
        g.diver.o2 = g.diver.maxO2;
        stepGame(g, { ...emptyInput(), moveX: 1, dashHeld: held }, DT);
        g.beasts.battle = null;
        top = Math.max(top, Math.abs(g.diver.vx));
      }
      return top;
    };
    expect(run(true)).toBeGreaterThan(run(false) * 1.2);
    expect(U).toBeGreaterThan(0);
  });
});

describe('your beast turning around', () => {
  it('rises through the vertical and comes back facing the other way (no flat flip)', () => {
    const g = game();
    giveTestBeast(g, { speciesId: 'squalo_bianco', variant: 'comune' }, 15);
    stepGame(g, { ...emptyInput(), summon: 0 }, DT);
    for (let t = 0; t < TEAM_RULES.arriveSeconds + 0.5; t += DT) {
      Object.assign(g.diver, { x: bayX(900), y: 200, vx: 0, vy: 0, face: 1 });
      stepGame(g, { ...emptyInput(), moveX: 1 }, DT);
    }
    const m = g.beasts.mount!;
    expect(m.face).toBe(1);
    let steepest = 0;
    for (let t = 0; t < 1.5; t += DT) {
      g.diver.o2 = g.diver.maxO2;
      stepGame(g, { ...emptyInput(), moveX: -1 }, DT);
      g.beasts.battle = null;
      steepest = Math.max(steepest, Math.abs(m.pitch));
    }
    expect(m.face).toBe(-1);
    expect(steepest).toBeGreaterThan(1.2);
    expect(m.loop).toBe(0);
  });
});
