// The shape of a big beast's body this frame, along its spine (no Phaser: beastView.ts draws it, tests check it).
// Sharks and fish swing the tail sideways, shortening in perspective; whales and dolphins beat it up and down;
// serpents and eels carry one wave down the whole body (owner, 15 ottobre: Folgore stretched and shrank); wings that
// beat (the manta) stretch their strips up and down in turn.
import { BEAST_SPRITE } from '../data/beasts';

const { frameW: IW, segments: N, whaleWave, serpentWave } = BEAST_SPRITE;
const SEG = IW / N;

export interface SwimPoseIn {
  pitch: number;
  pitchV: number;
  phase: number;
  whale?: boolean;
  serpent?: boolean;
}

/** The spine's points (head first), the angle at each and each piece's length, in picture pixels. */
export function spineOf(p: SwimPoseIn): { pts: [number, number][]; ang: number[]; lens: number[] } {
  const bend = Math.max(-1.2, Math.min(1.2, p.pitchV * 0.35));
  const pts: [number, number][] = [];
  const ang: number[] = [];
  const lens: number[] = [];
  let px = 0;
  let py = 0;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    let a: number;
    let len: number;
    if (p.serpent) {
      // one wave down the whole body, every piece its full length: never stretching or shrinking, up or down
      const env = serpentWave.head + (1 - serpentWave.head) * u;
      a =
        p.pitch +
        bend * u * 0.5 +
        serpentWave.amp * env * Math.sin(p.phase - u * serpentWave.waves * Math.PI);
      len = SEG;
    } else if (p.whale) {
      // the tail beats up and down, the thick front of the body stays whole
      const tail = Math.pow(Math.max(0, (u - whaleWave.from) / (1 - whaleWave.from)), 1.6);
      a = p.pitch + bend * u * u * 0.9 + whaleWave.amp * tail * Math.sin(p.phase - u * whaleWave.waves);
      len = SEG;
    } else {
      // the tail swings sideways, shortening in perspective; with wings the body barely swings (they beat instead)
      const env = Math.pow(Math.max(0, (u - 0.35) / 0.65), 1.5);
      const th = 1.05 * env * Math.sin(p.phase - u * 2.2);
      a = p.pitch + bend * u * u * 0.9 + 0.05 * env * Math.sin(p.phase - u * 2.2 + 1.2);
      len = SEG * (0.62 + 0.38 * Math.cos(th));
    }
    pts.push([px, py]);
    ang.push(a);
    lens.push(len);
    if (i < N) {
      px -= Math.cos(a) * len;
      py -= Math.sin(a) * len;
    }
  }
  return { pts, ang, lens };
}
