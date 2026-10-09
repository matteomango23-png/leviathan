// Leviatano — music, synthesized in code (audio/seaMusic.ts, audio/battleMusic.ts). Both pieces are our own
// compositions (owner, 9 ottobre 2026): they borrow a mood, never a tune.
// - The open sea: a slow sea dirge in D minor, 3/4, sung by a low male choir with a bass voice on the melody, over
//   a drone and a far drum, in a long cathedral echo. Soft: it plays under the sea and the engines.
// - Battles: a menacing ostinato of two notes a semitone apart in the low strings that closes in (the feeling of a
//   shark film), with brass chords, timpani and a high string tremolo.
// Notes are semitones from A3 (220 Hz). Values are tuning: change them here.

/** Frequency of a note given in semitones from A3. */
export const noteHz = (semitones: number): number => 220 * Math.pow(2, semitones / 12);

// ---------------------------------------------------------------------------------------------------------------
// The open sea

/** The chords, low to high: the bass voice first. */
const CHORDS = {
  Dm: [-19, -12, -7, -4],
  F: [-16, -9, -4, 0],
  Gm: [-14, -7, -2, 1],
  Bb: [-23, -11, -7, -4],
  C: [-21, -9, -5, -2],
  A: [-24, -12, -8, -5],
} as const;
export type ChordName = keyof typeof CHORDS;

/** A melody note: [semitone or null for a rest, beats]. Each bar's notes add up to its 3 beats. */
export type Sung = readonly [number | null, number];

/** Sixteen bars: the chord of each bar and the melody over it. */
const SEA_BARS: { chord: ChordName; melody: Sung[] }[] = [
  { chord: 'Dm', melody: [[0, 2], [-4, 1]] },
  { chord: 'Dm', melody: [[-7, 3]] },
  { chord: 'Bb', melody: [[-4, 1], [-2, 1], [0, 1]] },
  { chord: 'C', melody: [[-2, 2], [-5, 1]] },
  { chord: 'Dm', melody: [[-4, 1.5], [-5, 0.5], [-7, 1]] },
  { chord: 'Gm', melody: [[1, 2], [0, 1]] },
  { chord: 'A', melody: [[0, 1], [4, 2]] },
  { chord: 'A', melody: [[0, 2], [null, 1]] },
  { chord: 'Dm', melody: [[5, 2], [3, 1]] },
  { chord: 'F', melody: [[0, 3]] },
  { chord: 'C', melody: [[-2, 1], [0, 1], [-2, 1]] },
  { chord: 'Dm', melody: [[-4, 2], [-7, 1]] },
  { chord: 'Gm', melody: [[-2, 1.5], [0, 0.5], [1, 1]] },
  { chord: 'Dm', melody: [[0, 2], [-4, 1]] },
  { chord: 'A', melody: [[-5, 2], [-8, 1]] },
  { chord: 'Dm', melody: [[-7, 3]] },
];

/** A sung voice: detuned sawtooths through the formant filters of a vowel ([Hz, gain]), with a slow vibrato. */
export interface VoiceSpec {
  volume: number;
  attack: number;
  release: number;
  formants: readonly (readonly [number, number])[];
  detuneCents: number;
  vibratoHz: number;
  vibratoCents: number;
}

export const SEA_MUSIC = {
  /** It starts beyond this far from the coast (owner: "about a kilometre"; just past Porto Fango, 1 km out, so the
   *  harbour stays quiet) and stops back under `offKm` (no flicker at the line). */
  fromKm: 1.25,
  offKm: 1.15,
  volume: 0.2,
  fadeIn: 8,
  fadeOut: 5,
  bpm: 54,
  beatsPerBar: 3,
  bars: SEA_BARS,
  chords: CHORDS,
  /** The melody sings every other time round: the choir alone in between (it does not tire). */
  melodyEvery: 2,
  /** Closed-mouth "oo" of the choir. */
  choir: {
    volume: 0.05,
    attack: 1.1,
    release: 1.8,
    formants: [
      [300, 1],
      [870, 0.35],
      [2250, 0.08],
    ],
    detuneCents: 9,
    vibratoHz: 4.4,
    vibratoCents: 6,
  } as VoiceSpec,
  /** The bass voice on the melody, an open "ah". */
  lead: {
    volume: 0.09,
    attack: 0.22,
    release: 0.9,
    formants: [
      [650, 1],
      [1080, 0.5],
      [2650, 0.1],
    ],
    detuneCents: 5,
    vibratoHz: 5.1,
    vibratoCents: 16,
  } as VoiceSpec,
  /** The drone under everything (D2 and A2), breathing slowly. */
  drone: { notes: [-19, -12], volume: 0.1, cutoff: 260, breathS: 11, breathDepth: 0.4 },
  /** A far, deep drum on these bars. */
  drum: { bars: [0, 8], freq: [70, 42] as [number, number], volume: 0.35, seconds: 2.4 },
  /** The echo of a sunken cathedral. */
  reverb: { seconds: 4.5, wet: 0.6, dry: 0.55, cutoff: 2400 },
  /** Seconds scheduled in advance; how often the scheduler looks. */
  lookahead: 1.5,
  tickMs: 250,
};

// ---------------------------------------------------------------------------------------------------------------
// Battles: 16 steps a bar (sixteenth notes). An intro played once that closes in, then a loop.

/** Ostinato: 'a' the low note, 'b' a semitone above, '.' nothing. */
type Ostinato = string;
/** Timpani: 't' a hit, 'r' a softer one (a roll), '.' nothing. */
type Timpani = string;
/** Brass chords on some steps of the bar. */
type Brass = { step: number; notes: readonly number[] }[];

interface BattleBar {
  ostinato: Ostinato;
  timpani: Timpani;
  brass: Brass;
  /** A high note held the whole bar, trembling (null: none). */
  high: number | null;
}

const Fm = [-4, -1, 3];
const Fsdim = [-3, 0, 3];
const Db = [-8, -4, -1];
const C = [-9, -5, -2];

const INTRO: BattleBar[] = [
  { ostinato: 'a.......b.......', timpani: 't...............', brass: [], high: null },
  { ostinato: 'a.....b.....a...', timpani: '................', brass: [], high: null },
  { ostinato: 'a...b...a...b...', timpani: 't.......t.......', brass: [], high: null },
  { ostinato: 'a..b..a..b..a.b.', timpani: 't.......t...t.r.', brass: [], high: 16 },
];
const LOOP: BattleBar[] = [
  { ostinato: 'a.b.a.b.a.b.a.b.', timpani: 't...............', brass: [{ step: 0, notes: Fm }], high: null },
  { ostinato: 'a.b.a.b.a.b.a.b.', timpani: '........t.......', brass: [], high: null },
  { ostinato: 'a.b.a.b.a.b.a.b.', timpani: 't...............', brass: [{ step: 0, notes: Fsdim }], high: null },
  {
    ostinato: 'a.b.a.b.abababab',
    timpani: 't.......t...r.r.',
    brass: [
      { step: 8, notes: Fm },
      { step: 12, notes: Fsdim },
    ],
    high: null,
  },
  { ostinato: 'a.b.a.b.a.b.a.b.', timpani: 't...............', brass: [{ step: 0, notes: Db }], high: 15 },
  { ostinato: 'a.b.a.b.a.b.a.b.', timpani: '........t.......', brass: [], high: 16 },
  { ostinato: 'a.b.a.b.a.b.a.b.', timpani: 't.......t.......', brass: [{ step: 0, notes: C }], high: 15 },
  {
    ostinato: 'abababababababab',
    timpani: 't...t...r.r.r.r.',
    brass: [
      { step: 0, notes: C },
      { step: 8, notes: Fm },
      { step: 12, notes: Fsdim },
    ],
    high: 16,
  },
];

export const BATTLE_MUSIC = {
  bpm: 132,
  volume: 0.34,
  intro: INTRO,
  loop: LOOP,
  /** Low strings: F2 and F#2, a sine an octave under for weight. */
  ostinato: { low: -16, high: -15, wave: 'sawtooth' as OscillatorType, volume: 0.3, length: 1.7, cutoff: 700, sub: 0.6 },
  /** Brass: a filter that opens on the attack (the blare), held for `length` steps. */
  brass: { volume: 0.07, length: 6, cutoff: [450, 1700] as [number, number] },
  timpani: { freq: [95, 58] as [number, number], volume: 0.55, roll: 0.3, seconds: 0.9 },
  high: { volume: 0.03, tremoloHz: 11 },
  lookahead: 0.12,
};
