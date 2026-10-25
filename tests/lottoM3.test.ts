// Lot M3 (25 ottobre 2026, docs/PROPOSTA-MARE.md): the Gallerie of the Grandi fosse. A tunnel from each abyssal
// trench's wall into the rock, a cave at its end, the Cattedrale at the end of the longest; air pockets, currents;
// a submarine goes in, a U-Boat does not, big beasts stay out.
import { beforeAll, describe, expect, it } from 'vitest';
import { CATHEDRAL } from '../src/data/galleries';
import type { GameEvent } from '../src/systems/events';
import { newShip } from '../src/systems/ship/ship';
import { hullBlocked } from '../src/systems/ship/uboat';
import { discoverCathedral } from '../src/systems/world/cathedral';
import { landmarkKey } from '../src/systems/world/landmarks';
import { regionsMap } from '../src/systems/seaMap';
import { spawnWild, createWild } from '../src/systems/beasts/wildState';
import { stepRoam } from '../src/systems/beasts/roam';
import { createGame } from '../src/systems/game';
import { stepSub } from '../src/systems/submarine';
import { emptyInput } from '../src/systems/input';
import { giveSub } from './helpers/vessels';
import { GALLERIES } from '../src/data/galleries';
import { SUB_MODELS, SUBMARINE } from '../src/data/submarine';
import { WORLD } from '../src/data/worldLayout';
import {
  galleryCurrentAt,
  galleryOpenAt,
  galleryVentAt,
  cathedralGallery,
} from '../src/systems/world/galleryShape';
import { gallerySites, type Gallery } from '../src/systems/world/galleries';
import { naturalFloor, regionAt } from '../src/systems/world/stretches';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

/** The biggest submarine's body (offset, radius). */
const bigSub = (): [number, number][] => {
  const m = [...SUB_MODELS].sort((a, b) => b.lengthM - a.lengthM)[0]!;
  const k = (m.lengthM * WORLD.unitsPerMetre) / SUBMARINE.length;
  return SUBMARINE.body.map(([dx, r]) => [dx * k, r * k]);
};

/** Every point along a gallery's main tunnel, from its mouth to its cave. */
function route(g: Gallery): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const pts = g.paths[0]!;
  for (let i = 0; i + 1 < pts.length; i++)
    for (let t = 0; t < 1; t += 0.2)
      out.push({
        x: pts[i]!.x + (pts[i + 1]!.x - pts[i]!.x) * t,
        y: pts[i]!.y + (pts[i + 1]!.y - pts[i]!.y) * t,
      });
  const c = g.caves[0]!;
  out.push({ x: c.x, y: c.y });
  return out;
}

describe('le Gallerie', () => {
  it('ci sono nelle Grandi fosse, una per fossa, e una finisce nella Cattedrale', () => {
    const all = gallerySites();
    expect(all.length).toBeGreaterThan(3);
    for (const g of all) expect(regionAt(g.mouth.x).id).toBe(GALLERIES.region);
    expect(all.filter((g) => g.cathedral).length).toBe(1);
  });

  it('dall’imbocco alla caverna passa il sub, e anche il sottomarino più grande', () => {
    const body = bigSub();
    for (const g of gallerySites())
      for (const p of route(g)) {
        expect(map.hitCircle(p.x, p.y, 4), `sub ${g.k} at ${Math.round(p.x)},${Math.round(p.y)}`).toBe(false);
        expect(
          body.some(([dx, r]) => map.hitCircle(p.x + dx, p.y, r * 0.9)),
          `sottomarino ${g.k} at ${Math.round(p.x)},${Math.round(p.y)}`,
        ).toBe(false);
      }
  });

  it('non sbucano nel mare dall’alto: sopra c’è sempre roccia', () => {
    for (const g of gallerySites())
      for (const p of route(g).slice(10))
        expect(p.y - naturalFloor(p.x), `${g.k}`).toBeGreaterThan(GALLERIES.squeeze); // past its mouth
  });

  it('sacche d’aria e correnti', () => {
    const g = gallerySites()[0]!;
    const a = g.airs[0]!;
    expect(galleryOpenAt(a.x, a.y - 10)).toBe(true);
    expect(galleryVentAt(a.x, a.y - 10)).not.toBeNull();
    const withCurrent = gallerySites().find((x) => x.currents.length)!;
    const c = withCurrent.currents[0]!;
    const p = withCurrent.paths[c.path]![c.i0 + 1]!;
    const push = galleryCurrentAt(p.x, p.y)!;
    expect(Math.hypot(push.vx, push.vy)).toBeCloseTo(GALLERIES.currentSpeed, 0);
  });

  it('la Cattedrale è una caverna enorme', () => {
    const g = cathedralGallery()!;
    const c = g.caves[0]!;
    expect(c.rx).toBeGreaterThan(250);
    expect(galleryOpenAt(c.x, c.y)).toBe(true);
  });

  it('l’U-Boot non entra: sbatte sull’imbocco con la sua sagoma', () => {
    for (const g of gallerySites().slice(0, 4)) {
      const p = g.paths[0]![3]!;
      const ship = newShip({
        x: p.x,
        face: g.mouth.dir,
        hatches: [],
        bay: 'none',
        aboard: true,
        fuel: 1,
        model: 'whale',
        dive: p.y - WORLD.surfaceY - 40,
      });
      expect(hullBlocked(map, ship, p.x, ship.dive)).toBe(true);
    }
  });

  it('le bestie grandi restano fuori, le piccole entrano', () => {
    const g = gallerySites()[0]!;
    const p = g.paths[0]![6]!;
    const dir = g.mouth.dir;
    const run = (speciesId: string): boolean => {
      const w = createWild(1, { speciesId, area: [p.x - 3000, 0, p.x + 3000, 5000], respawnSeconds: [1, 1] });
      // it starts at the mouth, in the trench, swimming in
      const m = g.paths[0]![0]!;
      spawnWild(w, { speciesId, variant: 'comune' }, 20, m.x - dir * 20, m.y, dir);
      w.target = { x: p.x, y: p.y };
      let inside = false;
      for (let i = 0; i < 600; i++) {
        w.target = { x: p.x, y: p.y };
        stepRoam(w, {
          diver: { x: p.x + dir * 5000, y: p.y, dead: true },
          map,
          rng: () => 0.5,
          dt: 1 / 30,
        } as never);
        if (galleryOpenAt(w.x, w.y) && Math.abs(w.x - m.x) > 120) inside = true;
      }
      return inside;
    };
    expect(run('squalo_bianco')).toBe(false);
  });

  it('nella sacca d’aria il sottomarino ricarica l’aria', () => {
    const game = createGame(map, null, 4);
    giveSub(game, 2600);
    const a = gallerySites()[0]!.airs[0]!;
    Object.assign(game.sub, { aboard: true, x: a.x, y: a.y - 20, vx: 0, vy: 0, air: 10 });
    const ev: GameEvent[] = [];
    for (let t = 0; t < 1; t += 1 / 30) {
      Object.assign(game.sub, { x: a.x, y: a.y - 20, vx: 0, vy: 0 });
      stepSub(game, emptyInput(), 1 / 30, ev);
    }
    expect(game.sub.air).toBeGreaterThan(20);
  });

  it('la Cattedrale si scopre una volta sola e va sulla mappa', () => {
    const c = cathedralGallery()!.caves[0]!;
    const g = { seen: new Set<string>(), diver: { x: c.x, y: c.y } };
    const ev: GameEvent[] = [];
    discoverCathedral(g, ev);
    discoverCathedral(g, ev);
    expect(ev).toEqual([{ type: 'landmarkFound', name: CATHEDRAL.name }]);
    expect(g.seen.has(landmarkKey(CATHEDRAL.id))).toBe(true);
    const fosse = regionsMap(g.seen).find((r) => r.landmarks.includes(CATHEDRAL.name));
    expect(fosse).toBeDefined();
  });
});
