// Lot U7 (owner, 12 novembre 2026): the speargun's ammunition (a magazine, the reload on the same button, the kick,
// darts bought at a harbour) and the "seen" marks saved at once (the tutorial came back at every opening).
import { beforeAll, describe, expect, it } from 'vitest';
import { GUN } from '../src/data/diver';
import { PORTO_FANGO } from '../src/data/economy';
import { buyItem } from '../src/systems/economy/gear';
import type { GameEvent } from '../src/systems/events';
import { createGame, toSave, type GameState } from '../src/systems/game';
import { pullTrigger, spareDarts, stepGun } from '../src/systems/gun';
import { parseSave } from '../src/systems/save/saveData';
import { closeDialogue, openDialogue } from '../src/systems/story';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

const fresh = (): GameState => {
  const g = createGame(map, null, 4);
  g.diver.y = 200;
  return g;
};

/** Holds the trigger for `seconds`. */
function hold(g: GameState, seconds: number, ev: GameEvent[] = []): number {
  let shots = 0;
  for (let t = 0; t < seconds; t += 1 / 60) {
    g.harpoon.cooldown = Math.max(0, g.harpoon.cooldown - 1 / 60);
    if (pullTrigger(g, 0, ev, [])) shots++;
    stepGun(g, 1 / 60, ev);
  }
  return shots;
}

describe('il caricatore', () => {
  it('dieci colpi, poi la ricarica col pulsante, poi la raffica riprende', () => {
    const g = fresh();
    expect(g.gear.gunMag).toBe(GUN.magazine);
    const spare = spareDarts(g);
    expect(spare).toBe(GUN.startSpare);
    const ev: GameEvent[] = [];
    expect(hold(g, 1.6, ev)).toBe(GUN.magazine); // the magazine empties, then the reload begins
    expect(ev.some((e) => e.type === 'gunEmpty')).toBe(true);
    expect(g.harpoon.reload).toBeGreaterThan(0);
    hold(g, GUN.reloadSeconds + 0.2, ev);
    expect(ev.some((e) => e.type === 'gunReloaded')).toBe(true);
    expect(spareDarts(g)).toBeLessThan(spare);
    expect(g.gear.gunMag + spareDarts(g)).toBeLessThanOrEqual(spare);
  });

  it('senza scorta non ricarica e lo dice', () => {
    const g = fresh();
    g.gear.gunMag = 0;
    g.gear.inventory.dardi = 0;
    const ev: GameEvent[] = [];
    expect(hold(g, 3, ev)).toBe(0);
    expect(g.harpoon.reload).toBe(0);
    expect(ev.some((e) => e.type === 'ammoOut')).toBe(true);
  });

  it('ogni colpo spinge indietro', () => {
    const g = fresh();
    g.diver.vx = 0;
    expect(pullTrigger(g, 0, [], [])).toBe(true);
    expect(g.diver.vx).toBeLessThan(0);
  });
});

describe('al porto e nei salvataggi', () => {
  it('una scatola di dardi ne dà venti', () => {
    const g = fresh();
    g.port = PORTO_FANGO;
    g.gear.teeth = 100;
    const before = spareDarts(g);
    expect(buyItem(g.gear, 'dardi').ok).toBe(true);
    expect(spareDarts(g)).toBe(before + 20);
    expect(g.gear.teeth).toBe(88);
  });

  it('caricatore e scorta si salvano; un salvataggio vecchio parte pieno e coi dardi', () => {
    const g = fresh();
    g.gear.gunMag = 3;
    g.gear.inventory.dardi = 7;
    const back = createGame(map, parseSave(JSON.stringify(toSave(g, new Date()))), 4);
    expect(back.gear.gunMag).toBe(3);
    expect(spareDarts(back)).toBe(7);
    const raw = JSON.parse(JSON.stringify(toSave(g, new Date())));
    delete raw.gear.gunMag;
    raw.gear.inventory = { conchiglia: 2 };
    const old = createGame(map, parseSave(JSON.stringify(raw)), 4);
    expect(old.gear.gunMag).toBe(GUN.magazine);
    expect(spareDarts(old)).toBe(GUN.startSpare);
  });

  it('un consiglio letto chiede di salvare subito', () => {
    const g = fresh();
    const ev: GameEvent[] = [];
    openDialogue(g.story, 'tipGun', ev);
    closeDialogue(g, ev);
    expect(ev.some((e) => e.type === 'dialogueClosed')).toBe(true);
  });
});
