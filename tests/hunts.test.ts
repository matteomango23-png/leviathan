// The hunts (owner's decisions of 4 ottobre 2026): the legends and the prehistoric giants live in dens and are
// found in four steps (rumour at a harbour, anomalous echo on the ship's sonar in their weather, traces under water,
// then the beast, only in its weather); the diary is saved (v16).
import { beforeAll, describe, expect, it } from 'vitest';
import { OUTPOSTS, PORTO_FANGO } from '../src/data/economy';
import { HUNT_RULES, HUNTS } from '../src/data/hunts';
import type { WeatherId } from '../src/data/weather';
import { WORLD } from '../src/data/worldLayout';
import type { GameEvent } from '../src/systems/events';
import { createGame, enterPort, stepGame, toSave, type GameState } from '../src/systems/game';
import { huntNextStep, sonarReadout } from '../src/systems/hunts';
import { consumePresses, emptyInput } from '../src/systems/input';
import { isInWater } from '../src/systems/beasts/wildState';
import { migrate, parseSave } from '../src/systems/save/saveData';
import { giveTestBeast } from '../src/systems/testTools';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';
import { giveVessels } from './helpers/vessels';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});
const DT = 1 / 30;

function run(g: GameState, seconds: number): GameEvent[] {
  const all: GameEvent[] = [];
  const input = emptyInput();
  for (let t = 0; t < seconds; t += DT) {
    all.push(...stepGame(g, input, DT));
    consumePresses(input);
  }
  return all;
}

function game(): GameState {
  const g = createGame(map, null, 4);
  giveTestBeast(g, { speciesId: 'zanna', variant: 'comune' }, 30);
  giveVessels(g);
  run(g, DT);
  return g;
}

const setWeather = (g: GameState, w: WeatherId): void => {
  Object.assign(g.weather, { from: w, to: w, blend: 1, left: 999 });
};

const martello = HUNTS.find((h) => h.id === 'caccia_martello')!;

describe('cacce alle leggende', () => {
  it('le voci si sentono nei porti: ognuno parla dei suoi mari', () => {
    const g = game();
    g.port = PORTO_FANGO;
    const ev: GameEvent[] = [];
    enterPort(g, ev);
    const heard = HUNTS.filter((h) => g.hunts[h.id]?.heard).map((h) => h.region);
    expect(heard).toEqual(expect.arrayContaining(['costa', 'barriera_esterna', 'mare_blu']));
    expect(heard).not.toContain('abisso');
    expect(ev.filter((e) => e.type === 'rumourHeard').length).toBe(heard.length);
    g.port = OUTPOSTS.find((p) => p.id === 'grandi_fosse')!;
    enterPort(g, []);
    expect(g.hunts.caccia_livyatan?.heard).toBe(true); // the next region's rumour too
  });

  it('il sonar sente l’eco solo con la voce, vicino e col tempo giusto', () => {
    const g = game();
    const i = HUNTS.indexOf(martello);
    const den = g.dens[i]!;
    Object.assign(g.ship, { aboard: true, sonarOn: true, x: den.x + HUNT_RULES.sonarRange * 0.5 });
    setWeather(g, 'sereno');
    run(g, DT);
    expect(g.hunts[martello.id]?.echo).toBeFalsy(); // no rumour yet
    g.hunts[martello.id] = { heard: true };
    setWeather(g, 'tempesta');
    run(g, DT);
    expect(g.hunts[martello.id]?.echo).toBeFalsy(); // wrong weather
    setWeather(g, 'sereno');
    const ev = run(g, DT);
    expect(g.hunts[martello.id]?.echo).toBe(true);
    expect(ev.some((e) => e.type === 'echoFound')).toBe(true);
    expect(sonarReadout(g).echoes.some((e) => e.label === 'eco anomala')).toBe(true);
  });

  it('il sonar spento non sente niente; la caccia seguita si salva', () => {
    const g = game();
    const den = g.dens[HUNTS.indexOf(martello)]!;
    g.hunts[martello.id] = { heard: true };
    Object.assign(g.ship, { aboard: true, sonarOn: false, x: den.x + HUNT_RULES.sonarRange * 0.5 });
    setWeather(g, 'sereno');
    run(g, DT);
    expect(g.hunts[martello.id]?.echo).toBeFalsy();
    expect(sonarReadout(g).status).toBe('off');
    g.huntPinned = martello.id;
    const back = createGame(map, parseSave(JSON.stringify(toSave(g, new Date()))), 4);
    expect(back.huntPinned).toBe(martello.id);
    expect(huntNextStep(martello, back.hunts[martello.id])).toContain('sonar');
  });

  it('tracce vicino alla tana, poi la leggenda esce solo col suo tempo, fortissima', () => {
    const g = game();
    const i = HUNTS.indexOf(martello);
    const den = g.dens[i]!;
    g.hunts[martello.id] = { heard: true, echo: true };
    setWeather(g, 'nebbia');
    Object.assign(g.diver, { x: den.x, y: den.y, vx: 0, vy: 0 });
    const ev = run(g, 0.5);
    expect(g.hunts[martello.id]?.traces).toBe(true);
    expect(ev.some((e) => e.type === 'tracesFound')).toBe(true);
    const slot = g.beasts.wilds.find((w) => w.spawn.hunt === martello.id)!;
    run(g, 10);
    expect(isInWater(slot)).toBe(false); // not in its weather
    setWeather(g, 'sereno');
    let met: GameEvent | undefined;
    for (let t = 0; t < 60 && !isInWater(slot); t += 1) {
      Object.assign(g.diver, { x: den.x, y: den.y, vx: 0, vy: 0, hp: g.diver.maxHp, o2: g.diver.maxO2 });
      met = run(g, 1).find((e) => e.type === 'wildAppeared' && e.id === slot.id) ?? met;
    }
    expect(isInWater(slot)).toBe(true);
    expect(slot.form.unique).toBe('squalo_martello_preistorico');
    expect(slot.level).toBeGreaterThanOrEqual(60);
    expect(met && met.type === 'wildAppeared' && met.legend).toBe(true);
  });

  it('il diario si salva (v16); un salvataggio v15 parte col diario vuoto', () => {
    const g = game();
    g.hunts[martello.id] = { heard: true, echo: true };
    const back = createGame(map, parseSave(JSON.stringify(toSave(g, new Date()))), 4);
    expect(back.hunts[martello.id]).toEqual({ heard: true, echo: true });
    expect((migrate({ game: 'leviatano', version: 15 }) as { hunts: unknown }).hunts).toEqual({});
  });

  it('ogni tana è in acqua, sopra il fondale', () => {
    const g = game();
    for (const d of g.dens) {
      expect(d.y).toBeGreaterThan(WORLD.surfaceY);
      expect(map.solidAt(d.x, d.y), d.id).toBe(false);
    }
  });
});

describe('ricompense delle spedizioni', () => {
  it('le missioni di spedizione si completano arrivando lontano', async () => {
    const { acceptMission, isComplete } = await import('../src/systems/economy/missions');
    const g = game();
    g.gear.missions.done = [];
    acceptMission(g.gear, 'spedizione_barriera_esterna');
    Object.assign(g.diver, { x: OUTPOSTS[0]!.x + 50, y: WORLD.surfaceY + 10 });
    run(g, DT);
    expect(isComplete(g.gear, 'spedizione_barriera_esterna')).toBe(true);
  });

  it('i relitti delle regioni lontane sono più ricchi', async () => {
    const { WRECKS } = await import('../src/data/economy');
    const teeth = (id: string): number => WRECKS.find((w) => w.id === id)!.reward.teeth ?? 0;
    expect(teeth('relitto_abisso_1')).toBeGreaterThan(teeth('relitto_barriera_esterna_1'));
    expect(teeth('relitto_mare_blu_3')).toBeGreaterThan(teeth('relitto_mare_blu_1'));
  });

  it('i pezzi della nave: serbatoio più grande, motori più veloci', async () => {
    const { buyShipUpgrade, shipTank, shipTopSpeed } = await import('../src/systems/ship/ship');
    const g = game();
    g.gear.teeth = 10000;
    const tank = shipTank(g.ship);
    const top = shipTopSpeed(g.ship);
    expect(buyShipUpgrade(g, 'serbatoio').ok).toBe(true);
    expect(buyShipUpgrade(g, 'motori').ok).toBe(true);
    expect(shipTank(g.ship)).toBeGreaterThan(tank);
    expect(shipTopSpeed(g.ship)).toBeGreaterThan(top);
    const back = createGame(map, parseSave(JSON.stringify(toSave(g, new Date()))), 4);
    expect(back.ship.upgrades).toEqual(['serbatoio', 'motori']);
  });
});
