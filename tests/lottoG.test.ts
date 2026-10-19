// Lotto G+H (owner, 16 ottobre 2026): the harbour in tabs of one subject each, shells like Pokémon's balls (the
// King's always holds, one at a time), cures and baits in groups (a fine bait may bring an alfa or an albino),
// each vehicle mended at any harbour, and a board that shows the Wanted of its seas.
import { beforeAll, describe, expect, it } from 'vitest';
import { MARKET, OUTPOSTS, PORT, PORTO_FANGO, SHOP } from '../src/data/economy';
import { HUNTS } from '../src/data/hunts';
import { BAIT_GROUPS, ITEMS } from '../src/data/world';
import { createBattle } from '../src/systems/battle/battle';
import { tameChance, tryTame } from '../src/systems/battle/tameFlee';
import { makeFighter } from '../src/systems/battle/fighter';
import { hasAlbinoArt } from '../src/systems/beasts/forms';
import { luredForm } from '../src/systems/beasts/lure';
import { buyItem } from '../src/systems/economy/gear';
import { shellsOwned } from '../src/systems/economy/items';
import { repairQuote, repairVehicle } from '../src/systems/economy/repair';
import { buyFuelAll, fillAllQuote } from '../src/systems/fuel';
import { createGame, type GameState } from '../src/systems/game';
import { rumoursAt } from '../src/systems/hunts';
import { makeRng } from '../src/systems/math';
import { parseSave } from '../src/systems/save/saveData';
import { toSave } from '../src/systems/game';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';
import { giveVessels } from './helpers/vessels';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});
const fresh = (): GameState => createGame(map, null, 5);

describe('le schede del porto', () => {
  it('ogni oggetto in vendita sta su un solo scaffale, e ogni scaffale vende oggetti veri', () => {
    const all = Object.values(SHOP).flatMap((t) => t.flatMap((s) => s.items));
    expect(new Set(all).size).toBe(all.length);
    for (const id of all)
      expect(
        ITEMS.some((i) => i.id === id),
        id,
      ).toBe(true);
    expect(MARKET.items).toEqual(all);
    expect(all).not.toContain('arpione_mitico');
    expect(ITEMS.some((i) => i.id === 'arpione_mitico')).toBe(false);
  });

  it('le esche: due per gruppo, di specie vere, mai un gigante da caccia', () => {
    // the giants hunted as a species (not a unique of a common one, like the prehistoric hammerhead)
    const hunted = new Set(HUNTS.filter((h) => !h.form.unique).map((h) => h.form.speciesId));
    for (const g of Object.values(BAIT_GROUPS)) {
      const plain = ITEMS.find((i) => i.id === g.bait)!;
      const fine = ITEMS.find((i) => i.id === `${g.bait}_pregiata`)!;
      expect(plain.rare).toBeUndefined();
      expect(fine.rare).toBeGreaterThan(0);
      expect(fine.price).toBeGreaterThan(plain.price);
      for (const s of g.species) expect(hunted.has(s), s).toBe(false);
    }
  });
});

describe('le conchiglie', () => {
  const battle = () =>
    createBattle(
      [makeFighter({ speciesId: 'barracuda', variant: 'comune' }, 30)],
      makeFighter({ speciesId: 'squalo_bianco', variant: 'comune' }, 30),
    );

  it('più è pregiata più tiene; la Conchiglia del Re tiene sempre', () => {
    const s = battle();
    const base = tameChance(s, 30, 1);
    expect(tameChance(s, 30, 1.5)).toBeGreaterThan(base);
    expect(tameChance(s, 30, 2)).toBeGreaterThan(tameChance(s, 30, 1.5));
    const re = ITEMS.find((i) => i.id === 'conchiglia_re')!;
    expect(tameChance(s, 30, re.shell)).toBe(1);
    expect(tryTame(battle(), makeRng(1), 30, re.shell)).toMatchObject({ caught: true });
  });

  it('in battaglia si sceglie fra quelle che hai, dalla più semplice', () => {
    expect(shellsOwned({ conchiglia_re: 1, conchiglia: 3, alga_curativa: 2 }).map((i) => i.id)).toEqual([
      'conchiglia',
      'conchiglia_re',
    ]);
  });

  it('la Conchiglia del Re: una alla volta; chi aveva l’arpione mitico la riceve', () => {
    const g = fresh();
    g.gear.teeth = 100000;
    expect(buyItem(g.gear, 'conchiglia_re').ok).toBe(true);
    expect(buyItem(g.gear, 'conchiglia_re').ok).toBe(false);
    const old = fresh();
    const raw = JSON.parse(JSON.stringify(toSave(old, new Date()))) as {
      gear: { inventory: Record<string, number> };
    };
    raw.gear.inventory = { arpione_mitico: 2, conchiglia: 4 };
    const back = parseSave(JSON.stringify(raw))!;
    expect(back.gear!.inventory.conchiglia_re).toBe(1);
    expect(back.gear!.inventory.arpione_mitico).toBeUndefined();
    expect(back.gear!.inventory.conchiglia).toBe(4);
  });
});

describe('l’esca pregiata', () => {
  const shark = { speciesId: 'squalo_bianco', variant: 'comune' as const };
  it('a volte porta un alfa o un albino, mai una versione senza immagini proprie (19 ottobre)', () => {
    expect(luredForm(shark, 0.12, () => 0.99)).toBe(shark); // most of the time: itself
    const rare = luredForm(shark, 0.12, () => 0.01);
    expect(['alfa', 'albino']).toContain(rare.variant);
    const plain = { speciesId: 'barracuda', variant: 'comune' as const };
    expect(hasAlbinoArt('barracuda')).toBe(false);
    expect(luredForm(plain, 0.12, () => 0.01)).toBe(plain); // no alpha or albino pictures: it stays itself
    expect(luredForm(shark, undefined, () => 0)).toBe(shark); // a plain bait
  });
});

describe('i mezzi al porto', () => {
  it('la barca e il sottomarino si riparano uno per uno; la nave anche a un avamposto', () => {
    const g = fresh();
    giveVessels(g);
    g.port = PORTO_FANGO;
    g.gear.teeth = 100000;
    g.sub.hull = 10;
    const q = repairQuote(g, 'sub');
    expect(q.here).toBe(true);
    expect(q.points).toBeGreaterThan(0);
    const r = repairVehicle(g, 'sub', []);
    expect(r.ok).toBe(true);
    expect(g.sub.hull).toBe(q.max);
    expect(g.gear.teeth).toBe(100000 - q.cost);
    expect(repairVehicle(g, 'sub', []).ok).toBe(false); // already whole
    expect(repairQuote(g, 'boat').owned).toBe(false); // no speedboat yet
    // the ship at an outpost
    const out = OUTPOSTS[0]!;
    g.port = out;
    g.ship.x = out.shipDock;
    g.ship.hull = 1;
    expect(repairQuote(g, 'ship').here).toBe(true);
    expect(repairVehicle(g, 'ship', []).ok).toBe(true);
    expect(g.ship.hull).toBe(repairQuote(g, 'ship').max);
  });

  it('"pieno a tutti" riempie i mezzi che sono qui', () => {
    const g = fresh();
    giveVessels(g);
    g.port = PORTO_FANGO;
    g.gear.teeth = 100000;
    g.ship.fuel = 0;
    g.sub.fuel = 0;
    const q = fillAllQuote(g);
    expect(q.litres).toBeGreaterThan(0);
    const r = buyFuelAll(g);
    expect(r.ok).toBe(true);
    expect(r.cost).toBe(q.cost);
    expect(fillAllQuote(g).litres).toBe(0);
  });
});

describe('la bacheca', () => {
  it('a Portofosco i Ricercati sono le leggende della costa, della Barriera e del Mare blu', () => {
    const here = rumoursAt(PORT).map((h) => h.id);
    expect(here.length).toBeGreaterThanOrEqual(3);
    expect(here).toContain('caccia_coccodrillo');
    // the others are further out: shadows until heard
    expect(HUNTS.length - here.length).toBeGreaterThanOrEqual(2);
  });
});
