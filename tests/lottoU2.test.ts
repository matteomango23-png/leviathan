// Lot U2 (owner, 12 novembre 2026): the albino crocodile's echo found with a team at level 8 and off the sonar's
// screen; the legends' stars; the radars showing which beast is there.
import { beforeAll, describe, expect, it } from 'vitest';
import { PORTO_FANGO } from '../src/data/economy';
import { HUNT_RULES, HUNTS } from '../src/data/hunts';
import { SPECIES, UNIQUE_VARIANTS } from '../src/data/species';
import { formStars, wildLevelRange } from '../src/systems/beasts/forms';
import { createGame, enterPort, stepGame, type GameState } from '../src/systems/game';
import { huntReady, huntReadyLevel, sonarReadout } from '../src/systems/hunts';
import { emptyInput } from '../src/systems/input';
import { radarContacts, radarRadiusM } from '../src/systems/ship/radar';
import { WORLD } from '../src/data/worldLayout';
import { giveTestBeast } from '../src/systems/testTools';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';
import { giveVessels } from './helpers/vessels';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

const croc = HUNTS.find((h) => h.id === 'caccia_coccodrillo')!;

const withTeam = (level: number): GameState => {
  const g = createGame(map, null, 4);
  giveTestBeast(g, { speciesId: 'zanna', variant: 'comune' }, level);
  giveVessels(g);
  return g;
};

const rainAtDen = (g: GameState): void => {
  Object.assign(g.weather, { from: 'pioggia', to: 'pioggia', blend: 1, left: 999 });
  const den = g.dens[HUNTS.indexOf(croc)]!;
  Object.assign(g.ship, { aboard: true, sonarOn: true, speed: 0, x: den.x + HUNT_RULES.bigEchoRange * 0.3 });
  stepGame(g, emptyInput(), 1 / 30);
};

describe('i leggendari solo quando sei pronto', () => {
  it('al livello 8 il coccodrillo leggendario non si sente né si trova; al suo livello sì', () => {
    expect(huntReadyLevel(croc)).toBe(
      wildLevelRange({ variant: 'comune', ...croc.form })[0] - HUNT_RULES.readyBelow,
    );
    const weak = withTeam(8);
    weak.port = PORTO_FANGO;
    enterPort(weak, []);
    expect(weak.hunts[croc.id]?.heard).toBeFalsy();
    weak.hunts[croc.id] = { heard: true }; // an old save that heard it already
    rainAtDen(weak);
    expect(weak.hunts[croc.id]?.echo).toBeFalsy();
    const ready = withTeam(huntReadyLevel(croc));
    expect(huntReady(croc, ready.beasts.team)).toBe(true);
    ready.port = PORTO_FANGO;
    enterPort(ready, []);
    expect(ready.hunts[croc.id]?.heard).toBe(true);
    rainAtDen(ready);
    expect(ready.hunts[croc.id]?.echo).toBe(true);
    expect(sonarReadout(ready).echoes.some((e) => e.label === 'eco anomala')).toBe(true);
  });

  it('l’eco si sente solo dentro quello che lo schermo del sonar mostra', () => {
    const g = withTeam(99);
    g.hunts[croc.id] = { heard: true };
    rainAtDen(g);
    const den = g.dens[HUNTS.indexOf(croc)]!;
    const far = withTeam(99);
    far.hunts[croc.id] = { heard: true };
    Object.assign(far.weather, { from: 'pioggia', to: 'pioggia', blend: 1, left: 999 });
    Object.assign(far.ship, {
      aboard: true,
      sonarOn: true,
      speed: 0,
      x: den.x + HUNT_RULES.bigEchoRange * 1.6,
    });
    stepGame(far, emptyInput(), 1 / 30);
    expect(g.hunts[croc.id]?.echo).toBe(true);
    expect(far.hunts[croc.id]?.echo).toBeFalsy();
  });
});

describe('le stelle', () => {
  it('ogni bestia unica è leggendaria, le specie restano come sono', () => {
    for (const u of UNIQUE_VARIANTS)
      expect(formStars({ speciesId: u.speciesId, variant: 'comune', unique: u.id }), u.id).toBe(5);
    for (const s of SPECIES.slice(0, 10))
      expect(formStars({ speciesId: s.id, variant: 'comune' })).toBe(Math.min(5, s.rarity));
  });
});

describe('il radar della nave', () => {
  it('le bestie hanno la loro grandezza e la tana con l’eco compare', () => {
    const g = withTeam(99);
    g.hunts[croc.id] = { heard: true, echo: true };
    const den = g.dens[HUNTS.indexOf(croc)]!;
    Object.assign(g.ship, { x: den.x });
    const w = g.beasts.wilds[0]!;
    Object.assign(w, { motion: 'roam', x: den.x + 20, y: g.map.surfaceY + 20 });
    const all = radarContacts(g);
    expect(all.some((c) => c.kind === 'beast' && c.cls)).toBe(true);
    // the den shows when it is within the radar's reach of the hull
    const depthM = (den.y - WORLD.surfaceY - g.ship.dive) / WORLD.unitsPerMetre;
    expect(all.some((c) => c.kind === 'den')).toBe(depthM < radarRadiusM(g.ship));
    g.hunts[croc.id] = { heard: true }; // no echo heard: no den
    expect(radarContacts(g).some((c) => c.kind === 'den')).toBe(false);
  });
});
