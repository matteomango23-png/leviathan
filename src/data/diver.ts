// Leviatano — the diver, the harpoon, camera, light and look of the sea (tappa 1).
// Speeds are in world units per second (u/s); 6 u = 1 m. Values marked "tuning" are a first pass.

export const DIVER = {
  lengthUnits: 12, // drawn length (= RENDER.diverLengthM)
  radius: 4, // collision radius
  maxHp: 5, // hearts (suits add SuitDef.hpBonus later)
  maxO2: 60, // seconds of air at the surface rate
  accel: 270,
  tilt: { fromSpeed: 12, fullSpeed: 22, max: 1.3 }, // leaning into the swim (u/s, u/s, radians)
  maxSpeed: 42, // tuning (× SuitDef.speedMult): 7 m/s (tappa 10, was 64: the world went by too fast)
  drag: 3.2,
  sinkWhenIdle: 10, // slow sinking when not swimming
  aimTurnRate: 10,
  aimHoldSeconds: 0.6, // after a shot he keeps facing it this long (swims backwards meanwhile)
  invulnerableAfterHit: 1.2,
  invulnerableAfterRespawn: 1.5,
  respawnDelay: 2,
  /**
   * His dash (owner, 21 ottobre 2026: "più graduale, un po' limitato… la barra stamina"): for `duration` seconds he
   * pushes along his aim at `accel` (u/s²) up to `speed`, then eases back to his pace at `settle` per second.
   * Each dash costs one of `dashes` of his stamina, refilled in `regenSeconds`; emptied, no dash until it is full
   * again, `exhaustedSeconds` later (systems/diverStamina.ts). Tuning.
   */
  dash: {
    speed: 100,
    accel: 260,
    duration: 0.45,
    cooldown: 0.9,
    drag: 0.6,
    settle: 2.5,
    dashes: 4,
    regenSeconds: 14,
    exhaustedSeconds: 22,
  },
  /**
   * Sprinting costs air (owner, 4 ottobre: the dash was spammed): each dash, and every second of holding the sprint
   * while riding. Riding a whale it is the whale's air. Tuning.
   */
  dashAir: 3,
  sprintAirPerSec: 1.5,
  oxygen: {
    drainBase: 1, // per second near the surface
    drainDepthExtra: 0.9, // extra per second at full depth
    fullDepthY: 1250, // world y where the extra drain is complete
    surfaceRefill: 30, // per second while at the surface
    surfaceBand: 10, // units below the surface that count as "at the surface"
    lowFraction: 0.25, // warning below this
    chokeInterval: 1.6, // with no air, lose a heart every this many seconds
  },
  bubbleEvery: [0.4, 0.9] as [number, number], // seconds between breath bubbles
  /**
   * At the surface (systems/floatSurface.ts; owner, 20 ottobre: no invisible wall, floating like the beasts): within
   * `band` units of the wave over him his push up fades and the water slows him (`drag` per second); he floats with
   * his middle `rest` units under the wave, held there by a `spring` (per second², per unit). Tuning.
   */
  float: { band: 16, rest: 2, drag: 5, spring: 60 },
};

/**
 * Pressure (owner, 4 ottobre): deeper than your suit (or your submarine) allows, a pressure bar empties instead of
 * the air; empty, it hurts you (or the hull) until you go back up. It also holds while riding: no beast takes you
 * below what your suit can stand. Bar 0..1. Tuning.
 */
export const PRESSURE = {
  drainPerSec: 0.08, // as soon as you pass the limit…
  drainPerMetre: 0.006, // …plus this much more per second for every metre beyond it
  refillPerSec: 0.25, // back within the limit
  hurtEvery: 2, // seconds between hearts lost (or hull damage) with the bar empty
  hullDamage: 6, // a submarine with its bar empty loses this much hull each time
};

export const HARPOON = {
  speed: 540, // a speargun: fast and straight (tuning)
  returnSpeed: 800, // the line reels back quickly
  range: 150,
  catchRadius: 9, // along the whole stretch it flew this step (owner, 15 ottobre: it went through fish; was 6)
  /** A fish or a beast this close to the line of the shot (degrees) pulls it gently onto itself. Tuning. */
  assistDeg: 6,
  backInHandRadius: 9, // the shot is back in the diver's hand within this distance
  muzzleOffset: 6,
  aimDotsFrom: 14,
  aimDotsTo: 70,
  // cooldown and damage come from WEAPONS ('arpione') in world.ts
};

export const SARDINE = {
  perSchool: 14,
  lengthUnits: 5,
  schoolSpread: [16, 9] as [number, number], // offset of each fish around the school centre
  schoolSpeed: 20,
  schoolRetarget: [5, 9] as [number, number], // seconds
  swimSpeed: 36,
  fleeRadius: 42,
  fleeSpeed: 86,
  fleeDistance: 50, // how far ahead of the threat a fleeing sardine aims
  /** Once scared it calms down only this far out (× fleeRadius): no back and forth at the edge (owner, 15 ottobre:
   *  the small fish moved oddly around a diver standing still). */
  calmFactor: 1.7,
  steer: 3,
  radius: 2,
  respawnSeconds: 20,
  seenRadius: 80, // first time a sardine is this close it is added to the bestiary
  simRange: 420, // units: fish farther than this from you (out of sight) only follow their school, no collisions
};

export const CAMERA = {
  viewHeightUnits: 130, // how much sea is visible vertically (was 160: small beasts were too small; owner, 3 ottobre)
  lookAhead: 20, // looks ahead in the direction the diver faces
  follow: 5, // how fast the camera catches up
  /** ms of the fade from dark when the view cuts between the helm and you (owner, 5 ottobre: a cut, never a glide). */
  cutFadeMs: 260,
  minY: -60, // can peek above the surface
  maxDpr: 2, // render resolution cap (device pixel ratio)
};

/** Darkness overlay: alpha by depth in metres, lamp cone and halo. */
export const LIGHT = {
  darknessByDepthM: [
    [0, 0.2],
    [30, 0.5],
    [80, 0.8],
    [150, 0.93],
    [260, 0.97],
  ] as [number, number][],
  darkColor: 0x000409,
  maskScale: 0.5, // darkness mask drawn at half resolution, then smoothed
  haloRadiusDiver: 1.9, // soft light around the diver, in diver lengths (owner: softer, less of a cone)
  coneLengthView: 0.42, // lamp reach as a fraction of the view width
  coneHalfAngle: 0.8, // radians: a wide beam…
  coneSoftEdge: 1.6, // …fading to its sides (higher = narrower bright core)
  coneFalloff: 0.9, // …and towards its end
  coneOffsetDiver: 0.3, // lamp position ahead of the diver centre, in diver lengths
  warmColor: 0xffc88c,
  warmAlpha: 0.16,
  vignetteAlpha: 0.55,
};

/** Water colour by depth (world y) and the look of the sea (from the prototypes). */
export const SEA = {
  waterByY: [
    [24, [34, 88, 104]],
    [380, [12, 42, 58]],
    [900, [5, 20, 32]],
    [1300, [2, 8, 14]],
  ] as [number, number[]][],
  skyTop: '#0e141c',
  skyBottom: '#2a3a48',
  /** The sky fades from skyBottom at the horizon to skyTop at the top of the view, over at least this (units). */
  skyFade: 60,
  surfaceLine: 'rgba(150,200,210,0.55)',
  /**
   * The water as a filter over everything under the waves (views/waterFilter.ts; owner, 21 ottobre): each world y
   * multiplied by this colour (255 = unchanged), in bands of `band` units, the waves' band in columns of `step`.
   * Murky water moves it `murkShare` of the way to `murk`. Tuning, checked on real frames of the game.
   */
  filter: {
    // red goes first in real water: less of it from the first metres (checked on frames of the game, 21 ottobre)
    byY: [
      [24, [196, 228, 238]],
      [60, [168, 208, 224]],
      [160, [138, 186, 206]],
      [400, [112, 160, 186]],
      [900, [88, 132, 158]],
    ] as [number, number[]][],
    murk: [150, 140, 100] as [number, number, number],
    murkShare: 0.6,
    band: 5,
    step: 4,
  },
  /**
   * The light shafts from the surface (views/seaRays.ts, seaLight.ts; owner, 21 ottobre: "realistici"): `count` soft
   * shafts `width` shares of the screen wide, leaning `tilt` radians and swaying `sway`, drifting `drift` px/s and
   * sliding `parallax` of the camera, `alpha` at their brightest, gone `fadeY` units down; in front of the world a
   * copy at `frontShare` of it. Tuning.
   */
  lightRays: {
    count: 8,
    alpha: 0.42,
    fadeY: 420,
    fadePower: 0.6, // < 1: they keep their light longer, then go
    murkShare: 0.6, // murky water dims them by this share of its murk
    width: [0.06, 0.18] as [number, number],
    tilt: 0.22,
    sway: 0.035,
    drift: 4,
    parallax: 0.12,
    frontShare: 0.4,
  },
  /**
   * The particles floating in the water (views/seaLight.ts; owner, 21 ottobre: "microparticelle… quando la luce
   * attraversa il mare"): far, mid and near ones (the near ones big and out of focus), `size` px at a 400 px tall
   * screen, barely seen (`alpha`) until a shaft lights them (+ `lit`). They sink `sink` px/s and sway. Tuning.
   */
  particles: {
    far: { count: 140, size: [0.7, 1.2] as [number, number], alpha: 0.14, lit: 0.8, depth: 0.25 },
    mid: { count: 70, size: [1.2, 2] as [number, number], alpha: 0.16, lit: 0.85, depth: 0.6 },
    near: { count: 10, size: [7, 16] as [number, number], alpha: 0.025, lit: 0.12, depth: 1.4 },
    sink: 5,
    sway: 6,
  },
  rockByY: [
    [300, [58, 82, 80]],
    [900, [30, 46, 58]],
    [1400, [20, 24, 32]],
  ] as [number, number[]][],
  sedimentByY: [
    [0, [150, 138, 98]],
    [420, [72, 98, 104]],
    [1050, [92, 76, 50]],
  ] as [number, number[]][],
  iceTint: [0, 6, 16] as [number, number, number], // r, g, b added east of ICE.xMin: colder rock
  bone: [200, 188, 156] as [number, number, number],
  ice: [168, 206, 226] as [number, number, number],
  // the sunken temples (tappa 14): carved blocks of green-grey stone, gates of darker stone with bronze bands
  temple: { stone: [92, 104, 96] as [number, number, number], gate: [70, 62, 50] as [number, number, number], block: [32, 16], mortar: 1.4 },
  far: { baseY: 300, parallax: 0.3 }, // their colours and shapes: data/seaLooks.ts
  mid: { baseY: 330, parallax: 0.6 },
  kelpBack: '#16473a',
  kelpFront: '#0a1a14',
};

/** Terrain baking: chunks are painted on demand around the camera. */
export const TERRAIN = {
  chunkUnits: 128, // small chunks: quick to paint (v0.3.1 performance)
  texelsPerUnit: 2.5,
  cacheSize: 44, // chunks kept in memory (~18 MB)
  paintBudgetMs: 4, // time per frame for painting chunks ahead of the camera
  prefetchChunks: 1, // ring of chunks painted ahead around the screen
  edgeSoftness: 0.12, // anti-aliased rock edge width (field units)
  shadeRadius: 6, // units: how far rock darkens away from its edge
};

/** Saving. */
export const SAVE = {
  storageKey: 'leviatano-save', // the single save before the list of games (moved into it, systems/save/slots.ts)
  autosaveSeconds: 10,
};

/** The list of games of the title menu (owner, 19 ottobre 2026). */
export const SLOTS = {
  indexKey: 'leviatano-partite',
  keyPrefix: 'leviatano-partita-',
  defaultName: 'Partita',
  previousName: 'Partita precedente',
  brokenName: 'Non leggibile',
  maxNameLength: 24,
  /** About what a phone's browser keeps for one site (5 MB); the menu warns past `warnAt` of it. */
  storageBytes: 5_000_000,
  warnAt: 0.8,
};

/** After the opening screen's tap, the title menu ignores taps this long (owner, 23 ottobre 2026: the tap went
 *  through and opened "Nuova partita"). Tuning. */
export const SPLASH = { guardMs: 400 };

/**
 * The arrow to your ship (owner, 21 ottobre 2026: "un indicatore senza metri o profondità… la direzione per ritrovare
 * la barca"): shown when the ship (or your harbour) is off the screen, on the screen's edge `edge` (share of its
 * size) in from it. Tuning.
 */
export const SHIP_POINTER = { edge: 0.08 };
