// The battle tune: four bars looped (data/audio.ts), scheduled a little ahead of time on the audio clock so
// it never stutters: bass, arpeggio, lead melody and synthesized drums.
import { BATTLE_MUSIC, noteHz } from '../data/audio';

type Voice = typeof BATTLE_MUSIC.bass & { cutoff?: number };

export class BattleMusic {
  private readonly out: GainNode;
  private readonly noise: AudioBuffer;
  private timer: number | null = null;
  private step = 0;
  private nextAt = 0;

  constructor(
    private readonly ctx: AudioContext,
    dest: AudioNode,
  ) {
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(dest);
    this.noise = whiteNoise(ctx, 0.5);
  }

  play(at: number): void {
    this.out.gain.cancelScheduledValues(at);
    this.out.gain.setValueAtTime(BATTLE_MUSIC.volume, at);
    this.step = 0;
    this.nextAt = at + 0.05;
    if (this.timer === null) this.timer = window.setInterval(() => this.schedule(), 25);
  }

  stop(at: number, fade: number): void {
    this.out.gain.cancelScheduledValues(at);
    this.out.gain.setTargetAtTime(0, at, fade / 3);
    window.setTimeout(() => {
      if (this.timer !== null) window.clearInterval(this.timer);
      this.timer = null;
    }, fade * 1000);
  }

  private schedule(): void {
    const stepS = 60 / BATTLE_MUSIC.bpm / 4;
    while (this.nextAt < this.ctx.currentTime + BATTLE_MUSIC.lookahead) {
      const bar = Math.floor(this.step / 16) % BATTLE_MUSIC.bass.pattern.length;
      const s = this.step % 16;
      this.note(BATTLE_MUSIC.bass, bar, s, stepS);
      this.note(BATTLE_MUSIC.arp, bar, s, stepS);
      this.note(BATTLE_MUSIC.lead, bar, s, stepS);
      const hit = BATTLE_MUSIC.drums.pattern[bar]![s];
      if (hit === 'k') this.kick(this.nextAt);
      if (hit === 's') this.snare(this.nextAt);
      if (hit === 'h') this.hat(this.nextAt);
      this.nextAt += stepS;
      this.step++;
    }
  }

  private note(v: Voice, bar: number, s: number, stepS: number): void {
    const n = v.pattern[bar]![s];
    if (n === null || n === undefined) return;
    const at = this.nextAt;
    const len = stepS * v.length;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = v.wave;
    osc.frequency.value = noteHz(n);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(v.volume, at + 0.005);
    g.gain.setTargetAtTime(v.volume * 0.6, at + 0.02, 0.05);
    g.gain.linearRampToValueAtTime(0, at + len);
    let src: AudioNode = osc;
    if (v.cutoff) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = v.cutoff;
      osc.connect(f);
      src = f;
    }
    src.connect(g).connect(this.out);
    osc.start(at);
    osc.stop(at + len + 0.02);
  }

  private kick(at: number): void {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.setValueAtTime(140, at);
    osc.frequency.exponentialRampToValueAtTime(45, at + 0.12);
    g.gain.setValueAtTime(BATTLE_MUSIC.drums.kick, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.18);
    osc.connect(g).connect(this.out);
    osc.start(at);
    osc.stop(at + 0.2);
  }

  private snare(at: number): void {
    this.noiseHit(at, BATTLE_MUSIC.drums.snare, 0.14, 'bandpass', 1800);
  }

  private hat(at: number): void {
    this.noiseHit(at, BATTLE_MUSIC.drums.hat, 0.04, 'highpass', 7000);
  }

  private noiseHit(at: number, vol: number, len: number, type: BiquadFilterType, freq: number): void {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + len);
    src.connect(f).connect(g).connect(this.out);
    src.start(at);
    src.stop(at + len + 0.02);
  }
}

function whiteNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}
