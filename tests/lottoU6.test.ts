// Lot U6 (owner, 12 novembre 2026): the speargun's burst of darts instead of the harpoon on its line, the Great Arch
// only scenery, the backpack's three places without the battle's shells.
import { beforeAll, describe, expect, it } from 'vitest';
import { HARPOON } from '../src/data/diver';
import { LANDMARKS } from '../src/data/landmarks';
import { WEAPONS } from '../src/data/world';
import { createDiver } from '../src/systems/diver';
import { canEquip, setSlot } from '../src/systems/economy/gear';
import type { GameEvent } from '../src/systems/events';
import { createFish } from '../src/systems/fish';
import { createGame, toSave } from '../src/systems/game';
import { createHarpoon, fireHarpoon, stepHarpoon } from '../src/systems/harpoon';
import { makeRng } from '../src/systems/math';
import { parseSave } from '../src/systems/save/saveData';
import type { TileMap } from '../src/systems/world/tileMap';
import { WORLD } from '../src/data/worldLayout';
import { generateWorld } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

const gun = WEAPONS.find((w) => w.id === 'arpione')!;

describe('il fucile a raffica', () => {
  it('più dardi in acqua insieme, uno a ogni cadenza, e nessuno torna indietro', () => {
    const fish = createFish(map, makeRng(1));
    for (const f of fish.fish) f.alive = false;
    const at = map.nearestOpen(3600, WORLD.surfaceY + 150, 40);
    const d = createDiver(at.x, at.y);
    const h = createHarpoon();
    const ev: GameEvent[] = [];
    let fired = 0;
    for (let t = 0; t < 0.5; t += 1 / 60) {
      if (fireHarpoon(h, d, 0, ev)) fired++;
      stepHarpoon(h, fish, map, 1 / 60, ev);
    }
    expect(fired).toBeGreaterThanOrEqual(3);
    expect(h.shots.length).toBeGreaterThan(1);
    for (const s of h.shots) expect(s.vx).toBeGreaterThan(0); // all going out
    for (let i = 0; i < 120; i++) stepHarpoon(h, fish, map, 1 / 60, ev);
    expect(h.shots.length).toBe(0); // gone at the end of their range, not back in the hand
  });

  it('un dardo mette la sardina nella sacca subito, e su una bestia pesa il suo danno', () => {
    const fish = createFish(map, makeRng(2));
    for (const f of fish.fish) f.alive = false;
    const at = map.nearestOpen(3600, WORLD.surfaceY + 150, 40);
    const d = createDiver(at.x, at.y);
    const f = fish.fish[0]!;
    Object.assign(f, { alive: true, x: at.x + 30, y: at.y, vx: 0, vy: 0 });
    const h = createHarpoon();
    const ev: GameEvent[] = [];
    fireHarpoon(h, d, 0, ev);
    const got = [];
    for (let i = 0; i < 10; i++) got.push(...stepHarpoon(h, fish, map, 1 / 60, ev));
    expect(got).toEqual([f]);
    f.alive = false;
    const dmg: number[] = [];
    h.cooldown = 0;
    fireHarpoon(h, d, 0, ev);
    for (let i = 0; i < 10; i++)
      stepHarpoon(h, fish, map, 1 / 60, ev, (x, _y, damage) => {
        if (x < at.x + 40) return false;
        dmg.push(damage);
        return true;
      });
    expect(dmg).toEqual([gun.damage]);
    expect(h.shots.length).toBe(0);
    expect(HARPOON.range).toBeGreaterThan(0);
  });
});

describe('il Grande Arco', () => {
  it('è solo paesaggio', () => {
    const arco = LANDMARKS.find((l) => l.id === 'grande_arco')!;
    expect(arco.pieces.every((p) => !p.solid)).toBe(true);
  });
});

describe('lo Zaino', () => {
  it('niente conchiglie nei tre posti, nemmeno da un salvataggio vecchio', () => {
    const g = createGame(map, null, 4);
    g.gear.inventory.conchiglia = 3;
    g.gear.inventory.bolla_aria = 1;
    expect(canEquip(g.gear, 'conchiglia')).toBe(false);
    expect(canEquip(g.gear, 'bolla_aria')).toBe(true);
    expect(setSlot(g.gear, 0, 'conchiglia')).toBe(false);
    const raw = JSON.parse(JSON.stringify(toSave(g, new Date())));
    raw.gear.backpack = ['conchiglia', 'bolla_aria', null];
    const back = createGame(map, parseSave(JSON.stringify(raw)), 4);
    expect(back.gear.backpack).toEqual([null, 'bolla_aria', null]);
  });
});
