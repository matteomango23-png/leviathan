// The sound of each region, over the sea's rumble (data/seaLooks.ts REGION_SOUND; docs/PROPOSTA-MARE.md): the ice
// groaning under the shelf, a low grumble in the deep, the Delta's mud bubbling. (The reef's crackle of shrimps is
// gone: owner, 26 ottobre, "c'è ancora questo suono gracchiante" at 2,7 km; it was sparse clicks of noise.) Synthesized like the rest (no sound files); each fades with the region's share where two blend.
import { REGION_SOUND, SEA_LOOKS, type SeaSound } from '../data/seaLooks';
import type { LookMix } from '../systems/seaLook';

/** How much of each region sound plays at a mix of looks, 0…1. */
export function soundShares(m: LookMix): Record<SeaSound, number> {
  const out: Record<SeaSound, number> = { none: 0, reef: 0, ice: 0, deep: 0, swamp: 0 };
  out[SEA_LOOKS[m.a].sound] += 1 - m.t;
  out[SEA_LOOKS[m.b].sound] += m.t;
  return out;
}

const between = ([lo, hi]: [number, number]): number => lo + Math.random() * (hi - lo);

export class RegionSound {
  private readonly out: GainNode;
  private readonly next = { ice: 2, deep: 2, swamp: 2 };
  private dripT = 1;

  constructor(
    private readonly ctx: AudioContext,
    dest: AudioNode,
  ) {
    this.out = ctx.createGain();
    this.out.connect(dest);
  }

  update(look: LookMix, dt: number, cave = false): void {
    // inside the Gallerie: now and then a drop, echoing (lot M3)
    this.dripT -= dt;
    if (cave && this.dripT <= 0) {
      this.dripT = between(REGION_SOUND.cave.every);
      this.drip(this.ctx.currentTime);
    }
    const s = soundShares(look);
    const t = this.ctx.currentTime;
    for (const k of ['ice', 'deep', 'swamp'] as const) {
      this.next[k] -= dt;
      if (this.next[k] > 0) continue;
      this.next[k] = between(REGION_SOUND[k].every);
      if (s[k] > 0.05) this[k](t, s[k]);
    }
  }

  /** The ice groaning: a low soft tone bending up and dying away (no ticks: the old square-wave creak crackled). */
  private ice(at: number, share: number): void {
    const v = REGION_SOUND.ice.volume * share;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    const f = 70 + Math.random() * 60;
    osc.frequency.setValueAtTime(f, at);
    osc.frequency.linearRampToValueAtTime(f * 1.5, at + 1.4);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(v, at + 0.4);
    g.gain.linearRampToValueAtTime(0, at + 1.6);
    osc.connect(g).connect(this.out);
    osc.start(at);
    osc.stop(at + 1.7);
  }

  /** A deep grumble: a very low tone swelling and dying away. */
  private deep(at: number, share: number): void {
    const d = REGION_SOUND.deep;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(d.hz * (0.85 + Math.random() * 0.3), at);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(d.volume * share, at + 1.2);
    g.gain.linearRampToValueAtTime(0, at + 3.5);
    osc.connect(g).connect(this.out);
    osc.start(at);
    osc.stop(at + 3.6);
  }

  /** A drop in a cave: a short high tone falling, and two fainter echoes. */
  private drip(at: number): void {
    const v = REGION_SOUND.cave.volume;
    for (const [delay, k] of [
      [0, 1],
      [0.18, 0.4],
      [0.38, 0.18],
    ] as const) {
      const t = at + delay;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      const f = 900 + Math.random() * 500;
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.06);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(v * k, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(g).connect(this.out);
      osc.start(t);
      osc.stop(t + 0.13);
    }
  }

  /** Mud bubbling up: one to three soft blups, each a quick rising tone. */
  private swamp(at: number, share: number): void {
    const v = REGION_SOUND.swamp.volume * share;
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const t = at + i * (0.12 + Math.random() * 0.1);
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      const f = 160 + Math.random() * 90;
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 2.4, t + 0.07);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(v, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      osc.connect(g).connect(this.out);
      osc.start(t);
      osc.stop(t + 0.1);
    }
  }
}
