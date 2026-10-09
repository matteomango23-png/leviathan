// Leviatano — the state of the sea (owner, 9 ottobre 2026: "il mare deve essere più vivo"). Waves that rise with the
// weather, currents that slow you (the small boats most), storms that wear the small boats' hulls, water that turns
// murky in cycles and in bad weather. Values are tuning: change them here.

export const SEA_STATE = {
  /** The waves: their height (units) is `amp × waves²` (waves: the weather's, 1 calm … 3.2 storm), two trains of
   *  waves of these lengths (units) and speeds (units/s), the first the bigger. */
  waves: { amp: 2, long: { length: 160, speed: 26, share: 0.65 }, short: { length: 60, speed: 15, share: 0.35 } },
  /** How a vehicle feels them: its heave and pitch follow the waves under its bow, middle and stern (a long ship
   *  averages the short waves out, a jet ski rides every one); pitch at most this (radians). */
  pitchMax: 0.35,
  /** The currents: at full storm (the weather's wind 1) the top speed drops by this share. */
  current: { boat: 0.45, ship: 0.15, diver: 0.2, diverDepthM: 30 },
  /** Wind below this counts as no current. */
  calmWind: 0.2,
  /** The small boats in rough seas: their hull wears out (points per second at full storm) when they go faster
   *  than `fast` of their top speed, from waves of `from` on (the weather's waves). */
  boatWear: { perSecond: 1.5, fast: 0.5, from: 1.8 },
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
