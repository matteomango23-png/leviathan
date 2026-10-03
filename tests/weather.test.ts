import { describe, expect, it } from 'vitest';
import { BIRDS, WEATHER, WEATHERS, WEATHER_NEXT, type WeatherId } from '../src/data/weather';
import { ENDLESS } from '../src/data/endless';
import { ICE, WORLD } from '../src/data/worldLayout';
import { createBirds, stepBirds } from '../src/systems/birds';
import { biomeOf } from '../src/systems/world/stretches';
import {
  coldAt,
  createWeather,
  isColdSea,
  nextWeather,
  stepWeather,
  weatherLook,
  weatherName,
} from '../src/systems/weather';
import { makeRng } from '../src/systems/math';

const IDS = Object.keys(WEATHERS) as WeatherId[];

/** Runs the weather for `seconds` in steps of 0.1 s, collecting every kind seen and every flash. */
function run(seconds: number, seed = 1) {
  const w = createWeather(seed);
  const seen = new Set<WeatherId>([w.to]);
  const flashesIn = new Map<WeatherId, number>();
  let maxStep = 0;
  let prev = weatherLook(w);
  for (let t = 0; t < seconds; t += 0.1) {
    if (stepWeather(w, 0.1)) {
      const k = w.from === 'tempesta' ? w.from : w.to; // a storm still blending out may flash
      flashesIn.set(k, (flashesIn.get(k) ?? 0) + 1);
    }
    seen.add(w.to);
    const look = weatherLook(w);
    maxStep = Math.max(maxStep, Math.abs(look.clouds - prev.clouds), Math.abs(look.precip - prev.precip));
    prev = look;
  }
  return { w, seen, flashesIn, maxStep };
}

describe('meteo', () => {
  it('ogni tipo ha dati validi e un seguito', () => {
    for (const id of IDS) {
      const d = WEATHERS[id];
      expect(d.id).toBe(id);
      expect(d.minutes[0]).toBeGreaterThan(0);
      expect(d.minutes[1]).toBeGreaterThanOrEqual(d.minutes[0]);
      for (const [k, v] of Object.entries(d.look)) {
        expect(v, `${id}.${k}`).toBeGreaterThanOrEqual(0);
        if (k !== 'waves' && k !== 'lightningPerMin') expect(v, `${id}.${k}`).toBeLessThanOrEqual(1);
      }
      const next = Object.entries(WEATHER_NEXT[id]);
      expect(next.length).toBeGreaterThan(0);
      for (const [k, wgt] of next) {
        expect(IDS).toContain(k);
        expect(wgt).toBeGreaterThan(0);
      }
    }
  });

  it('una tempesta non arriva mai dal sereno', () => {
    expect(WEATHER_NEXT.sereno.tempesta).toBeUndefined();
    const rng = makeRng(5);
    for (let i = 0; i < 500; i++) expect(nextWeather('sereno', rng)).not.toBe('tempesta');
  });

  it('si parte col sereno e in due ore di gioco si vedono tutti i tipi', () => {
    expect(createWeather().to).toBe(WEATHER.start);
    const { seen } = run(2 * 3600);
    for (const id of IDS) expect(seen.has(id), id).toBe(true);
  });

  it('il cambio è graduale: niente salti da un istante all’altro', () => {
    const { maxStep } = run(3600);
    // one step of 0.1 s moves the look by at most 0.1 / blendSeconds of the full difference (≤ 1)
    expect(maxStep).toBeLessThanOrEqual(0.1 / WEATHER.blendSeconds + 1e-9);
  });

  it('i lampi solo quando c’è tempesta', () => {
    const { flashesIn } = run(3 * 3600, 3);
    expect(flashesIn.get('tempesta') ?? 0).toBeGreaterThan(0);
    for (const id of IDS) if (id !== 'tempesta') expect(flashesIn.get(id) ?? 0, id).toBe(0);
  });

  it('stessa partenza, stesso tempo (ripetibile)', () => {
    const a = run(1800, 9).w;
    const b = run(1800, 9).w;
    expect([a.from, a.to, a.blend]).toEqual([b.from, b.to, b.blend]);
  });

  it('neve solo dove fa freddo: Mare di Ghiaccio e Banchisa', () => {
    expect(isColdSea(1000)).toBe(false);
    expect(isColdSea(ICE.xMin + 10)).toBe(true);
    let ice = -1;
    let open = -1;
    for (let k = 0; k < 200 && (ice < 0 || open < 0); k++) {
      if (biomeOf(k).id === 'ghiaccio' && ice < 0) ice = k;
      if (biomeOf(k).id !== 'ghiaccio' && open < 0) open = k;
    }
    const mid = (k: number): number => ENDLESS.startX + (k + 0.5) * ENDLESS.stretch;
    expect(isColdSea(mid(ice))).toBe(true);
    expect(isColdSea(mid(open))).toBe(false);
    expect(coldAt(mid(ice))).toBe(1);
    expect(coldAt(1000)).toBe(0);
    // across the edge of the Mare di Ghiaccio the cold rises little by little
    const edge = coldAt(ICE.xMin);
    expect(edge).toBeGreaterThan(0);
    expect(edge).toBeLessThan(1);
    const w = createWeather();
    w.from = w.to = 'pioggia';
    expect(weatherName(w, 1000)).toBe('Pioggia');
    expect(weatherName(w, ICE.xMin + 1000)).toBe('Neve');
  });
});

describe('uccelli marini', () => {
  const camX = 2000;

  it('col bel tempo arrivano gli stormi, e restano sopra l’acqua', () => {
    const s = createBirds(2);
    let seenActive = 0;
    for (let t = 0; t < 120; t += 1 / 30) {
      stepBirds(s, 1 / 30, camX, 1, 0.2, []);
      for (const f of s.flocks) {
        if (!f.active) continue;
        seenActive = Math.max(seenActive, s.flocks.filter((x) => x.active).length);
        for (const b of f.birds) {
          expect(b.dive).toBe('none');
          expect(b.y).toBeLessThan(WORLD.surfaceY);
        }
      }
    }
    expect(seenActive).toBe(BIRDS.flocks);
  });

  it('gli uccelli di uno stormo restano vicini', () => {
    const s = createBirds(4);
    for (let t = 0; t < 60; t += 1 / 30) stepBirds(s, 1 / 30, camX, 1, 0.5, []);
    for (const f of s.flocks.filter((x) => x.active))
      for (const b of f.birds) {
        expect(Math.abs(b.x - f.x)).toBeLessThan(BIRDS.spread[0] * 3);
        expect(Math.abs(b.y - f.y)).toBeLessThan(BIRDS.spread[1] * 4);
      }
  });

  it('in tempesta se ne vanno', () => {
    const s = createBirds(6);
    for (let t = 0; t < 60; t += 1 / 30) stepBirds(s, 1 / 30, camX, 1, 0.2, []);
    expect(s.flocks.some((f) => f.active)).toBe(true);
    for (let t = 0; t < 60; t += 1 / 30) stepBirds(s, 1 / 30, camX, 0, 1, []);
    expect(s.flocks.some((f) => f.active)).toBe(false);
  });

  it('si tuffano sulle sardine vicine alla superficie, non su quelle profonde', () => {
    const shallow = createBirds(8);
    const deep = createBirds(8);
    let splashShallow = 0;
    let splashDeep = 0;
    for (let t = 0; t < 120; t += 1 / 30) {
      const fx = shallow.flocks.find((f) => f.active)?.x ?? camX;
      for (const sp of stepBirds(shallow, 1 / 30, camX, 1, 0, [{ x: fx, y: WORLD.surfaceY + 15 }])) {
        splashShallow++;
        expect(sp.y).toBe(WORLD.surfaceY);
      }
      const dx = deep.flocks.find((f) => f.active)?.x ?? camX;
      splashDeep += stepBirds(deep, 1 / 30, camX, 1, 0, [{ x: dx, y: WORLD.surfaceY + 200 }]).length;
    }
    expect(splashShallow).toBeGreaterThan(0);
    expect(splashDeep).toBe(0);
  });

  it('uno stormo lasciato lontano torna vicino alla telecamera', () => {
    const s = createBirds(10);
    for (let t = 0; t < 30; t += 1 / 30) stepBirds(s, 1 / 30, camX, 1, 0, []);
    for (let t = 0; t < 30; t += 1 / 30) stepBirds(s, 1 / 30, camX + 3000, 1, 0, []);
    for (const f of s.flocks.filter((x) => x.active))
      expect(Math.abs(f.x - (camX + 3000))).toBeLessThanOrEqual(BIRDS.keepWithin);
  });
});
