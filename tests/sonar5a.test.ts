// Block 5a (owner, 9 ottobre 2026): the sonar at the centre of the hunt. Echoes of up to five sizes (as many as the
// ship's sonar tells apart); an echo touched is analysed while the ship is slow and the beast in range: a species seen
// is named, a new one gives clues, and the diary notes where and how deep (saved). The tracker dart, from a
// submarine, lets the compass follow a beast for 30 minutes of play.
import { beforeAll, describe, expect, it } from 'vitest';
import { ENDLESS } from '../src/data/endless';
import { SONAR, TRACKER } from '../src/data/hunts';
import { WORLD } from '../src/data/worldLayout';
import { heardClass, trueClass } from '../src/systems/echoClass';
import type { GameEvent } from '../src/systems/events';
import { createGame, stepGame, toSave, type GameState } from '../src/systems/game';
import { sonarReadout } from '../src/systems/hunts';
import { emptyInput } from '../src/systems/input';
import { parseSave } from '../src/systems/save/saveData';
import { addNote, checkedNotes } from '../src/systems/sonarNotes';
import { lockEcho, scanSeconds, stepScan } from '../src/systems/sonarScan';
import { shootTracker, stepTracker, trackerTarget } from '../src/systems/trackerDart';
import { spawnWild } from '../src/systems/beasts/wildState';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';
import { giveVessels } from './helpers/vessels';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

const DT = 1 / 30;
const km = WORLD.unitsPerMetre * 1000;

function game(model = 'aurelia'): GameState {
  const g = createGame(map, null, 4);
  giveVessels(g);
  Object.assign(g.ship, { model, aboard: true, sonarOn: true, x: ENDLESS.startX + 3 * km, speed: 0 });
  stepGame(g, emptyInput(), DT);
  return g;
}

describe('echo sizes', () => {
  it('a weak sonar hears small and big; the best one tells five sizes, legends apart', () => {
    expect(heardClass('media', 2)).toBe('piccola');
    expect(heardClass('enorme', 2)).toBe('grande');
    expect(heardClass('leggendaria', 2)).toBe('grande');
    expect(heardClass('enorme', 3)).toBe('grande');
    for (const c of SONAR.named[5]!) expect(heardClass(c, 5)).toBe(c);
    expect(trueClass({ speciesId: 'capodoglio', variant: 'comune' })).toBe('enorme');
    expect(trueClass({ speciesId: 'beluga', variant: 'comune', unique: 'beluga_spettro' })).toBe(
      'leggendaria',
    );
  });

  it('the echoes on the screen carry their size (as the ship hears it) and their beast', () => {
    const weak = sonarReadout(game('aurelia')).echoes.filter((e) => e.cls);
    expect(weak.length).toBeGreaterThan(3);
    for (const e of weak) {
      expect(['piccola', 'grande']).toContain(e.cls);
      expect(e.target).toBeDefined();
    }
  });
});

describe('analysing an echo', () => {
  it('goes on only slow and in range; then names a species seen, gives clues of a new one, and notes it', () => {
    const g = game('nightmare');
    const echo = sonarReadout(g).echoes.find((e) => e.target)!;
    const id = echo.target!.speciesId;
    g.seen.delete(id);
    lockEcho(g.sonarScan, echo.target!);
    const ev: GameEvent[] = [];
    g.ship.speed = 1e6; // far too fast: deaf, it waits
    stepScan(g, 1, ev);
    expect(g.sonarScan.t).toBe(0);
    g.ship.speed = 0;
    for (let t = 0; t < scanSeconds(g.ship) + 0.5; t += 0.25) stepScan(g, 0.25, ev);
    const done = ev.find((e) => e.type === 'scanDone');
    expect(done && done.type === 'scanDone' && done.known).toBe(false);
    expect(done && done.type === 'scanDone' && done.text).toContain('Sconosciuta');
    expect(g.sonarNotes[id]).toBeDefined();
    // seen: named
    g.seen.add(id);
    lockEcho(g.sonarScan, echo.target!);
    const ev2: GameEvent[] = [];
    for (let t = 0; t < scanSeconds(g.ship) + 0.5; t += 0.25) stepScan(g, 0.25, ev2);
    const named = ev2.find((e) => e.type === 'scanDone');
    expect(named && named.type === 'scanDone' && named.known).toBe(true);
  });

  it('the echo going out of range stops the analysis', () => {
    const g = game('nightmare');
    const echo = sonarReadout(g).echoes.find((e) => e.target)!;
    lockEcho(g.sonarScan, echo.target!);
    g.ship.x += 100 * km; // far away
    const ev: GameEvent[] = [];
    stepScan(g, 0.5, ev);
    expect(g.sonarScan.lock).toBeNull();
    expect(ev.some((e) => e.type === 'scanLost')).toBe(true);
  });

  it('the notes grow (places, depths, a better size) and are saved', () => {
    const g = game();
    addNote(g.sonarNotes, 'capodoglio', { place: 'Mare blu', depthM: 80, cls: 'grande', type: 'Abissale' });
    addNote(g.sonarNotes, 'capodoglio', { place: 'Abisso', depthM: 300, cls: 'enorme', type: 'Abissale' });
    expect(g.sonarNotes.capodoglio).toMatchObject({ places: ['Mare blu', 'Abisso'], minM: 80, maxM: 300 });
    expect(g.sonarNotes.capodoglio!.cls).toBe('enorme');
    const back = createGame(map, parseSave(JSON.stringify(toSave(g, new Date()))), 4);
    expect(back.sonarNotes.capodoglio).toEqual(g.sonarNotes.capodoglio);
    expect(checkedNotes({ drago: g.sonarNotes.capodoglio, capodoglio: { places: 3 } })).toEqual({});
  });
});

describe('the tracker dart', () => {
  it('only at a beast close in front; the compass follows it for 30 minutes of play, then it runs out', () => {
    const g = game();
    Object.assign(g.sub, { aboard: true, x: g.ship.x, y: WORLD.surfaceY + 200, face: 1 });
    for (const w of g.beasts.wilds) w.motion = 'gone';
    const w = g.beasts.wilds.find((x) => !x.spawn.endless)!;
    spawnWild(w, { speciesId: 'barracuda', variant: 'comune' }, 5, g.sub.x - 60, g.sub.y, 1); // behind
    expect(trackerTarget(g)).toBeNull();
    w.x = g.sub.x + 40; // in front, close
    expect(trackerTarget(g)).toBe(w);
    const ev: GameEvent[] = [];
    shootTracker(g, ev);
    expect(g.gadgets.target).toEqual({ wild: w.id, speciesId: 'barracuda' });
    expect(g.gadgets.trackLeft).toBe(TRACKER.seconds);
    stepTracker(g, TRACKER.seconds - 1, ev);
    expect(g.gadgets.target).not.toBeNull();
    stepTracker(g, 2, ev);
    expect(g.gadgets.target).toBeNull();
    expect(ev.some((e) => e.type === 'trackerExpired')).toBe(true);
  });

  it('the trace is lost when its beast is gone (caught, beaten, back into the dark)', () => {
    const g = game();
    Object.assign(g.sub, { aboard: true, x: g.ship.x, y: WORLD.surfaceY + 200, face: 1 });
    const w = g.beasts.wilds.find((x) => !x.spawn.endless)!;
    spawnWild(w, { speciesId: 'barracuda', variant: 'comune' }, 5, g.sub.x + 40, g.sub.y, 1);
    const ev: GameEvent[] = [];
    shootTracker(g, ev);
    w.motion = 'gone';
    stepTracker(g, DT, ev);
    expect(g.gadgets.target).toBeNull();
    expect(ev.some((e) => e.type === 'targetLost')).toBe(true);
  });
});
