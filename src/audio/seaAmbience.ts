// The sound of the sea: a muffled low rumble (brown noise through a low-pass filter) that slowly breathes and
// gets darker the deeper you go, and small rising bubbles while you swim (a burst when you dash).
import { SEA_SOUND } from '../data/audio';

/** What the sea sounds depend on, each frame. */
export interface SeaMoment {
  /** 0 = still, 1 = top swimming speed. */
  speed: number;
  depthM: number;
  /** True on the frame you dash. */
  dash: boolean;
}

export class SeaAmbience {
  private readonly out: GainNode;
  private readonly rumbleGain: GainNode;
  private readonly filter: BiquadFilterNode;
  private bubbleDebt = 0;
  private time = 0;

  constructor(
    private readonly ctx: AudioContext,
    dest: AudioNode,
  ) {
    this.out = ctx.createGain();
    this.out.connect(dest);
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = SEA_SOUND.rumble.cutoffSurface;
    this.rumbleGain = ctx.createGain();
    this.rumbleGain.gain.value = SEA_SOUND.rumble.volume;
    const noise = ctx.createBufferSource();
    noise.buffer = brownNoise(ctx, 4);
    noise.loop = true;
    noise.connect(this.filter).connect(this.rumbleGain).connect(this.out);
    noise.start();
  }

  fadeTo(level: number, at: number, seconds: number): void {
    this.out.gain.cancelScheduledValues(at);
    this.out.gain.setTargetAtTime(level, at, seconds / 3);
  }

  update(m: SeaMoment, dt: number): void {
    const r = SEA_SOUND.rumble;
    const t = this.ctx.currentTime;
    this.time += dt;
    const deep = Math.min(1, Math.max(0, m.depthM / r.deepM));
    this.filter.frequency.setTargetAtTime(r.cutoffSurface + (r.cutoffDeep - r.cutoffSurface) * deep, t, 0.5);
    const swell =
      1 - SEA_SOUND.swell.depth * (0.5 + 0.5 * Math.sin((this.time * Math.PI * 2) / SEA_SOUND.swell.periodS));
    this.rumbleGain.gain.setTargetAtTime(r.volume * swell * (1 + 0.4 * m.speed), t, 0.3);
    const b = SEA_SOUND.bubbles;
    this.bubbleDebt += m.speed * b.perSecondAtFullSpeed * dt;
    if (m.dash) this.bubbleDebt += b.dashBurst;
    let n = 0;
    while (this.bubbleDebt >= 1) {
      this.bubbleDebt -= 1;
      this.bubble(t + n * 0.03 + Math.random() * 0.05);
      n++;
    }
  }

  private bubble(at: number): void {
    const b = SEA_SOUND.bubbles;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = b.freq[0] + Math.random() * (b.freq[1] - b.freq[0]);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, at);
    osc.frequency.exponentialRampToValueAtTime(f * b.rise, at + b.seconds);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(b.volume * (0.5 + Math.random() * 0.5), at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + b.seconds);
    osc.connect(g).connect(this.out);
    osc.start(at);
    osc.stop(at + b.seconds + 0.02);
  }
}

function brownNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.5;
  }
  return buf;
}
