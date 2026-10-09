// Leviatano — sound (synthesized in code: no audio files, works offline, no licences).
// The sea: a low muffled rumble that gets darker with depth, bubbles while you swim; the engines and the sonar.
// The music (open sea, battles) is in data/music.ts. Values are tuning: change them here.

export const AUDIO = {
  master: 0.7,
  storageKey: 'leviatano-suono', // per device: '0' = muted
  fade: 0.6, // seconds to cross between the sea and a battle
};

export const SEA_SOUND = {
  rumble: { volume: 0.22, cutoffSurface: 520, cutoffDeep: 140, deepM: 300 }, // low-passed brown noise
  swell: { periodS: 9, depth: 0.35 }, // slow breathing of the rumble
  bubbles: {
    volume: 0.09,
    perSecondAtFullSpeed: 6, // while swimming at top speed
    dashBurst: 7, // bubbles at once when you dash
    freq: [500, 1400] as [number, number], // each bubble rises from a random pitch in this range
    rise: 1.8, // × its pitch at the end of the bubble
    seconds: 0.07,
  },
};

/** Engines and sonar (owner, 5 ottobre): a deep diesel throb for the ship, a whining motor for the submarine,
 *  louder with the throttle; the sonar's ping while it is on. */
export const ENGINE_SOUND = {
  /** hearRange: units from the ship where its running engine can no longer be heard (owner, 8 ottobre). */
  ship: {
    freq: [38, 62] as [number, number],
    volume: [0.05, 0.16] as [number, number],
    cutoff: 260,
    throbHz: 6,
    hearRange: 500,
  },
  sub: { freq: [95, 170] as [number, number], volume: [0.03, 0.09] as [number, number], cutoff: 700 },
  /** The ship's engine starting and stopping (owner, 8 ottobre): pitch range (Hz), length, coughs of the starter. */
  startStop: { freq: [22, 60] as [number, number], seconds: 1.4, volume: 0.22, coughs: 3, coughGap: 0.16 },
  /** Gliding from one level to the next (seconds). */
  glide: 0.4,
  ping: { freq: 1250, seconds: 0.9, volume: 0.12, echoDelay: 0.42, echoGain: 0.35 },
};
