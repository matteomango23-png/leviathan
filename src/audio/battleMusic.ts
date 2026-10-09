// The battle music (data/music.ts): an intro that closes in, then a loop, scheduled a little ahead of time on the
// audio clock so it never stutters: the low-string ostinato, brass chords, timpani and a high trembling string.
import { BATTLE_MUSIC, noteHz } from '../data/music';

const M = BATTLE_MUSIC;

export class BattleMusic {
  private readonly out: GainNode;
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
  }

  play(at: number): void {
    this.out.gain.cancelScheduledValues(at);
    this.out.gain.setValueAtTime(M.volume, at);
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
    const stepS = 60 / M.bpm / 4;
    while (this.nextAt < this.ctx.currentTime + M.lookahead) {
      const n = Math.floor(this.step / 16);
      const bar = n < M.intro.length ? M.intro[n]! : M.loop[(n - M.intro.length) % M.loop.length]!;
      const s = this.step % 16;
      const at = this.nextAt;
      const o = bar.ostinato[s];
      if (o === 'a' || o === 'b')
        this.ostinato(at, o === 'a' ? M.ostinato.low : M.ostinato.high, stepS, o === 'a');
      const t = bar.timpani[s];
      if (t === 't' || t === 'r') this.timpani(at, t === 't' ? 1 : M.timpani.roll);
      for (const b of bar.brass) if (b.step === s) for (const note of b.notes) this.brass(at, note, stepS);
      if (s === 0 && bar.high !== null) this.high(at, bar.high, stepS * 16);
      this.nextAt += stepS;
      this.step++;
    }
  }

  /** One stroke of the low strings, with a sine an octave under; the low note a little heavier. */
  private ostinato(at: number, note: number, stepS: number, accent: boolean): void {
    const len = stepS * M.ostinato.length;
    const vol = M.ostinato.volume * (accent ? 1 : 0.8);
    const g = this.envelope(at, len, vol, 0.012);
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = M.ostinato.cutoff;
    f.connect(g);
    this.osc(M.ostinato.wave, noteHz(note), at, len, f);
    const sub = this.ctx.createGain();
    sub.gain.value = M.ostinato.sub;
    sub.connect(g);
    this.osc('sine', noteHz(note - 12), at, len, sub);
  }

  /** A brass note: the filter opens on the attack and closes again. */
  private brass(at: number, note: number, stepS: number): void {
    const len = stepS * M.brass.length;
    const g = this.envelope(at, len, M.brass.volume, 0.04);
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    const [lo, hi] = M.brass.cutoff;
    f.frequency.setValueAtTime(lo, at);
    f.frequency.linearRampToValueAtTime(hi, at + 0.08);
    f.frequency.setTargetAtTime(lo * 1.4, at + 0.1, len / 3);
    f.connect(g);
    for (const cents of [-6, 6]) this.osc('sawtooth', noteHz(note), at, len, f, cents);
  }

  /** A timpano: a low sine falling in pitch. */
  private timpani(at: number, level: number): void {
    const [from, to] = M.timpani.freq;
    const len = M.timpani.seconds;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.setValueAtTime(from, at);
    osc.frequency.exponentialRampToValueAtTime(to, at + 0.15);
    g.gain.setValueAtTime(M.timpani.volume * level, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + len);
    osc.connect(g).connect(this.out);
    osc.start(at);
    osc.stop(at + len + 0.02);
  }

  /** A high string held the whole bar, trembling. */
  private high(at: number, note: number, len: number): void {
    const g = this.envelope(at, len, M.high.volume, 0.3);
    const trem = this.ctx.createGain();
    trem.gain.value = 0.6;
    trem.connect(g);
    const lfo = this.ctx.createOscillator();
    const depth = this.ctx.createGain();
    lfo.frequency.value = M.high.tremoloHz;
    depth.gain.value = 0.4;
    lfo.connect(depth).connect(trem.gain);
    lfo.start(at);
    lfo.stop(at + len + 0.05);
    for (const cents of [-5, 5]) this.osc('sawtooth', noteHz(note), at, len, trem, cents);
  }

  /** A gain into the music that rises in `attack`, holds and closes at `at + len`. */
  private envelope(at: number, len: number, vol: number, attack: number): GainNode {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + attack);
    g.gain.setValueAtTime(vol, at + Math.max(attack, len * 0.7));
    g.gain.linearRampToValueAtTime(0, at + len);
    g.connect(this.out);
    return g;
  }

  private osc(type: OscillatorType, hz: number, at: number, len: number, to: AudioNode, cents = 0): void {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = hz;
    o.detune.value = cents;
    o.connect(to);
    o.start(at);
    o.stop(at + len + 0.02);
  }
}
