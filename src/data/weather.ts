// Leviatano — the weather above the sea and the sea birds (owner, 4 ottobre 2026: "meteo dinamico e stormi di
// uccelli", look only: nothing here changes battles, beasts, air or saves). The weather changes by itself every
// few minutes and blends slowly from one kind to the next; in the cold seas rain falls as snow. Values marked
// "tuning" are a first pass: change them here, never in systems or views.

export type WeatherId = 'sereno' | 'nuvoloso' | 'pioggia' | 'tempesta' | 'nebbia';

/** How a kind of weather looks. Every value is 0..1 unless said otherwise; the view mixes them while blending. */
export interface WeatherLook {
  /** Cloud cover: darker, greyer sky. */
  clouds: number;
  /** Rain (snow in the cold seas): how dense. */
  precip: number;
  /** Mist above the water. */
  fog: number;
  /** Wind: slanted rain, faster clouds, birds pushed sideways. */
  wind: number;
  /** Surface waves: multiplies the height of the surface line (1 = calm sea of today). */
  waves: number;
  /** Lightning flashes per minute (storms only). */
  lightningPerMin: number;
  /** Light rays under water: multiplies their strength. */
  rays: number;
  /** Extra darkness near the surface (fades out with depth, WEATHER.dimDepthM). */
  dim: number;
  /** How many of the bird flocks fly in this weather (0 = they shelter). */
  birds: number;
}

export interface WeatherDef {
  id: WeatherId;
  /** Shown nowhere yet: for the docs and tests. */
  name: string;
  /** In the cold seas the same weather is called this (rain is snow there). */
  coldName?: string;
  /** How long it lasts, in minutes (a random value between the two). Tuning. */
  minutes: [number, number];
  look: WeatherLook;
}

export const WEATHERS: Record<WeatherId, WeatherDef> = {
  sereno: {
    id: 'sereno',
    name: 'Sereno',
    minutes: [3, 6],
    look: { clouds: 0, precip: 0, fog: 0, wind: 0.15, waves: 1, lightningPerMin: 0, rays: 1, dim: 0, birds: 1 },
  },
  nuvoloso: {
    id: 'nuvoloso',
    name: 'Nuvoloso',
    minutes: [2, 5],
    look: { clouds: 0.6, precip: 0, fog: 0.1, wind: 0.35, waves: 1.4, lightningPerMin: 0, rays: 0.6, dim: 0.08, birds: 0.8 },
  },
  pioggia: {
    id: 'pioggia',
    name: 'Pioggia',
    coldName: 'Neve',
    minutes: [2, 4],
    look: { clouds: 0.85, precip: 0.6, fog: 0.2, wind: 0.45, waves: 1.9, lightningPerMin: 0, rays: 0.35, dim: 0.15, birds: 0.4 },
  },
  tempesta: {
    id: 'tempesta',
    name: 'Tempesta',
    coldName: 'Bufera di neve',
    minutes: [1.5, 3],
    look: { clouds: 1, precip: 1, fog: 0.25, wind: 1, waves: 3.2, lightningPerMin: 5, rays: 0.15, dim: 0.28, birds: 0 },
  },
  nebbia: {
    id: 'nebbia',
    name: 'Nebbia',
    minutes: [2, 4],
    look: { clouds: 0.4, precip: 0, fog: 0.85, wind: 0.05, waves: 0.8, lightningPerMin: 0, rays: 0.45, dim: 0.1, birds: 0.5 },
  },
};

/** Which weather follows which: weights of the next kind (a storm never follows a clear sky). Tuning. */
export const WEATHER_NEXT: Record<WeatherId, Partial<Record<WeatherId, number>>> = {
  sereno: { sereno: 1, nuvoloso: 3, nebbia: 1 },
  nuvoloso: { sereno: 2, nuvoloso: 1, pioggia: 2, nebbia: 1 },
  pioggia: { nuvoloso: 2, pioggia: 1, tempesta: 1.2 },
  tempesta: { pioggia: 2, nuvoloso: 1 },
  nebbia: { sereno: 2, nuvoloso: 1 },
};

export const WEATHER = {
  seed: 4127, // tuning: another seed, another sequence of weather
  start: 'sereno' as WeatherId, // every session starts calm
  blendSeconds: 25, // tuning: how long one kind takes to turn into the next
  lightningSeconds: 0.35, // how long a flash lasts
  /** Below this depth (m) the weather is not felt any more: rays, darkness and flashes fade to nothing. */
  dimDepthM: 60,
  /** Cold seas (Mare di Ghiaccio, Banchisa): rain falls as snow; the change spreads over this many units. */
  coldFade: 240,
  /** Rain and snow drawn on screen at full density. Tuning (performance on iPhone). */
  rainDrops: 170,
  snowFlakes: 140,
  /** Colours: the sky of today and the sky under full clouds, the mist, the clouds, the flash. */
  skyStorm: { top: '#06090d', bottom: '#151d24' },
  fogColor: 0x8d9ca4,
  cloudColor: 0x55636e, // lighter than the night sky, so the clouds show
  rainColor: 0xa9bcc6,
  snowColor: 0xe6eef2,
  flashColor: 0xdfe8ff,
};

/** The sea birds: flocks of gulls and gannets over the water near the diver. Tuning. */
export const BIRDS = {
  seed: 913,
  flocks: 3, // flocks kept around the camera at most
  perFlock: [5, 9] as [number, number], // birds in a flock (random between the two)
  /** Height of a flock above the surface (world units; the surface is WORLD.surfaceY, the sky goes up to −60). */
  altitude: [18, 52] as [number, number],
  speed: [16, 26] as [number, number], // units per second
  wingspanUnits: 10, // ~1.7 m: a large gull or a gannet (the diver is 12 units = 2 m)
  flapHz: [2.2, 3.4] as [number, number],
  glideChance: 0.45, // share of time a bird glides with open wings instead of flapping
  spread: [18, 7] as [number, number], // how far a bird keeps from its flock centre (x, y)
  /** A flock farther than this from the camera centre is moved to the edge of the view, coming in. */
  keepWithin: 260,
  enterOffset: 120, // units beyond the camera centre where a moved flock appears
  /** Diving on sardines: a school this close under the surface (units) and this near sideways draws a plunge. */
  diveShoalDepth: 40,
  diveRange: 50,
  diveChancePerSec: 0.25,
  diveSpeed: 70,
  diveDepth: 5, // units under the surface a plunging bird reaches before coming back up
  /** Wind pushes the flocks sideways (units per second at wind 1). */
  windPush: 14,
  // pale grey gulls with dark wing tips: they show against the dark sky
  color: 0xaab5bc,
  tipColor: 0x23292e,
  bellyColor: 0xd5dde1,
};
