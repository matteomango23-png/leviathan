// The weather above the sea (look only: it changes nothing in the game's rules; saved, so it goes on where it was).
// It starts at random, with a random sequence after it (owner, 9 ottobre). One kind of
// weather at a time, chosen from WEATHER_NEXT when the current one runs out, blending slowly into the next;
// lightning flashes come at random during storms. The view reads `weatherLook` and `coldAt`.
import { ICE } from '../data/worldLayout';
import { ENDLESS } from '../data/endless';
import { WEATHER, WEATHERS, WEATHER_NEXT, type WeatherId, type WeatherLook } from '../data/weather';
import { biomeAt } from './world/stretches';
import { lerp, makeRng, range, type Rng } from './math';

export interface WeatherState {
  /** The kind blending out and the kind blending in (the same once the blend is over). */
  from: WeatherId;
  to: WeatherId;
  /** 0..1: how far the blend from `from` to `to` has gone. */
  blend: number;
  /** Seconds left before the next kind is chosen. */
  left: number;
  /** Seconds left of the current lightning flash (0: none). */
  flash: number;
  rng: Rng;
}

const minutes = (rng: Rng, id: WeatherId): number => {
  const [a, b] = WEATHERS[id].minutes;
  return range(rng, a, b) * 60;
};

/** What is saved of the weather. */
export interface SavedWeather {
  from: WeatherId;
  to: WeatherId;
  blend: number;
  left: number;
}

/**
 * The weather of a session: the saved one going on, or a random start. `seed` fixes the sequence (tests); by
 * default every session has its own.
 */
export function createWeather(
  seed = Math.floor(Math.random() * 2 ** 31),
  saved?: SavedWeather | null,
): WeatherState {
  const rng = makeRng(seed);
  if (saved) return { ...saved, flash: 0, rng };
  const start = pick(WEATHER.startWeights, rng);
  return { from: start, to: start, blend: 1, left: minutes(rng, start), flash: 0, rng };
}

export const saveWeather = (w: WeatherState): SavedWeather => ({
  from: w.from,
  to: w.to,
  blend: Math.round(w.blend * 1000) / 1000,
  left: Math.round(w.left),
});

/** A saved weather read back (null: missing or not valid). */
export function checkedWeather(raw: unknown): SavedWeather | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const kind = (v: unknown): v is WeatherId => typeof v === 'string' && v in WEATHERS;
  const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  if (!kind(r.from) || !kind(r.to) || !num(r.blend) || !num(r.left)) return null;
  return { from: r.from, to: r.to, blend: Math.max(0, Math.min(1, r.blend)), left: Math.max(0, r.left) };
}

/** A kind of weather by weights. */
function pick(weights: Partial<Record<WeatherId, number>>, rng: Rng): WeatherId {
  const options = Object.entries(weights) as [WeatherId, number][];
  const total = options.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [k, w] of options) {
    r -= w;
    if (r < 0) return k;
  }
  return options[options.length - 1]![0];
}

/** Picks the kind that follows `id`, by the weights in WEATHER_NEXT. */
export const nextWeather = (id: WeatherId, rng: Rng): WeatherId => pick(WEATHER_NEXT[id], rng);

/** The look of the weather right now: the two kinds mixed by the blend. */
export function weatherLook(w: WeatherState): WeatherLook {
  const a = WEATHERS[w.from].look;
  const b = WEATHERS[w.to].look;
  const out = { ...a };
  for (const key of Object.keys(a) as (keyof WeatherLook)[]) out[key] = lerp(a[key], b[key], w.blend);
  return out;
}

/** One step of the weather. Returns true when a lightning flash starts (the view lights the sky). */
export function stepWeather(w: WeatherState, dt: number): boolean {
  w.blend = Math.min(1, w.blend + dt / WEATHER.blendSeconds);
  w.left -= dt;
  if (w.left <= 0 && w.blend >= 1) {
    w.from = w.to;
    w.to = nextWeather(w.to, w.rng);
    w.blend = w.from === w.to ? 1 : 0;
    w.left = minutes(w.rng, w.to);
  }
  w.flash = Math.max(0, w.flash - dt);
  const perSec = weatherLook(w).lightningPerMin / 60;
  if (w.flash <= 0 && perSec > 0 && w.rng() < perSec * dt) {
    w.flash = WEATHER.lightningSeconds;
    return true;
  }
  return false;
}

/** Is the sea cold at x (the Mare di Ghiaccio of the coast, or a Banchisa stretch of the endless sea)? */
export function isColdSea(x: number): boolean {
  if (x < ENDLESS.startX) return x >= ICE.xMin;
  return biomeAt(x)?.id === 'ghiaccio';
}

/** How cold the sea is at x, 0..1, softened over WEATHER.coldFade so that rain turns into snow gradually. */
export function coldAt(x: number): number {
  const steps = 4;
  let n = 0;
  for (let i = -steps; i <= steps; i++) if (isColdSea(x + (i / steps) * WEATHER.coldFade)) n++;
  return n / (steps * 2 + 1);
}

/** The weather's name where you are (rain is snow in the cold seas). */
export function weatherName(w: WeatherState, x: number): string {
  const def = WEATHERS[w.blend < 0.5 ? w.from : w.to];
  return coldAt(x) >= 0.5 && def.coldName ? def.coldName : def.name;
}

/** Test panel: jumps straight to the kind after the current one (in the order of WEATHERS), with no blend. */
export function skipWeather(w: WeatherState): WeatherId {
  const ids = Object.keys(WEATHERS) as WeatherId[];
  const next = ids[(ids.indexOf(w.to) + 1) % ids.length]!;
  w.from = w.to = next;
  w.blend = 1;
  w.left = minutes(w.rng, next);
  return next;
}
