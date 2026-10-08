// Leviatano — sound (first pass, synthesized in code: no audio files, works offline, no licences).
// The sea: a low muffled rumble that gets darker with depth, bubbles while you swim. Battles: a short
// looping tune in the spirit of the Pokémon battle themes (minor key, fast, bass + lead + arpeggio + drums).
// Values are tuning: change them here.

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

/** Semitones from A3 (220 Hz); null = rest. Each pattern is 16 steps (one bar of sixteenth notes). */
type Steps = (number | null)[];

// i – VI – VII – V in A minor (Am, F, G, E): four bars, then it loops
const BASS: Steps[] = [
  [-12, null, -12, 0, -12, null, -12, 0, -12, null, -12, 0, -12, -12, 0, -12],
  [-16, null, -16, -4, -16, null, -16, -4, -16, null, -16, -4, -16, -16, -4, -16],
  [-14, null, -14, -2, -14, null, -14, -2, -14, null, -14, -2, -14, -14, -2, -14],
  [-17, null, -17, -5, -17, null, -17, -5, -17, -5, -17, -5, -17, -5, -6, -5],
];
const ARP: Steps[] = [
  [12, 15, 19, 24, 12, 15, 19, 24, 12, 15, 19, 24, 12, 15, 19, 24],
  [8, 12, 15, 20, 8, 12, 15, 20, 8, 12, 15, 20, 8, 12, 15, 20],
  [10, 14, 17, 22, 10, 14, 17, 22, 10, 14, 17, 22, 10, 14, 17, 22],
  [7, 11, 14, 19, 7, 11, 14, 19, 7, 11, 14, 19, 7, 11, 14, 19],
];
const LEAD: Steps[] = [
  [24, null, null, 27, null, 26, 24, null, 22, null, 24, null, 19, null, null, null],
  [20, null, null, 24, null, 22, 20, null, 19, null, 20, null, 15, null, 17, null],
  [22, null, null, 26, null, 24, 22, null, 19, null, 22, null, 26, null, 29, null],
  [31, null, 30, null, 31, null, 26, null, 23, null, 26, null, 23, null, null, null],
];
// drums: k = kick, s = snare, h = hi-hat, . = nothing
const DRUMS = ['k.h.s.h.k.khs.hh', 'k.h.s.h.k.khs.hh', 'k.h.s.h.k.khs.hh', 'k.h.s.hkk.ks.sss'];

export const BATTLE_MUSIC = {
  bpm: 152,
  volume: 0.32,
  bass: { pattern: BASS, wave: 'triangle' as OscillatorType, volume: 0.5, length: 0.85 }, // length × step
  arp: { pattern: ARP, wave: 'square' as OscillatorType, volume: 0.07, length: 0.5 },
  lead: { pattern: LEAD, wave: 'sawtooth' as OscillatorType, volume: 0.16, length: 1.6, cutoff: 2600 },
  drums: { pattern: DRUMS, kick: 0.7, snare: 0.28, hat: 0.08 },
  lookahead: 0.12, // seconds scheduled in advance
};

/** Frequency of a note given in semitones from A3. */
export const noteHz = (semitones: number): number => 220 * Math.pow(2, semitones / 12);
