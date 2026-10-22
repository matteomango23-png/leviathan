// The sound of each region, over the sea's rumble (data/seaLooks.ts REGION_SOUND; docs/PROPOSTA-MARE.md): the reef's
// crackle of shrimps, the ice creaking under the shelf, a low grumble in
// the deep. Synthesized like the rest (no sound files); each fades with the region's share where two blend.
import { REGION_SOUND, SEA_LOOKS, type SeaSound } from '../data/seaLooks';
import type { LookMix } from '../systems/seaLook';

/** How much of each region sound plays at a mix of looks, 0…1. */
export function soundShares(m: LookMix): Record<SeaSound, number> {
  const out: Record<SeaSound, number> = { none: 0, reef: 0, ice: 0, deep: 0 };
  out[SEA_LOOKS[m.a].sound] += 1 - m.t;
  out[SEA_LOOKS[m.b].sound] += m.t;
  return out;
}

const between = ([lo, hi]: [number, number]): number => lo + Math.random() * (hi - lo);

export class RegionSound {
  private readonly out: GainNode;
  private readonly reefGain: GainNode;
  private readonly next = { ice: 2, deep: 2 };

  constructor(
    private readonly ctx: AudioContext,
    dest: AudioNode,
  ) {
    this.out = ctx.createGain();
    this.out.connect(dest);
    // the crackle: sparse clicks of white noise, high-passed, always running (its volume follows the reef's share)
    this.reefGain = ctx.createGain();
    this.reefGain.gain.value = 0;
    const src = ctx.createBufferSource();
    src.buffer = crackle(ctx, 3, REGION_SOUND.reef.clicksPerSecond);
    src.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2500;
    src.connect(hp).connect(this.reefGain).connect(this.out);
    src.start();
  }

  update(look: LookMix, dt: number): void {
    const s = soundShares(look);
    const t = this.ctx.currentTime;
    this.reefGain.gain.setTargetAtTime(REGION_SOUND.reef.volume * s.reef, t, 0.8);
    for (const k of ['ice', 'deep'] as const) {
      this.next[k] -= dt;
      if (this.next[k] > 0) continue;
      this.next[k] = between(REGION_SOUND[k].every);
      if (s[k] > 0.05) this[k](t, s[k]);
    }
  }

  /** A creak: a few quick rough ticks of a low tone. */
  private ice(at: number, share: number): void {
    const v = REGION_SOUND.ice.volume * share;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    const f = 70 + Math.random() * 60;
    osc.frequency.setValueAtTime(f, at);
    osc.frequency.linearRampToValueAtTime(f * 1.6, at + 0.6);
    g.gain.setValueAtTime(0, at);
    for (let i = 0; i < 8; i++) {
      const ti = at + i * 0.07 + Math.random() * 0.03;
      g.gain.setValueAtTime(v * (0.4 + Math.random() * 0.6), ti);
      g.gain.setValueAtTime(0, ti + 0.03);
    }
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    osc.connect(lp).connect(g).connect(this.out);
    osc.start(at);
    osc.stop(at + 0.7);
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
}

/** Noise clicks scattered in silence, about `perSecond` a second. */
function crackle(ctx: AudioContext, seconds: number, perSecond: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  const clicks = Math.round(seconds * perSecond);
  for (let c = 0; c < clicks; c++) {
    const at = Math.floor(Math.random() * (d.length - 200));
    const amp = 0.3 + Math.random() * 0.7;
    for (let i = 0; i < 120; i++) d[at + i] = (Math.random() * 2 - 1) * amp * (1 - i / 120);
  }
  return buf;
}
