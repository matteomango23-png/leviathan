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
  /** Extra darkness on the whole screen at full night, even at the surface (added to the depth's). */
  darkness: 0.66,
  /** The moon takes back this much of it near the surface (fading to nothing at `moonDepthM`). */
  moonLight: 0.12,
  moonDepthM: 40,
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
