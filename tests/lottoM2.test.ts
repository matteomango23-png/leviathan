// Lot M2 (23 ottobre 2026, docs/PROPOSTA-MARE.md): the landmarks of the sea — the Grande Arco, the Cimitero dei
// velieri (one galleon to swim into, a chest inside), the Balena caduta — fixed by the seed, solid where their
// pictures are, found when you come near and shown on the map; the residents always living there.
import { describe, expect, it } from 'vitest';
import { parseExtraName } from '../scripts/art/cutout';
import { LANDMARKS } from '../src/data/landmarks';
import { TILE, WORLD } from '../src/data/worldLayout';
import type { GameEvent } from '../src/systems/events';
import { residentsOf } from '../src/systems/beasts/residents';
import { regionsMap } from '../src/systems/seaMap';
import { endlessTile } from '../src/systems/world/endless';
import {
  discoverLandmarks,
  landmarkChests,
  landmarkKey,
  landmarkSites,
  landmarkSolidAt,
} from '../src/systems/world/landmarks';
import { regionAt, stretchAt } from '../src/systems/world/stretches';
import { templeSites } from '../src/systems/world/templeSite';
import { generateWorld } from '../src/systems/world/worldGen';

const site = (id: string) => landmarkSites().find((s) => s.def.id === id)!;
const open = (x: number, y: number): boolean => endlessTile(x, y) === TILE.water;

describe('i punti di riferimento', () => {
  it('stanno nella loro regione, sempre gli stessi, lontano dai templi', () => {
    expect(regionAt(site('grande_arco').x).id).toBe('barriera_esterna');
    expect(regionAt(site('cimitero_velieri').x).id).toBe('mare_blu');
    expect(regionAt(site('balena_caduta').x).id).toBe('banchisa');
    for (const s of landmarkSites()) {
      expect(s.pieces.length).toBe(s.def.pieces.length); // every picture is there
      for (const t of templeSites()) expect(s.x1 < t.x0 || s.x0 > t.x1).toBe(true);
    }
  });

  it('l’arco blocca, ma sotto il canale è libero', () => {
    const s = site('grande_arco');
    const b = s.pieces[0]!;
    // the left pillar near its foot, the top of the span
    expect(landmarkSolidAt(b.left + b.w * 0.15, b.top + b.h * 0.75)).toBe(true);
    expect(landmarkSolidAt(b.left + b.w * 0.5, b.top + b.h * 0.12)).toBe(true);
    // the opening under it, all the way through
    for (let x = b.left + b.w * 0.38; x < b.left + b.w * 0.62; x += 4)
      expect(open(x, b.top + b.h * 0.6)).toBe(true);
  });

  it('nel galeone si entra dalla falla e si arriva al forziere', () => {
    const s = site('cimitero_velieri');
    const b = s.pieces[1]!;
    const chest = landmarkChests().find((c) => c.id === 'forziere_velieri')!;
    // the diver's body (radius 4) on the real map, at the height of the rooms
    const map = generateWorld();
    const y = b.top + b.h * 0.645;
    for (let x = b.left - 30; x <= chest.x; x += 3) expect(map.hitCircle(x, y, 4)).toBe(false);
    // the rooms have a ceiling and a floor
    expect(open(chest.x, b.top + b.h * 0.42)).toBe(false);
    expect(open(chest.x, b.top + b.h * 0.8)).toBe(false);
  });

  it('le ossa della balena non bloccano', () => {
    const b = site('balena_caduta').pieces[0]!;
    for (let x = b.left; x < b.left + b.w; x += 10) expect(landmarkSolidAt(x, b.top + b.h * 0.5)).toBe(false);
  });

  it('sotto l’arco vivono sempre una tartaruga e una manta', () => {
    const s = site('grande_arco');
    const mine = residentsOf(stretchAt(s.x)).filter((r) => r.id.includes('.L'));
    expect(mine.map((r) => r.speciesId).sort()).toEqual(['manta', 'tartaruga_marina']);
    for (const r of mine) expect(Math.abs(r.homeX - s.x)).toBeLessThan(10 * WORLD.unitsPerMetre);
  });

  it('avvicinandosi lo scopri una volta sola e compare sulla mappa', () => {
    const s = site('grande_arco');
    const g = { seen: new Set<string>(), diver: { x: s.x, y: s.ground - 60 } };
    const events: GameEvent[] = [];
    expect(regionsMap(g.seen)[0]!.landmarks).toEqual([null]);
    discoverLandmarks(g, events);
    discoverLandmarks(g, events);
    expect(events).toEqual([{ type: 'landmarkFound', name: 'Grande Arco' }]);
    expect(g.seen.has(landmarkKey('grande_arco'))).toBe(true);
    expect(regionsMap(g.seen)[0]!.landmarks).toEqual(['Grande Arco']);
  });

  it('lo script delle immagini riconosce i luoghi e il molo', () => {
    expect(parseExtraName('luogo_galeone_dentro.jpg')).toEqual({ kind: 'world', id: 'luogo_galeone_dentro' });
    expect(parseExtraName('molo_pali.jpg')).toEqual({ kind: 'world', id: 'molo_pali' });
    expect(LANDMARKS.length).toBe(3);
  });
});
