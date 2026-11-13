// The day and the night (lot N1, owner 13 novembre 2026): a day of about 30 minutes, 60% light and 40% dark. By
// day the sea is as it always was; by night it is dark, only the moon lights the surface a little, the hunters see
// farther and swim faster, a few species come out mostly then and the albinos are easier to meet. "Dormi" (aboard
// the still ship or at the port) runs the time fast until evening or morning; "Riposa" only heals. All tuning.

/** The cycle: its length and its phases, in fractions of it, in order from the start of dawn: dawn and day 60% (18
 *  minutes), dusk and night 40% (12 minutes). */
export const DAY = {
  cycleSeconds: 1800,
  phases: [
    { id: 'alba', name: 'Alba', share: 0.05 },
    { id: 'giorno', name: 'Giorno', share: 0.55 },
    { id: 'tramonto', name: 'Tramonto', share: 0.05 },
    { id: 'notte', name: 'Notte', share: 0.35 },
  ],
  /** A new game (or a save from before the clock) starts here: a little into the day. */
  startAt: 0.1,
  /** The clock shown: the start of dawn is this hour, the cycle is 24 hours. */
  dawnHour: 5,
} as const;

export type DayPhase = (typeof DAY.phases)[number]['id'];

/** How the night looks. */
export const NIGHT = {
  /**
   * The night's darkness, row by row by its depth (lot N1b, owner 13 novembre 2026: "la notte deve essere veramente
   * dark"; a moonlit night is about a millionth of the day's light): the sky high up and at the horizon (a little
   * lighter there, so the ship stands out black against it), the sea at its surface (moonlit), and under it black
   * within `blackByM` metres (pitch dark a few metres down: only the lamps light). Added over the day's darkness.
   */
  skyDark: 0.62,
  horizonDark: 0.45,
  /** How far over the surface (m) the sky goes from horizonDark to skyDark. */
  skyFadeM: 25,
  surfaceDark: 0.55,
  deepDark: 0.9,
  /** (owner, 13 novembre 2026: one metre down it was already pitch black) the dark grows evenly over this. */
  blackByM: 35,
  /** The water behind everything by night: near-black blue (no daytime blue where a light opens the dark). */
  water: [3, 7, 12] as [number, number, number],
  /** The water's blue filter over the world goes this share of the way to a plain grey by night: in a lamp's light
   *  things show their own colours. */
  filterShare: 0.75,
  filterNeutral: 215,
  /** The soft light round the diver shrinks by night to this share: enough to see him in the black. */
  haloMult: 0.85,
  /** Fog and rain darken by night towards this colour, by this much (no grey mist glowing in the dark). */
  fogNight: 0x0b1117,
  /** The lights of the hull light the sea round it a little (owner, 13 novembre 2026: "almeno per vedere un po'
   *  intorno"): soft light all along the hull, one every `spacing` units, `radius` each (the floodlit ships'
   *  `floodMult` wider), opening the dark by `alpha`, by night and under water. */
  hullGlow: { spacing: 26, radius: 30, alpha: 0.45, floodMult: 1.5, v: 0.75 },
  /** By night the ship's headlight is on afloat too, this long (× the lamp's), and the lamps' light is warmer. */
  shipLamp: 2.4,
  lampWarm: 0xffd27a,
  lampWarmAlpha: 0.34,
  /** The ship's lights by night (views/shipLights.ts): a row of warm portholes along the hull (shares of its
   *  picture; v of its waterline) and its red sidelight at the bow. Small and soft: they do not light the sea. */
  deckLights: {
    portholes: 5,
    from: 0.28,
    to: 0.68,
    v: 0.78,
    warm: 0xffcf8a,
    alpha: 0.9,
    size: 3.4,
    sideU: 0.86,
    sideV: 0.62,
    side: 0xff3b2e,
  },
  weatherDarken: 0.85,
  /** The sky at full night, and the warm veil of dusk and dawn over it. */
  skyTop: 0x05080f,
  skyBottom: 0x111a2b,
  duskTint: 0xd0703a,
  duskAlpha: 0.32,
  /** The far beasts are dark shapes: night adds this much to the murk the beasts are drawn with (clarity.ts). */
  silhouette: 0.7,
  /** The bioluminescent motes in the water shine more by night. */
  glowMult: 1.8,
  /** Stars: how many soft dots, how bright at full night. */
  stars: 70,
  starAlpha: 0.85,
  /** The moon: its picture's width (units), how high it climbs over the surface, its glint on the sea. */
  moonWidth: 34,
  moonRise: [40, 135] as [number, number],
  moonGlint: 0.22,
  glintColor: 0xbfd4ff,
  /** The moon's painted picture (public/world/luna.webp; none yet: only the stars and the glint). */
  moonArt: 'luna',
};

/** The beasts by night (`night` is 0 by day, 1 at full night). */
export const NIGHT_BEASTS = {
  /** An aggressive beast sees you from farther and chases faster. Its chase stays under your dash (tested). */
  sightMult: 1.5,
  speedMult: 1.25,
  /** A calm beast keeps away from you at night (it acts as a shy one). */
  calmShy: true,
  /** How much likelier an albino is at full night. */
  albinoMult: 2,
};

/** The species that come out mostly at night: their weight at full night and at full day. Only these (owner: "si
 *  ci sta ma non tutti"). */
export const NIGHT_SPECIES: Record<string, { night: number; day: number }> = {
  murena: { night: 3, day: 0.25 },
  squalo_tigre: { night: 3, day: 0.25 },
  chimera: { night: 3, day: 0.25 },
  torpedine: { night: 3, day: 0.25 },
  squalo_capopiatto: { night: 3, day: 0.25 },
  granchio_ragno: { night: 3, day: 0.25 },
};

/** Sleeping: the time runs this many times faster until evening or morning, or until you wake. */
export const SLEEP = {
  speed: 30,
  /** Where it stops by itself: the start of dusk ("fino a sera") or of dawn ("fino al mattino"). */
  targets: { sera: 'tramonto', mattino: 'alba' } as const,
  /** In the open sea (not at a port): the chance per game hour that something wakes you. */
  wakePerHour: 0.06,
  wakeReasons: ['Qualcosa ha urtato lo scafo!', 'Il vento forte ti sveglia.'],
};
