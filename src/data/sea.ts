// Leviatano — the state of the sea (owner, 9 ottobre 2026: "il mare deve essere più vivo"). Waves that rise with the
// weather, currents that slow you (the small boats most), storms that wear the small boats' hulls, water that turns
// murky in cycles and in bad weather. Values are tuning: change them here.

export const SEA_STATE = {
  /** The waves: their height (units) is `amp × waves²` (waves: the weather's, 1 calm … 3.2 storm), two trains of
   *  waves of these lengths (units) and speeds (units/s), the first the bigger. */
  waves: {
    /** Height: `swell + amp × waves²` units (waves: the weather's, 1 calm … 3.2 storm) for the whole sea: even on
     *  a still day a long low swell lifts the hulls (owner, 9 ottobre: the ship looked tied to a line). */
    swell: 3,
    amp: 2.6,
    /** A real sea is many waves at once (owner, 9 ottobre: two sines "look like a ghost"): their lengths (units),
     *  the longest the biggest; each runs at its deep-water speed √(g·length/2π), so they drift in and out of step
     *  and make groups, a big one now and then, never twice the same. Their phases are fixed (a steady sea). */
    lengths: [420, 290, 205, 150, 104, 72, 50, 34],
    /** How much bigger the longer ones are (height ∝ length^this). */
    spectrum: 0.75,
    /** Gerstner (trochoidal) shape: the water turns in circles, crests narrow and pushed forward, troughs broad;
     *  this steep in a calm sea and in a storm (0 … 1). */
    steepCalm: 0.25,
    steepStorm: 0.8,
    /** Gravity for the waves' speeds (units/s²). */
    gravity: 59,
  },
  /** How a hull rides them (systems/ride.ts): it floats on two points (this share of its length from the middle,
   *  each way) pulled down by gravity (units/s²: 9.8 m/s²) and pushed up by the water, as stiff (1/s²) and damped
   *  (1/s) as its length says, from a jet ski to a 90 m ship; speeds and pitch capped; small steps for steadiness. */
  ride: {
    gravity: 59,
    pointsAt: 0.38,
    /** A light short hull: lively, it can stand on its stern and flip; a long heavy ship: slow, it never tilts past
     *  its limit (radians). */
    small: { length: 60, k: 50, c: 2.6, pitchMax: 1.35 },
    big: { length: 540, k: 11, c: 1.5, pitchMax: 0.3 },
    pitchGain: 7,
    maxV: 150,
    /** The water's push stops growing this many times deeper than it rests (a buried bow is not shot out). */
    maxUnder: 6,
    /** Past this pitch a light hull flips over: see-through for these seconds, then set upright where it is. */
    flipAt: 1.2,
    flipSeconds: 2,
    maxStep: 1 / 120,
  },
  /** The currents: at full storm (the weather's wind 1) the top speed drops by this share. */
  current: { boat: 0.45, ship: 0.15, diver: 0.2, diverDepthM: 30 },
  /** Wind below this counts as no current. */
  calmWind: 0.2,
  /** The small boats in rough seas: their hull wears out (points per second at full storm) when they go faster
   *  than `fast` of their top speed, from waves of `from` on (the weather's waves). */
  boatWear: { perSecond: 1.5, fast: 0.5, from: 1.8 },
  /** Flipping over costs a boat this share of its whole hull. */
  capsizeDamage: 0.2,
  /** Mending a broken boat at the harbour: teeth per hull point. */
  boatRepairPerPoint: 3,
};

/** How murky the water is (owner, 9 ottobre): every stretch of sea has its own slow cycle, rough weather adds to it;
 *  at its murkiest the lamp reaches little and the beasts away from it are dark shapes. */
export const CLARITY = {
  /** Stretches of sea with their own cycle (km), its length (seconds, ± `jitter`), how murky its worst gets. */
  zoneKm: 1.5,
  periodS: 300,
  jitter: 0.3,
  cycleMax: 0.65,
  /** Murk from the weather: from its waves (1 calm … 3.2 storm) and its rain. */
  fromWaves: 0.5,
  fromRain: 0.3,
  /** From this murk on the beasts away from your lamp show as dark shapes (and this far from you, units). */
  shapesFrom: 0.55,
  shapesBeyond: 90,
  shapeTint: 0x0b0f10,
};

/** The water that answers the hulls (systems/waterColumns.ts): a row of columns this far apart, how stiff and damped,
 *  how much a column passes on to its neighbours (and how many passes a step), how the hulls push it. Tuning. */
export const COLUMNS = {
  count: 700,
  spacing: 4,
  stiffness: 6,
  damping: 0.9,
  spread: 0.25,
  passes: 4,
  passSpeed: 60,
  maxStep: 1 / 60,
  /** The bow wave: push (units/s per second) at `speedRef` units/s for the heaviest hull (`heavyLength` units). */
  bowWave: 260,
  speedRef: 160,
  heavyLength: 500,
  /** Landing faster than this (units/s downward) drives the water down. */
  slamFrom: 25,
  slam: 0.9,
};
