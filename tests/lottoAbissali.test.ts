// The abyssal vehicles (owner, 23 and 25 ottobre 2026): six rare parts in the farthest wrecks and the Gallerie's caves,
// the abyssal ship built from them at Porto Fango, its submarine down to 1000 m with half an hour of air, night
// vision and its own cockpit.
import { beforeAll, describe, expect, it } from 'vitest';
import { ABYSS_BUILD, ABYSS_PARTS } from '../src/data/abyss';
import { PORTO_FANGO, WRECKS } from '../src/data/economy';
import { SHIP_MODELS } from '../src/data/fleet';
import { ART_KEYS, WORLD_ART_KEYS } from '../src/data/sprites.generated';
import { SUB_MODELS } from '../src/data/submarine';
import { WORLD } from '../src/data/worldLayout';
import { openWreck, placeWrecks } from '../src/systems/economy/places';
import type { GameEvent } from '../src/systems/events';
import { createGame, toSave } from '../src/systems/game';
import { hasNightVision, nightOn, toggleNight } from '../src/systems/nightVision';
import { parseSave } from '../src/systems/save/saveData';
import { newShip } from '../src/systems/ship/ship';
import { buyShip, sellShip } from '../src/systems/ship/shipyard';
import { hullBlocked } from '../src/systems/ship/uboat';
import { subFloorY } from '../src/systems/submarine';
import { gallerySites } from '../src/systems/world/galleries';
import { galleryOpenAt } from '../src/systems/world/galleryShape';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';
import { giveVessels } from './helpers/vessels';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

const atYard = () => {
  const g = createGame(map, null, 4);
  giveVessels(g);
  g.port = PORTO_FANGO;
  return g;
};

describe('i pezzi abissali', () => {
  it('sono sei, tre nei relitti lontani e tre nei forzieri delle Gallerie, sul pavimento delle caverne', () => {
    expect(ABYSS_PARTS).toHaveLength(6);
    const wrecks = placeWrecks(map);
    for (const p of ABYSS_PARTS) {
      const w = wrecks.filter((x) => x.def.reward.part === p.id);
      expect(w, p.id).toHaveLength(1);
      // standing on a floor, in open water (a cave's or the sea's)
      expect(map.solidAt(w[0]!.x, w[0]!.y - 2), p.id).toBe(false);
      expect(map.solidAt(w[0]!.x, w[0]!.y + 10), p.id).toBe(true);
    }
    expect(WRECKS.filter((w) => w.reward.part)).toHaveLength(3);
    const chests = wrecks.filter((w) => w.def.id.startsWith('forziere_galleria_'));
    expect(chests).toHaveLength(3);
    for (const c of chests) expect(galleryOpenAt(c.x, c.y - 6), c.def.id).toBe(true);
    const cath = gallerySites().find((g) => g.cathedral)!;
    expect(chests.some((c) => c.def.id === `forziere_galleria_${cath.k}`)).toBe(true);
  });

  it('un forziere dà il suo pezzo una volta sola', () => {
    const g = createGame(map, null, 4);
    const w = placeWrecks(map).find((x) => x.def.reward.part === 'vetro_pressione')!;
    expect(openWreck(w, g.gear)?.part).toBe('vetro_pressione');
    expect(openWreck(w, g.gear)).toBeNull();
    expect(g.gear.abyssParts).toEqual(['vetro_pressione']);
  });
});

describe('la nave abissale', () => {
  it('si costruisce solo con tutti i pezzi e i denti, e i pezzi si consumano; non si vende', () => {
    const g = atYard();
    g.gear.teeth = ABYSS_BUILD.price * 2;
    g.gear.abyssParts = ABYSS_PARTS.slice(0, 5).map((p) => p.id);
    expect(buyShip(g, ABYSS_BUILD.ship).ok).toBe(false);
    g.gear.abyssParts = ABYSS_PARTS.map((p) => p.id);
    g.gear.teeth = ABYSS_BUILD.price - 1;
    expect(buyShip(g, ABYSS_BUILD.ship).ok).toBe(false);
    g.gear.teeth = ABYSS_BUILD.price;
    expect(buyShip(g, ABYSS_BUILD.ship).ok).toBe(true);
    expect(g.ship.model).toBe(ABYSS_BUILD.ship);
    expect(g.sub.model).toBe('sottomarino_abissale');
    expect(g.gear.abyssParts).toEqual([]);
    expect(g.gear.teeth).toBe(0);
    // switched away, it still cannot be sold
    g.fleet.push({ model: 'whale', fuel: 1 });
    expect(sellShip(g, ABYSS_BUILD.ship).ok).toBe(false);
  });

  it('è la più veloce, si immerge fino a 300 m e non entra nelle Gallerie', () => {
    const m = SHIP_MODELS.find((x) => x.id === ABYSS_BUILD.ship)!;
    expect(m.knots).toBe(Math.max(...SHIP_MODELS.map((x) => x.knots)));
    expect(m.dive?.maxDepthM).toBe(300);
    for (const gal of gallerySites().slice(0, 4)) {
      const p = gal.paths[0]![3]!;
      const ship = newShip({
        x: p.x,
        face: gal.mouth.dir,
        hatches: [],
        bay: 'none',
        aboard: true,
        fuel: 1,
        model: m.id,
        dive: p.y - WORLD.surfaceY - 40,
      });
      expect(hullBlocked(map, ship, p.x, ship.dive)).toBe(true);
    }
  });
});

describe('il sottomarino abissale', () => {
  it('scende fino a 1000 m e ha mezz’ora d’aria', () => {
    const m = SUB_MODELS.find((x) => x.id === 'sottomarino_abissale')!;
    expect(m.airSeconds).toBe(1800);
    expect(m.maxDepthM).toBe(1000);
    expect(Math.max(...SUB_MODELS.map((x) => x.maxDepthM))).toBe(1000);
    const g = createGame(map, null, 4);
    g.sub.model = m.id;
    expect(subFloorY(g.sub)).toBe(WORLD.surfaceY + 1000 * WORLD.unitsPerMetre);
  });

  it('ha la visione notturna (solo quando lo guidi) e il suo cockpit', () => {
    const g = atYard();
    g.gear.teeth = ABYSS_BUILD.price;
    g.gear.abyssParts = ABYSS_PARTS.map((p) => p.id);
    buyShip(g, ABYSS_BUILD.ship);
    const ev: GameEvent[] = [];
    expect(hasNightVision(g.sub)).toBe(false); // not aboard
    g.sub.aboard = true;
    toggleNight(g, ev);
    expect(nightOn(g.sub)).toBe(true);
    expect(ev).toEqual([{ type: 'nightVision', on: true }]);
    expect(SUB_MODELS.find((x) => x.id === g.sub.model)!.cockpit).toContain('plancia');
  });
});

describe('salvataggi e immagini', () => {
  it('i pezzi trovati e i forzieri aperti si salvano; una partita vecchia parte con zero pezzi', () => {
    const g = createGame(map, null, 4);
    const w = placeWrecks(map).find((x) => x.def.id.startsWith('forziere_galleria_'))!;
    openWreck(w, g.gear);
    const back = createGame(map, parseSave(JSON.stringify(toSave(g, new Date()))), 4);
    expect(back.gear.abyssParts).toEqual(g.gear.abyssParts);
    expect(back.gear.wrecks).toContain(w.def.id);
    const old = JSON.parse(JSON.stringify(toSave(g, new Date())));
    delete old.gear.abyssParts;
    expect(createGame(map, parseSave(JSON.stringify(old)), 4).gear.abyssParts).toEqual([]);
  });

  it('ci sono la nave, il sottomarino e le loro card', () => {
    for (const k of ['nave_abissale', 'nave_abissale_aperta', 'sottomarino_abissale'])
      expect(WORLD_ART_KEYS).toContain(k);
    for (const k of ['nave_abissale', 'sottomarino_abissale']) expect(ART_KEYS).toContain(k);
  });
});
