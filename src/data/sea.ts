// Leviatano — the state of the sea (owner, 9 ottobre 2026: "il mare deve essere più vivo"). Waves that rise with the
// weather, currents that slow you (the small boats most), storms that wear the small boats' hulls, water that turns
// murky in cycles and in bad weather. Values are tuning: change them here.

export const SEA_STATE = {
  /** The waves: their height (units) is `amp × waves²` (waves: the weather's, 1 calm … 3.2 storm), two trains of
   *  waves of these lengths (units) and speeds (units/s), the first the bigger. */
  waves: {
    amp: 2,
    long: { length: 220, speed: 30, share: 0.7 },
    short: { length: 70, speed: 16, share: 0.3 },
    /** In a storm the crests sharpen and the troughs flatten (the water turns in circles under a wave). */
    sharpness: 0.32,
  },
  /** How a hull rides them (systems/ride.ts): it floats on two points (this share of its length from the middle,
   *  each way) pulled down by gravity (units/s²: 9.8 m/s²) and pushed up by the water, as stiff (1/s²) and damped
   *  (1/s) as its length says, from a jet ski to a 90 m ship; speeds and pitch capped; small steps for steadiness. */
  ride: {
    gravity: 59,
    pointsAt: 0.38,
    /** A light short hull: lively, it can stand on its stern and flip; a long heavy ship: slow, it never tilts past
     *  its limit (radians). */
    small: { length: 60, k: 70, c: 3.2, pitchMax: 1.35 },
    big: { length: 540, k: 9, c: 2.2, pitchMax: 0.3 },
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
