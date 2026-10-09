// The weather heard (owner, 9 ottobre 2026: storms with thunder): the hiss of the rain, louder the harder it falls
// and muffled under water, and thunder a moment after each flash, a crack and a long low rumble. Synthesized.
import { STORM_SOUND } from '../data/audio';

export class StormSound {
  private readonly rain: GainNode;
  private readonly out: GainNode;
  private readonly noise: AudioBuffer;
  private rainLevel = 0;

  constructor(
    private readonly ctx: AudioContext,
    dest: AudioNode,
  ) {
    this.out = ctx.createGain();
    this.out.connect(dest);
    this.noise = noiseBuffer(ctx, 3);
    // the rain: white noise, bright, looping
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = STORM_SOUND.rain.freq;
    band.Q.value = 0.6;
    this.rain = ctx.createGain();
    this.rain.gain.value = 0;
    src.connect(band).connect(this.rain).connect(this.out);
    src.start();
  }

  /** @param level 0 … 1: how hard it rains where you hear it (0 deep under water) */
  setRain(level: number): void {
    if (Math.abs(level - this.rainLevel) < 0.01) return;
    this.rainLevel = level;
    this.rain.gain.setTargetAtTime(level * STORM_SOUND.rain.volume, this.ctx.currentTime, 0.4);
  }

  /** A thunder `delay` seconds from now; `near` 0 … 1 (under water it is far and dull). */
  thunder(delay: number, near: number): void {
    const T = STORM_SOUND.thunder;
    const at = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const low = this.ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.setValueAtTime(T.crackHz * (0.4 + 0.6 * near), at);
    low.frequency.exponentialRampToValueAtTime(T.rumbleHz, at + 0.6);
    const g = this.ctx.createGain();
    const v = T.volume * (0.35 + 0.65 * near);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(v, at + 0.03);
    g.gain.setTargetAtTime(v * 0.45, at + 0.2, 0.3);
    g.gain.setTargetAtTime(0, at + 0.9, T.seconds / 3);
    src.connect(low).connect(g).connect(this.out);
    src.start(at, Math.random() * 1.5);
    src.stop(at + T.seconds + 0.5);
  }
}

function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}
