// Lot N1 (owner, 13 novembre 2026): the day and the night, about 30 minutes, 60% light and 40% dark; the night's
// hunters, species and albinos; "Dormi" running the time fast until evening or morning, stopped whenever you like.
import { beforeAll, describe, expect, it } from 'vitest';
import { BEAST_TEMPER, PATROL, ROAM } from '../src/data/beasts';
import { DAY, NIGHT_BEASTS, NIGHT_SPECIES, SLEEP } from '../src/data/daynight';
import { DIVER } from '../src/data/diver';
import { VARIANT_RULES } from '../src/data/rules';
import {
  checkedDay,
  clockText,
  createDay,
  nightness,
  phaseStart,
  saveDay,
  startSleep,
  stepDay,
  stopSleep,
} from '../src/systems/dayNight';
import { nightTemper } from '../src/systems/beasts/roam';
import { nightWeight } from '../src/systems/beasts/spawnDraw';
import { rollWildForm } from '../src/systems/beasts/forms';
import { createGame, toSave } from '../src/systems/game';
import { parseSave } from '../src/systems/save/saveData';
import { canSleep, goToSleep } from '../src/systems/sleep';
import type { GameEvent } from '../src/systems/events';
import type { TileMap } from '../src/systems/world/tileMap';
import { generateWorld } from '../src/systems/world/worldGen';
import { giveVessels } from './helpers/vessels';

let map: TileMap;
beforeAll(() => {
  map = generateWorld();
});

const share = (id: string): number => DAY.phases.find((p) => p.id === id)!.share;
const never = (): number => 1; // an rng that never wakes you

describe('il ciclo del giorno', () => {
  it('dura mezz’ora, 60% luce e 40% buio', () => {
    expect(DAY.cycleSeconds).toBe(1800);
    expect(DAY.phases.reduce((s, p) => s + p.share, 0)).toBeCloseTo(1);
    expect((share('alba') + share('giorno')) * DAY.cycleSeconds).toBeCloseTo(18 * 60);
    expect((share('tramonto') + share('notte')) * DAY.cycleSeconds).toBeCloseTo(12 * 60);
  });

  it('di giorno nessun buio, di notte tutto, morbido ad alba e tramonto', () => {
    expect(nightness({ t: phaseStart('giorno') + 0.1 })).toBe(0);
    expect(nightness({ t: phaseStart('notte') + 0.1 })).toBe(1);
    const mid = nightness({ t: phaseStart('tramonto') + share('tramonto') / 2 });
    expect(mid).toBeGreaterThan(0.3);
    expect(mid).toBeLessThan(0.7);
    expect(nightness({ t: phaseStart('alba') + 0.001 })).toBeGreaterThan(0.95);
  });

  it('il tempo passa e l’orologio lo dice', () => {
    const d = createDay();
    stepDay(d, DAY.cycleSeconds / 4, never, true);
    expect(d.t).toBeCloseTo(DAY.startAt + 0.25);
    expect(clockText({ t: 0 })).toBe('Alba · 05:00');
    expect(clockText({ t: phaseStart('notte') + 0.1 })).toMatch(/^Notte · \d\d:\d\d$/);
  });
});

describe('dormire', () => {
  it('corre 30 volte più veloce e si ferma da solo a sera', () => {
    const d = createDay({ t: phaseStart('giorno') });
    startSleep(d, 'sera');
    const t0 = d.t;
    stepDay(d, 1, never, true);
    expect((d.t - t0) * DAY.cycleSeconds).toBeCloseTo(SLEEP.speed);
    let why: string | null = null;
    for (let i = 0; i < 2000 && !why; i++) why = stepDay(d, 0.1, never, true);
    expect(why).toBe('reached');
    expect(d.t).toBeCloseTo(phaseStart('tramonto'));
    expect(d.sleeping).toBeNull();
  });

  it('fino al mattino passa la mezzanotte del ciclo e si ferma all’alba', () => {
    const d = createDay({ t: phaseStart('notte') + 0.05 });
    startSleep(d, 'mattino');
    let why: string | null = null;
    for (let i = 0; i < 2000 && !why; i++) why = stepDay(d, 0.1, never, true);
    expect(why).toBe('reached');
    expect(d.t).toBe(phaseStart('alba'));
  });

  it('ci si sveglia quando si vuole', () => {
    const d = createDay();
    startSleep(d, 'sera');
    stopSleep(d);
    const t0 = d.t;
    stepDay(d, 1, never, true);
    expect((d.t - t0) * DAY.cycleSeconds).toBeCloseTo(1);
  });

  it('in mare aperto qualcosa può svegliarti, al porto no', () => {
    const always = (): number => 0;
    const sea = createDay();
    startSleep(sea, 'sera');
    expect(stepDay(sea, 1, always, false)).toBe(SLEEP.wakeReasons[0]);
    const port = createDay();
    startSleep(port, 'sera');
    expect(stepDay(port, 1, always, true)).toBeNull();
  });

  it('si dorme a nave ferma o al porto, non a nuoto né nel sottomarino', () => {
    const g = createGame(map, null, 4);
    giveVessels(g);
    const ev: GameEvent[] = [];
    g.port = null;
    expect(canSleep(g)).toBe(false); // swimming
    expect(goToSleep(g, 'sera', ev)).toBe(false);
    expect(ev.some((e) => e.type === 'cannotSleep')).toBe(true);
    Object.assign(g.ship, { aboard: true, speed: 0 });
    expect(canSleep(g)).toBe(true);
    g.ship.speed = 50;
    expect(canSleep(g)).toBe(false); // sailing
    Object.assign(g.ship, { aboard: false, speed: 0 });
    g.sub.aboard = true;
    expect(canSleep(g)).toBe(false);
  });
});

describe('il salvataggio dell’ora', () => {
  it('l’ora si salva e si rilegge; una partita vecchia parte al mattino', () => {
    const g = createGame(map, null, 4);
    g.day.t = 0.8;
    const s = parseSave(JSON.stringify(toSave(g, new Date())));
    expect(s.day).toEqual({ t: 0.8 });
    expect(createGame(map, s, 4).day.t).toBeCloseTo(0.8);
    const old = JSON.parse(JSON.stringify(toSave(g, new Date()))) as Record<string, unknown>;
    delete old.day;
    expect(createGame(map, parseSave(JSON.stringify(old)), 4).day.t).toBe(DAY.startAt);
    expect(checkedDay({ t: 'x' })).toBeNull();
    expect(saveDay({ t: 0.123456, sleeping: null })).toEqual({ t: 0.1235 });
  });
});

describe('le bestie di notte', () => {
  it('una aggressiva vede più lontano e corre di più, ma resta sotto il tuo scatto', () => {
    const day = nightTemper('aggressive', 0);
    const night = nightTemper('aggressive', 1);
    expect(night.sight).toBeGreaterThan(day.sight);
    expect(night.speed).toBeGreaterThan(day.speed);
    const fastest = Math.max(
      ...Object.values(BEAST_TEMPER)
        .filter((t) => t.temper === 'aggressive')
        .map((t) => t.speedMult ?? 1),
    );
    const charge = ROAM.chaseSpeed * DIVER.lengthUnits * fastest * night.speed * PATROL.chargeMult;
    expect(charge).toBeLessThan(DIVER.dash.speed);
  });

  it('le calme di notte si tengono lontane', () => {
    expect(nightTemper('calm', 0).temper).toBe('calm');
    expect(nightTemper('calm', 1).temper).toBe(NIGHT_BEASTS.calmShy ? 'shy' : 'calm');
  });

  it('le specie notturne escono di più col buio, le altre come sempre', () => {
    const id = Object.keys(NIGHT_SPECIES)[0]!;
    expect(nightWeight(id, 1)).toBeGreaterThan(nightWeight(id, 0) * 4);
    expect(nightWeight('cernia', 1)).toBe(1);
    expect(nightWeight('cernia', 0)).toBe(1);
  });

  it('l’albino è più probabile di notte', () => {
    const rng = (v: number) => () => v;
    const r = VARIANT_RULES.albino.spawnChance * 1.5;
    expect(rollWildForm('squalo_bianco', rng(r), 1).variant).not.toBe('albino');
    expect(rollWildForm('squalo_bianco', rng(r), NIGHT_BEASTS.albinoMult).variant).toBe('albino');
  });
});
