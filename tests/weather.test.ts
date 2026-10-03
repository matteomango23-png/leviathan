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
  const halfW = 140;
  const shallow = (x: number) => [{ x, y: WORLD.surfaceY + 40 }];
  const view = (x: number) => ({ x, halfW });
  /** Runs the birds with the camera at camX(t) over these schools; checks every frame with `each`. */
  function fly(
    seed: number,
    seconds: number,
    camX: (t: number) => number,
    schools: (t: number) => { x: number; y: number }[],
    wanted: (t: number) => number = () => 1,
    each?: (s: ReturnType<typeof createBirds>, cx: number) => void,
  ) {
    const s = createBirds(seed);
    let splashes = 0;
    for (let t = 0; t < seconds; t += 1 / 30) {
      const cx = camX(t);
      splashes += stepBirds(s, 1 / 30, view(cx), wanted(t), 0.2, schools(t)).length;
      each?.(s, cx);
    }
    return { s, splashes };
  }

  it('col bel tempo arrivano pochi stormi sopra i pesci, e restano sopra l’acqua', () => {
    let most = 0;
    const { s } = fly(
      2,
      120,
      () => 2000,
      () => [...shallow(2000), ...shallow(2300), ...shallow(1700)],
      () => 1,
      (st) => {
        most = Math.max(most, st.flocks.filter((f) => f.active).length);
        for (const f of st.flocks)
          if (f.active)
            for (const b of f.birds) if (b.dive === 'none') expect(b.y).toBeLessThan(WORLD.surfaceY);
      },
    );
    expect(most).toBe(BIRDS.flocks);
    for (const f of s.flocks) {
      expect(f.birds.length).toBeGreaterThanOrEqual(BIRDS.perFlock[0]);
      expect(f.birds.length).toBeLessThanOrEqual(BIRDS.perFlock[1]);
    }
  });

  it('non ci sono sempre: arrivano ogni tanto, restano un po’ e se ne vanno', () => {
    let on = 0;
    let arrivals = 0;
    let was = false;
    const seconds = 1200;
    fly(
      11,
      seconds,
      () => 2000,
      () => shallow(2000),
      () => 1,
      (st) => {
        const now = st.flocks.some((f) => f.active);
        if (now) on += 1 / 30;
        if (now && !was) arrivals++;
        was = now;
      },
    );
    expect(arrivals).toBeGreaterThan(2);
    expect(on / seconds).toBeLessThan(0.85);
    expect(on / seconds).toBeGreaterThan(0.3);
  });

  it('senza pesci vicini alla superficie niente uccelli', () => {
    const { s } = fly(
      3,
      60,
      () => 2000,
      () => [{ x: 2000, y: WORLD.surfaceY + 400 }],
    );
    expect(s.flocks.some((f) => f.active)).toBe(false);
  });

  it('uno stormo fa avanti e indietro sopra il suo banco e resta unito', () => {
    const { s } = fly(
      4,
      90,
      () => 2000,
      () => shallow(2000),
    );
    const f = s.flocks.find((x) => x.active)!;
    expect(f).toBeDefined();
    expect(Math.abs(f.x - 2000)).toBeLessThan(BIRDS.patrol[1] + 80);
    for (const b of f.birds) {
      if (b.dive !== 'none') continue;
      expect(Math.abs(b.x - f.x)).toBeLessThan(BIRDS.spread[0] * 3);
      expect(Math.abs(b.y - f.y)).toBeLessThan(BIRDS.spread[1] * 4);
    }
  });

  it('nessun uccello compare, sparisce o salta dentro lo schermo, anche andando avanti e indietro', () => {
    const visible = (x: number, cx: number) => Math.abs(x - cx) <= halfW + BIRDS.wingspanUnits / 2;
    let prev = new Map<object, { x: number; cx: number }>();
    let checked = 0;
    // the camera swims east and west fast, over schools spread along the way (some deep, some shallow);
    // the weather turns bad and good again
    fly(
      5,
      600,
      (t) => 3000 + Math.sin(t * 0.05) * 1500 + Math.sin(t * 0.31) * 200,
      (t) =>
        [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({
          x: 1500 + i * 420,
          y: WORLD.surfaceY + (i % 3 === 0 ? 300 : 30 + Math.sin(t * 0.02 + i) * 20),
        })),
      (t) => (Math.floor(t / 150) % 2 ? 0 : 1),
      (st, cx) => {
        const now = new Map<object, { x: number; cx: number }>();
        for (const f of st.flocks) if (f.active) for (const b of f.birds) now.set(b, { x: b.x, cx });
        for (const [b, p] of now) {
          const before = prev.get(b);
          if (!before) expect(visible(p.x, cx), 'appeared in view').toBe(false);
          else if (Math.abs(p.x - before.x) > 20) {
            expect(visible(before.x, before.cx), 'jumped from view').toBe(false);
            expect(visible(p.x, cx), 'jumped into view').toBe(false);
          }
          if (visible(p.x, cx)) checked++;
        }
        for (const [b, p] of prev)
          if (!now.has(b)) expect(visible(p.x, p.cx), 'vanished in view').toBe(false);
        prev = now;
      },
    );
    expect(checked).toBeGreaterThan(300); // birds were really seen
  });

  it('in tempesta se ne vanno', () => {
    const { s } = fly(
      6,
      120,
      () => 2000,
      () => shallow(2000),
      (t) => (t < 60 ? 1 : 0),
    );
    expect(s.flocks.some((f) => f.active)).toBe(false);
    const calm = fly(
      6,
      60,
      () => 2000,
      () => shallow(2000),
    );
    expect(calm.s.flocks.some((f) => f.active)).toBe(true);
  });

  it('si tuffano sulle sardine vicine alla superficie, non su quelle più giù', () => {
    const near = fly(
      8,
      300,
      () => 2000,
      () => [{ x: 2000, y: WORLD.surfaceY + 30 }],
    );
    const deeper = fly(
      8,
      300,
      () => 2000,
      () => [{ x: 2000, y: WORLD.surfaceY + 120 }],
    );
    expect(near.splashes).toBeGreaterThan(0);
    expect(deeper.splashes).toBe(0);
  });
});
