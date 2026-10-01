// Leviatano — the diver, the harpoon, camera, light and look of the sea (tappa 1).
// Speeds are in world units per second (u/s); 6 u = 1 m. Values marked "tuning" are a first pass.

export const DIVER = {
  lengthUnits: 12, // drawn length (= RENDER.diverLengthM)
  radius: 4, // collision radius
  maxHp: 5, // hearts (suits add SuitDef.hpBonus later)
  maxO2: 60, // seconds of air at the surface rate
  accel: 270,
  maxSpeed: 64, // tuning (× SuitDef.speedMult)
  drag: 3.2,
  sinkWhenIdle: 10, // slow sinking when not swimming
  aimTurnRate: 10,
  invulnerableAfterHit: 1.2,
  invulnerableAfterRespawn: 1.5,
  respawnDelay: 2,
  dash: { speed: 150, duration: 0.25, cooldown: 0.8, drag: 0.6 },
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
};

export const HARPOON = {
  speed: 540, // a speargun: fast and straight (tuning)
  returnSpeed: 800, // the line reels back quickly
  range: 150,
  catchRadius: 6,
  backInHandRadius: 9, // the shot is back in the diver's hand within this distance
  muzzleOffset: 6,
  aimDotsFrom: 14,
  aimDotsTo: 70,
  // cooldown and damage come from WEAPONS ('arpione') in world.ts
};

export const SARDINE = {
  perSchool: 12,
  lengthUnits: 5,
  schoolSpread: [16, 9] as [number, number], // offset of each fish around the school centre
  schoolSpeed: 20,
  schoolRetarget: [5, 9] as [number, number], // seconds
  swimSpeed: 36,
  fleeRadius: 42,
  fleeSpeed: 86,
  fleeDistance: 50, // how far ahead of the threat a fleeing sardine aims
  steer: 3,
  radius: 2,
  respawnSeconds: 30,
  seenRadius: 80, // first time a sardine is this close it is added to the bestiary
};

export const CAMERA = {
  viewHeightUnits: 160, // how much sea is visible vertically: "telecamera lontana" (tuning)
  lookAhead: 20, // looks ahead in the direction the diver faces
  follow: 5, // how fast the camera catches up
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
  haloRadiusDiver: 1.1, // soft light around the diver, in diver lengths
  coneLengthView: 0.42, // lamp reach as a fraction of the view width
  coneHalfAngle: 0.42, // radians
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
  surfaceLine: 'rgba(150,200,210,0.55)',
  lightRays: { count: 6, alpha: 0.06, fadeY: 420 },
  snow: { count: 160, alpha: 0.5 },
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
  far: { baseY: 300, parallax: 0.3, top: '#0b2531', bottom: '#04111a' },
  mid: { baseY: 330, parallax: 0.6, top: '#0f2a33', bottom: '#050e13' },
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
  storageKey: 'leviatano-save',
  autosaveSeconds: 10,
};
